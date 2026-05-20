import sqlite3
import os
from flask import g

DATABASE = os.getenv('DATABASE', 'plp_alumni.db')

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    middle_name TEXT DEFAULT '',
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'alumni',
    course TEXT DEFAULT '',
    graduation_year INTEGER DEFAULT 2023,
    age INTEGER DEFAULT 22,
    employed INTEGER DEFAULT 0,
    account_status TEXT DEFAULT 'Active',
    avg_grade REAL DEFAULT 0,
    avg_prof_grade REAL DEFAULT 0,
    avg_elec_grade REAL DEFAULT 0,
    ojt_grade REAL DEFAULT 0,
    soft_skills REAL DEFAULT 0,
    hard_skills REAL DEFAULT 0,
    board_passer INTEGER DEFAULT 0,
    board_exam_score REAL DEFAULT 0,
    company_id INTEGER DEFAULT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    industry TEXT DEFAULT '',
    location TEXT DEFAULT '',
    size TEXT DEFAULT '',
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'Active',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    company_id INTEGER,
    company_name TEXT NOT NULL,
    type TEXT DEFAULT 'Full-time',
    location TEXT DEFAULT '',
    salary TEXT DEFAULT '',
    description TEXT DEFAULT '',
    category TEXT DEFAULT '',
    status TEXT DEFAULT 'Open',
    posted_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS external_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id TEXT DEFAULT '',
    source TEXT NOT NULL,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT DEFAULT 'Philippines',
    type TEXT DEFAULT 'Full-time',
    salary TEXT DEFAULT '',
    description TEXT DEFAULT '',
    url TEXT DEFAULT '',
    category TEXT DEFAULT '',
    program TEXT DEFAULT '',
    posted_at TEXT DEFAULT '',
    fetched_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS saved_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    job_id INTEGER NOT NULL,
    saved_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, job_id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS feedbacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    employment_status TEXT NOT NULL,
    company TEXT DEFAULT '',
    position TEXT DEFAULT '',
    duration TEXT DEFAULT '',
    work_setup TEXT DEFAULT '',
    employment_type TEXT DEFAULT '',
    submitted_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS employment_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL UNIQUE,
    overall_rate REAL NOT NULL,
    male_rate REAL DEFAULT 0,
    female_rate REAL DEFAULT 0,
    employed_count INTEGER DEFAULT 0,
    unemployed_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS program_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    course TEXT NOT NULL,
    rate REAL NOT NULL,
    UNIQUE(year, course)
);

CREATE TABLE IF NOT EXISTS voter_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    field_key TEXT UNIQUE NOT NULL,
    field_name TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    weight INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS prediction_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    use_voter_weights INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
);

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
    board_passer INTEGER DEFAULT 0,
    board_exam_score REAL DEFAULT 0,
    employed INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1,
    imported_at TEXT DEFAULT (datetime('now')),
    UNIQUE(source_name, source_row_id)
);

CREATE TABLE IF NOT EXISTS programs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    code TEXT DEFAULT '',
    has_board_exam INTEGER DEFAULT 0,
    board_exam_name TEXT DEFAULT '',
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'Active',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ml_training_rows_active
ON ml_training_rows (is_active, source_name);

CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'PDF',
    year_range TEXT DEFAULT '',
    model_name TEXT DEFAULT '',
    status TEXT DEFAULT 'Ready',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS model_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    records INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Active',
    sha256 TEXT DEFAULT '',
    applied_to_training INTEGER DEFAULT 0,
    uploaded_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ncae_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program TEXT NOT NULL,
    question_num INTEGER NOT NULL,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    category TEXT NOT NULL,
    UNIQUE(program, question_num)
);

CREATE TABLE IF NOT EXISTS ncae_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    program TEXT NOT NULL,
    hard_skills_score REAL DEFAULT 0,
    soft_skills_score REAL DEFAULT 0,
    specific_skills_score REAL DEFAULT 0,
    total_score REAL DEFAULT 0,
    answers TEXT DEFAULT '',
    completed_at TEXT DEFAULT (datetime('now'))
);
"""


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DATABASE, detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(e=None):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db():
    conn = sqlite3.connect(DATABASE)
    conn.executescript(SCHEMA)
    # Migrations for existing DBs
    migrations = [
        "ALTER TABLE jobs ADD COLUMN category TEXT DEFAULT ''",
        "ALTER TABLE model_uploads ADD COLUMN sha256 TEXT DEFAULT ''",
        "ALTER TABLE model_uploads ADD COLUMN applied_to_training INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN board_passer INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN board_exam_score REAL DEFAULT 0",
        "ALTER TABLE users ADD COLUMN company_id INTEGER DEFAULT NULL",
        "ALTER TABLE ml_training_rows ADD COLUMN board_passer INTEGER DEFAULT 0",
        "ALTER TABLE ml_training_rows ADD COLUMN board_exam_score REAL DEFAULT 0",
        "ALTER TABLE users ADD COLUMN ncae_completed INTEGER DEFAULT 0",
    ]
    for m in migrations:
        try:
            conn.execute(m)
        except Exception:
            pass  # Column already exists
    conn.commit()
    conn.close()
