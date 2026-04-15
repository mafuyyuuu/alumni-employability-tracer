import csv
import os
import sqlite3
from collections import Counter
from datetime import datetime
from pathlib import Path


REQUIRED_COLUMNS = [
    'course',
    'graduation_year',
    'GWA',
    'capstone_grade',
    'soft_skills_avg',
    'hard_skills_avg',
    'employment_status',
]

SKILL_COLUMNS = [
    'Teaching_skill',
    'Math_skill',
    'HTML_skill',
    'JavaScript_skill',
    'PHP_skill',
    'MySQL_skill',
    'AutoCAD_skill',
    'EngineeringDesign_skill',
    'Communication_skill',
    'Python_skill',
    'MachineLearning_skill',
    'Taxation_skill',
    'Construction_skill',
    'DataAnalysis_skill',
    'Excel_skill',
    'Accounting_skill',
    'Auditing_skill',
    'SQL_skill',
    'Database_skill',
    'Marketing_skill',
    'Sales_skill',
    'Java_skill',
    'Algorithms_skill',
    'SystemsAnalysis_skill',
    'Networking_skill',
    'Cybersecurity_skill',
    'Finance_skill',
]


def _to_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def _to_int(value, default=0):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return int(default)


def _clamp(value, lo, hi):
    return max(lo, min(hi, value))


def _normalize_course(value):
    text = str(value or '').strip().upper()
    return text if text else 'UNKNOWN'


def _parse_employed(value):
    text = str(value or '').strip().lower()
    if text in ('1', 'true', 'yes', 'employed', 'hired', 'elsewhere'):
        return 1
    if text in ('0', 'false', 'no', 'unemployed', 'looking'):
        return 0
    try:
        numeric = int(float(text))
        if numeric in (0, 1):
            return numeric
    except (TypeError, ValueError):
        pass
    return None


def _gwa_to_grade(value):
    # Approximate conversion from 1.0-5.0 GWA scale to 0-100 grade scale.
    gwa = _clamp(_to_float(value, 2.5), 1.0, 5.0)
    grade = 110.0 - (13.333 * gwa)
    return _clamp(grade, 55.0, 100.0)


def _derive_age(graduation_year, current_year):
    years_since_grad = max(0, current_year - graduation_year)
    return int(_clamp(22 + years_since_grad, 20, 45))


def _derive_elective_grade(row, soft_skills, hard_skills):
    values = []
    for key in SKILL_COLUMNS:
        raw = (row.get(key) or '').strip()
        if raw == '':
            continue
        values.append(_to_float(raw))
    if values:
        return _clamp(sum(values) / len(values), 50.0, 100.0)
    return _clamp((soft_skills + hard_skills) / 2.0, 50.0, 100.0)


def _derive_ojt_grade(prof_grade, internship_experience, internship_duration_months):
    score = _to_float(prof_grade, 75.0)
    if internship_experience >= 1:
        score += 4.0
    score += _clamp(internship_duration_months, 0.0, 6.0) * 1.2
    return _clamp(score, 55.0, 100.0)


def _map_row(row, source_row_id, current_year):
    course = _normalize_course(row.get('course'))
    graduation_year = _to_int(row.get('graduation_year'), 0)
    if graduation_year <= 0:
        return None, f"row {source_row_id}: invalid graduation_year"

    employed = _parse_employed(row.get('employment_status'))
    if employed is None:
        return None, f"row {source_row_id}: invalid employment_status"

    avg_grade = _gwa_to_grade(row.get('GWA'))
    avg_prof_grade = _gwa_to_grade(row.get('capstone_grade'))
    soft_skills = _clamp(_to_float(row.get('soft_skills_avg'), 0.0), 0.0, 100.0)
    hard_skills = _clamp(_to_float(row.get('hard_skills_avg'), 0.0), 0.0, 100.0)
    avg_elec_grade = _derive_elective_grade(row, soft_skills, hard_skills)
    internship_experience = _to_int(row.get('internship_experience'), 0)
    internship_duration = _to_float(row.get('internship_duration_months'), 0.0)
    ojt_grade = _derive_ojt_grade(avg_prof_grade, internship_experience, internship_duration)
    age = _derive_age(graduation_year, current_year)

    return {
        'source_row_id': str(source_row_id),
        'course': course,
        'graduation_year': int(graduation_year),
        'age': int(age),
        'avg_grade': float(avg_grade),
        'avg_prof_grade': float(avg_prof_grade),
        'avg_elec_grade': float(avg_elec_grade),
        'ojt_grade': float(ojt_grade),
        'soft_skills': float(soft_skills),
        'hard_skills': float(hard_skills),
        'employed': int(employed),
    }, None


def _validate_required_columns(columns):
    missing = [col for col in REQUIRED_COLUMNS if col not in columns]
    if missing:
        missing_str = ', '.join(missing)
        raise ValueError(f"Dataset is missing required columns: {missing_str}")


