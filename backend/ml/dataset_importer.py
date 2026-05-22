import csv
import os
import sqlite3
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Optional

# graduation_year can be omitted when year_override is passed to import_training_csv
REQUIRED_COLUMNS = [
    'course',
    'GWA',
    'capstone_grade',
    'soft_skills_avg',
    'hard_skills_avg',
    'employment_status',
]

# Maps alternate column names (lowercase) → canonical name
COLUMN_ALIASES = {
    # name
    'name':                     'name',
    'full_name':                'name',
    'alumni_name':              'name',
    # email
    'email':                    'email',
    'email_address':            'email',
    # course / program
    'program':                  'course',
    # graduation year
    'jr_grad':                  'graduation_year',
    'grad_year':                'graduation_year',
    'year_graduated':           'graduation_year',
    'graduation year':          'graduation_year',
    # GWA / GPA
    'cgpa':                     'GWA',
    'gpa':                      'GWA',
    'general_weighted_average': 'GWA',
    'general_average':          'GWA',
    'gwa':                      'GWA',
    # capstone / professional grade
    'prof_grade':               'capstone_grade',
    'avg_prof_grade':           'capstone_grade',
    'professional_grade':       'capstone_grade',
    'thesis_grade':             'capstone_grade',
    'capstone':                 'capstone_grade',
    # soft skills
    'soft_skills':              'soft_skills_avg',
    'soft_skill':               'soft_skills_avg',
    'softskills':               'soft_skills_avg',
    # hard skills
    'hard_skills':              'hard_skills_avg',
    'hard_skill':               'hard_skills_avg',
    'hardskills':               'hard_skills_avg',
    # employment status
    'employed':                 'employment_status',
    'employment':               'employment_status',
    'employedstatus':           'employment_status',
    'is_employed':              'employment_status',
    'status':                   'employment_status',
}

# Course normalisation — maps non-standard names to canonical codes
COURSE_ALIASES = {
    'BS ENTREP':         'BSENTREP',
    'BS ENTREPRENEUR':   'BSENTREP',
    'BSENTREP':          'BSENTREP',
    'BSED MATH':         'BSED',
    'BSED ENGLISH':      'BSED',
    'BSED FILIPINO':     'BSED',
    'BSED SCIENCE':      'BSED',
    'BSED MAPEH':        'BSED',
    'AB PSYCH':          'PSYCHOLOGY',
    'AB PSYCHOLOGY':     'PSYCHOLOGY',
    'ABPSYCH':           'PSYCHOLOGY',
    'BS PSYCHOLOGY':     'PSYCHOLOGY',
}


def _normalize_columns(reader_fieldnames):
    """Return a mapping old_name→canonical_name for any aliased headers."""
    mapping = {}
    for col in (reader_fieldnames or []):
        alias = col.strip().lower().replace(' ', '_')
        if alias in COLUMN_ALIASES:
            mapping[col] = COLUMN_ALIASES[alias]
    return mapping


def _apply_column_mapping(row, mapping):
    """Rename keys in a CSV row dict according to mapping."""
    if not mapping:
        return row
    result = {}
    for k, v in row.items():
        result[mapping.get(k, k)] = v
    return result


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
    if not text:
        return 'UNKNOWN'
    return COURSE_ALIASES.get(text, text)


def _skills_to_percent(value):
    """Convert a skills score to 0-100 scale.
    Accepts GWA 1.0-5.0 scale (converts via _gwa_to_grade) or
    a direct 0-100 percentage. Zero means 'not set'."""
    v = _to_float(value, 0.0)
    if v == 0.0:
        return 0.0
    if 1.0 <= v <= 5.0:
        return _gwa_to_grade(v)
    return _clamp(v, 0.0, 100.0)


def _find_skill_columns(row_keys):
    """Dynamically find all skill columns — any key ending with 'skill' or 'skills'
    (case-insensitive, handles both 'Teaching_skill' and 'Teaching Skills')."""
    result = []
    for key in row_keys:
        k = key.strip().lower().rstrip('s')  # strip trailing 's' → 'skill'
        if k.endswith('skill'):
            result.append(key)
    return result


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
    skill_keys = _find_skill_columns(list(row.keys()))
    values = []
    for key in skill_keys:
        raw = str(row.get(key) or '').strip()
        if raw in ('', 'nan', 'NaN', 'None'):
            continue
        v = _to_float(raw, None)
        if v is not None:
            values.append(_skills_to_percent(v))
    if values:
        return _clamp(sum(values) / len(values), 50.0, 100.0)
    return _clamp((soft_skills + hard_skills) / 2.0, 50.0, 100.0)


