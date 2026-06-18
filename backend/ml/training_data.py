import os
import sqlite3
from typing import Tuple, Optional

import pandas as pd

NUMERIC_FEATURES = [
    'avg_grade',
    'avg_prof_grade',
    'avg_elec_grade',
    'ojt_grade',
    'soft_skills',
    'hard_skills',
    'board_passer',
    'board_exam_score',
]
COURSE_FEATURE = 'course'
TARGET_FEATURE = 'employed'
DEFAULT_MIN_ROWS = 10


def _table_exists(conn: sqlite3.Connection, table_name: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        [table_name],
    ).fetchone()
    return row is not None


def load_training_dataframe(database_path: Optional[str] = None) -> pd.DataFrame:
    """Load employability training rows from live DB records."""
    db_path = database_path or os.getenv('DATABASE', 'plp_alumni.db')
    conn = sqlite3.connect(db_path)
    try:
        users_query = """
        SELECT
            u.id AS user_id,
            UPPER(TRIM(COALESCE(u.course, 'UNKNOWN'))) AS course,
            u.graduation_year,
            u.avg_grade,
            u.avg_prof_grade,
            u.avg_elec_grade,
            u.ojt_grade,
            u.soft_skills,
            u.hard_skills,
            u.board_passer,
            u.board_exam_score,
            CASE
                WHEN lf.employment_status IN ('hired', 'elsewhere') THEN 1
                WHEN lf.employment_status = 'looking' THEN 0
                ELSE COALESCE(u.employed, 0)
            END AS employed
        FROM users u
        LEFT JOIN feedbacks lf
        ON lf.id = (
            SELECT f2.id
            FROM feedbacks f2
            WHERE f2.user_id = u.id
            ORDER BY f2.submitted_at DESC, f2.id DESC
            LIMIT 1
        )
        WHERE u.role = 'alumni'
        """
        users_df = pd.read_sql_query(users_query, conn)

        imported_df = pd.DataFrame()
        if _table_exists(conn, 'ml_training_rows'):
            imported_query = """
            SELECT
                NULL AS user_id,
                UPPER(TRIM(COALESCE(m.course, 'UNKNOWN'))) AS course,
                m.graduation_year,
                m.avg_grade,
                m.avg_prof_grade,
                m.avg_elec_grade,
                m.ojt_grade,
                m.soft_skills,
                m.hard_skills,
                m.board_passer,
                m.board_exam_score,
                COALESCE(m.employed, 0) AS employed
            FROM ml_training_rows m
            WHERE m.is_active = 1
            """
            imported_df = pd.read_sql_query(imported_query, conn)
    except sqlite3.OperationalError as exc:
        raise ValueError(
            "Training data source is unavailable. Initialize and seed the database first."
        ) from exc
    finally:
        conn.close()

    frames = [df for df in (users_df, imported_df) if not df.empty]
    if frames:
        df = pd.concat(frames, ignore_index=True)
    else:
        df = pd.DataFrame(columns=[
            'user_id',
            'course',
            'graduation_year',
            'avg_grade',
            'avg_prof_grade',
            'avg_elec_grade',
            'ojt_grade',
            'soft_skills',
            'hard_skills',
            'board_passer',
            'board_exam_score',
            'employed',
        ])

    if df.empty:
        return df

    for col in NUMERIC_FEATURES:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    df[COURSE_FEATURE] = (
        df[COURSE_FEATURE]
        .fillna('UNKNOWN')
        .astype(str)
        .str.strip()
        .str.upper()
        .replace('', 'UNKNOWN')
    )
    df[TARGET_FEATURE] = pd.to_numeric(df[TARGET_FEATURE], errors='coerce').fillna(0).astype(int)
    return df


def validate_training_dataframe(df: pd.DataFrame, min_rows: int = DEFAULT_MIN_ROWS) -> None:
    row_count = len(df)
    if row_count < min_rows:
        raise ValueError(
            f"Not enough labeled alumni rows for training ({row_count}). Need at least {min_rows}."
        )

    if TARGET_FEATURE not in df.columns:
        raise ValueError(f"Missing required training target column: {TARGET_FEATURE}.")

    if df[TARGET_FEATURE].nunique() < 2:
        raise ValueError("Training requires both employed and unemployed labels.")


def build_feature_matrix(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series, dict]:
    """Build model-ready features and defaults from DB-sourced records."""
    if df.empty:
        raise ValueError("No rows available to build training features.")

    work = df.copy()
    for col in NUMERIC_FEATURES:
        median = work[col].median()
        if pd.isna(median):
            median = 0.0
        work[col] = work[col].fillna(median)

    work[COURSE_FEATURE] = (
        work[COURSE_FEATURE]
        .fillna('UNKNOWN')
        .astype(str)
        .str.strip()
        .str.upper()
        .replace('', 'UNKNOWN')
    )

    defaults = {col: float(work[col].median()) for col in NUMERIC_FEATURES}
    mode_series = work[COURSE_FEATURE].mode()
    defaults[COURSE_FEATURE] = (
        str(mode_series.iloc[0]).upper()
        if not mode_series.empty
        else 'UNKNOWN'
    )

    # ── Engineered features (improve accuracy without extra data) ──────────
    # Weighted grade composite — captures overall academic strength
    work['grade_composite'] = (
        work['avg_grade'] * 0.40 +
        work['avg_prof_grade'] * 0.35 +
        work['avg_elec_grade'] * 0.25
    )
    # Skills index — combined soft + hard skills signal
    work['skills_index'] = (work['soft_skills'] + work['hard_skills']) / 2.0
    # Board bonus — interaction: only meaningful when board_passer=1
    work['board_bonus'] = work['board_passer'] * (work['board_exam_score'] / 100.0)
    # Grade × skills interaction — strong academic + strong skills = highest signal
    work['grade_x_skills'] = work['grade_composite'] * work['skills_index'] / 100.0

    ENGINEERED = ['grade_composite', 'skills_index', 'board_bonus', 'grade_x_skills']
    for col in ENGINEERED:
        defaults[col] = float(work[col].median())

    all_features = NUMERIC_FEATURES + ENGINEERED + [COURSE_FEATURE]
    X = pd.get_dummies(
        work[all_features],
        columns=[COURSE_FEATURE],
        drop_first=False,
    )
    X = X.sort_index(axis=1)
    y = work[TARGET_FEATURE].astype(int)
    return X, y, defaults