def _ensure_ml_training_table(conn):
    conn.execute("""
        CREATE TABLE IF NOT EXISTS ml_training_rows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_name TEXT NOT NULL,
            source_row_id TEXT NOT NULL,
            course TEXT NOT NULL,
            graduation_year INTEGER NOT NULL,
            age INTEGER NOT NULL,
            avg_grade REAL NOT NULL,
            avg_prof_grade REAL NOT NULL,
            avg_elec_grade REAL NOT NULL,
            ojt_grade REAL NOT NULL,
            soft_skills REAL NOT NULL,
            hard_skills REAL NOT NULL,
            employed INTEGER NOT NULL,
            is_active INTEGER DEFAULT 1,
            imported_at TEXT DEFAULT (datetime('now')),
            UNIQUE(source_name, source_row_id)
        )
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_ml_training_rows_active
        ON ml_training_rows (is_active, source_name)
    """)


def import_training_csv(
    database_path: str | None = None,
    csv_path: str | None = None,
    source_name: str | None = None,
) -> dict:
    db_path = database_path or os.getenv('DATABASE', 'plp_alumni.db')
    dataset_path = Path(csv_path) if csv_path else Path(__file__).resolve().parent / 'data' / 'first_clean_dataset.csv'
    if not dataset_path.exists():
        raise ValueError(f"Dataset not found: {dataset_path}")

    source = source_name.strip() if source_name else dataset_path.name
    current_year = datetime.utcnow().year
    total_rows = 0
    imported_rows = 0
    skipped_rows = 0
    skip_reasons = Counter()

    with dataset_path.open('r', encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        columns = reader.fieldnames or []
        _validate_required_columns(columns)
        records = list(reader)

    conn = sqlite3.connect(db_path)
    try:
        _ensure_ml_training_table(conn)
        conn.execute("UPDATE ml_training_rows SET is_active = 0 WHERE source_name = ?", [source])
        for line_num, row in enumerate(records, start=2):
            total_rows += 1
            source_row_id = (row.get('alumni_id') or '').strip() or str(line_num)
            mapped, reason = _map_row(row, source_row_id, current_year)
            if not mapped:
                skipped_rows += 1
                skip_reasons[reason] += 1
                continue

            conn.execute("""
                INSERT INTO ml_training_rows (
                    source_name,
                    source_row_id,
                    course,
                    graduation_year,
                    age,
                    avg_grade,
                    avg_prof_grade,
                    avg_elec_grade,
                    ojt_grade,
                    soft_skills,
                    hard_skills,
                    employed,
                    is_active,
                    imported_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
                ON CONFLICT(source_name, source_row_id) DO UPDATE SET
                    course = excluded.course,
                    graduation_year = excluded.graduation_year,
                    age = excluded.age,
                    avg_grade = excluded.avg_grade,
                    avg_prof_grade = excluded.avg_prof_grade,
                    avg_elec_grade = excluded.avg_elec_grade,
                    ojt_grade = excluded.ojt_grade,
                    soft_skills = excluded.soft_skills,
                    hard_skills = excluded.hard_skills,
                    employed = excluded.employed,
                    is_active = 1,
                    imported_at = datetime('now')
            """, [
                source,
                mapped['source_row_id'],
                mapped['course'],
                mapped['graduation_year'],
                mapped['age'],
                mapped['avg_grade'],
                mapped['avg_prof_grade'],
                mapped['avg_elec_grade'],
                mapped['ojt_grade'],
                mapped['soft_skills'],
                mapped['hard_skills'],
                mapped['employed'],
            ])
            imported_rows += 1

        conn.commit()

        source_active_rows = conn.execute(
            "SELECT COUNT(*) FROM ml_training_rows WHERE source_name = ? AND is_active = 1",
            [source],
        ).fetchone()[0]
        total_active_rows = conn.execute(
            "SELECT COUNT(*) FROM ml_training_rows WHERE is_active = 1"
        ).fetchone()[0]
    finally:
        conn.close()

    top_skip_reasons = [
        {'reason': reason, 'count': count}
        for reason, count in skip_reasons.most_common(10)
    ]
    return {
        'source_name': source,
        'dataset_path': str(dataset_path),
        'rows_seen': total_rows,
        'rows_imported': imported_rows,
        'rows_skipped': skipped_rows,
        'source_active_rows': int(source_active_rows),
        'total_active_rows': int(total_active_rows),
        'skip_reasons': top_skip_reasons,
        'leakage_columns_ignored': ['salary', 'employment_delay_months', 'date_employed'],
    }


def import_first_clean_dataset(
    database_path: str | None = None,
    csv_path: str | None = None,
    source_name: str = 'first_clean_dataset.csv',
) -> dict:
    """Backward-compatible wrapper for legacy first_clean_dataset imports."""
    return import_training_csv(
        database_path=database_path,
        csv_path=csv_path,
        source_name=source_name,
    )


if __name__ == '__main__':
    summary = import_training_csv()
    print(summary)