def _derive_ojt_grade(prof_grade, internship_experience, internship_duration_months):
    score = _to_float(prof_grade, 75.0)
    if internship_experience >= 1:
        score += 4.0
    score += _clamp(internship_duration_months, 0.0, 6.0) * 1.2
    return _clamp(score, 55.0, 100.0)


def _map_row(row, source_row_id, current_year, year_override=None):
    course = _normalize_course(row.get('course'))
    name = str(row.get('name') or row.get('Name') or '').strip()
    email = str(row.get('email') or row.get('Email') or '').strip()

    # graduation_year: use column value if present, else fall back to year_override
    raw_year = row.get('graduation_year') or row.get('jr_grad') or ''
    graduation_year = _to_int(raw_year, 0)
    if graduation_year <= 0 and year_override:
        graduation_year = int(year_override)
    if graduation_year <= 0:
        return None, f"row {source_row_id}: missing graduation_year (provide dataset_year when uploading)"

    employed = _parse_employed(row.get('employment_status'))
    if employed is None:
        return None, f"row {source_row_id}: invalid employment_status"

    avg_grade     = _gwa_to_grade(row.get('GWA'))
    avg_prof_grade = _gwa_to_grade(row.get('capstone_grade'))
    # Auto-detect GWA vs percentage scale for skills
    soft_skills   = _skills_to_percent(row.get('soft_skills_avg', 0))
    hard_skills   = _skills_to_percent(row.get('hard_skills_avg', 0))
    avg_elec_grade = _derive_elective_grade(row, soft_skills, hard_skills)
    internship_experience  = _to_int(row.get('internship_experience'), 0)
    internship_duration    = _to_float(row.get('internship_duration_months'), 0.0)
    ojt_grade = _derive_ojt_grade(avg_prof_grade, internship_experience, internship_duration)
    age = _derive_age(graduation_year, current_year)

    return {
        'source_row_id': str(source_row_id),
        'name': name,
        'email': email,
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
    _validate_required_columns_list(columns, REQUIRED_COLUMNS)


def _validate_required_columns_list(columns, required):
    missing = [col for col in required if col not in columns]
    if missing:
        raise ValueError(f"Dataset is missing required columns: {', '.join(missing)}")


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
    database_path: Optional[str] = None,
    csv_path: Optional[str] = None,
    source_name: Optional[str] = None,
    year_override: Optional[int] = None,
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

    ext = dataset_path.suffix.lower()
    if ext in ('.xlsx', '.xls'):
        try:
            import pandas as pd
            df = pd.read_excel(dataset_path)
            raw_columns = list(df.columns)
            col_mapping = _normalize_columns(raw_columns)
            records = []
            for _, row_series in df.iterrows():
                row_dict = {col_mapping.get(c, c): ('' if str(v) in ('nan', 'NaT') else str(v) if not isinstance(v, str) else v)
                            for c, v in row_series.items()}
                records.append(row_dict)
            normalized_columns = [col_mapping.get(c, c) for c in raw_columns]
        except ImportError:
            raise ValueError("pandas/openpyxl required to import Excel files. Run: pip install openpyxl")
    else:
        with dataset_path.open('r', encoding='utf-8-sig', newline='') as f:
            reader = csv.DictReader(f)
            raw_columns = reader.fieldnames or []
            col_mapping = _normalize_columns(raw_columns)
            normalized_columns = [col_mapping.get(c, c) for c in raw_columns]
            records = [_apply_column_mapping(row, col_mapping) for row in reader]

    # graduation_year is optional when year_override is supplied
    required = [c for c in REQUIRED_COLUMNS if not (c == 'graduation_year' and year_override)]
    _validate_required_columns_list(normalized_columns, required)

    conn = sqlite3.connect(db_path)
    try:
        _ensure_ml_training_table(conn)
        conn.execute("UPDATE ml_training_rows SET is_active = 0 WHERE source_name = ?", [source])
        for line_num, row in enumerate(records, start=2):
            total_rows += 1
            source_row_id = (row.get('alumni_id') or '').strip() or str(line_num)
            mapped, reason = _map_row(row, source_row_id, current_year, year_override=year_override)
            if not mapped:
                skipped_rows += 1
                skip_reasons[reason] += 1
                continue

            conn.execute("""
                INSERT INTO ml_training_rows (
                    source_name,
                    source_row_id,
                    name,
                    email,
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
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
                ON CONFLICT(source_name, source_row_id) DO UPDATE SET
                    name = excluded.name,
                    email = excluded.email,
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
                mapped['name'],
                mapped['email'],
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
    database_path: Optional[str] = None,
    csv_path: Optional[str] = None,
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
