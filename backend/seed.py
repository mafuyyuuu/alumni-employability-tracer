"""Seed the database with initial data."""
import sqlite3
import bcrypt
import os

DATABASE = os.getenv('DATABASE', 'plp_alumni.db')


def hash_pw(password):
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def seed():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # ── Admin account only — alumni come from uploaded datasets ──────────
    c.execute("SELECT id FROM users WHERE email = 'admin@plp.edu.ph'")
    if not c.fetchone():
        c.execute("""
            INSERT INTO users (first_name, middle_name, last_name, email, password_hash,
                role, course, graduation_year, age, employed, account_status,
                avg_grade, avg_prof_grade, avg_elec_grade, ojt_grade, soft_skills, hard_skills,
                months_to_employment)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, ('Admin', '', 'PLP', 'admin@plp.edu.ph', hash_pw('admin123'), 'admin',
              '', 2020, 30, 1, 'Active', 0, 0, 0, 0, 0, 0, None))

    # ── Accenture PH (needed for company login account) ──────────────
    c.execute("SELECT id FROM companies WHERE name = 'Accenture PH'")
    if not c.fetchone():
        c.execute("""
            INSERT INTO companies (name, industry, location, size, description, status)
            VALUES (?,?,?,?,?,?)
        """, ('Accenture PH', 'IT Services', 'BGC', 'Large', 'Global consulting and IT services', 'Active'))


    # ── Voter config ──────────────────────────────────────────────────
    voter_fields = [
        ('gpa', 'GPA / Average Grade', 1, 25),
        ('prof_grade', 'Professional Grade', 1, 20),
        ('elec_grade', 'Elective Grade', 1, 15),
        ('ojt_grade', 'OJT Grade', 1, 15),
        ('soft_skills', 'Soft Skills Average', 1, 10),
        ('hard_skills', 'Hard Skills Average', 1, 10),
        ('age', 'Age', 0, 5),
        ('gender', 'Gender', 0, 0),
    ]

    c.execute("SELECT COUNT(*) FROM voter_config")
    if c.fetchone()[0] == 0:
        c.executemany("""
            INSERT INTO voter_config (field_key, field_name, enabled, weight) VALUES (?,?,?,?)
        """, voter_fields)

    # ── Prediction settings ─────────────────────────────────────────────
    c.execute("SELECT COUNT(*) FROM prediction_settings")
    if c.fetchone()[0] == 0:
        c.execute("""
            INSERT INTO prediction_settings (id, use_voter_weights) VALUES (1, 0)
        """)



    # ── Voter config: add board_passer if missing ─────────────────────
    c.execute("SELECT id FROM voter_config WHERE field_key = 'board_passer'")
    if not c.fetchone():
        c.execute("""
            INSERT INTO voter_config (field_key, field_name, enabled, weight)
            VALUES ('board_passer', 'Board/Licensure Passer', 1, 10)
        """)

    # ── Company accounts ──────────────────────────────────────────────
    c.execute("SELECT id FROM companies WHERE name = 'Accenture PH'")
    accenture = c.fetchone()
    company_id = accenture[0] if accenture else None

    c.execute("SELECT id FROM users WHERE email = 'company@accenture.ph'")
    if not c.fetchone():
        c.execute("""
            INSERT INTO users (first_name, last_name, email, password_hash,
                role, account_status, company_id)
            VALUES (?,?,?,?,'company','Active',?)
        """, ['Recruiter', 'Accenture', 'company@accenture.ph',
              hash_pw('company123'), company_id])

    # ── Programs (initial seed) ────────────────────────────────────────
    default_programs = [
        ('Bachelor of Science in Computer Science', 'BSCS', 0, '', ''),
        ('Bachelor of Science in Information Technology', 'BSIT', 0, '', ''),
        ('Bachelor of Science in Computer Engineering', 'BSCPE', 1, 'Electronics Engineering Licensure Exam', 'Combines hardware and software engineering.'),
        ('Bachelor of Science in Electronics Engineering', 'BSECE', 1, 'Electronics Engineering Licensure Exam', ''),
        ('Bachelor of Science in Civil Engineering', 'BSCE', 1, 'Civil Engineering Licensure Exam', ''),
        ('Bachelor of Science in Nursing', 'BSN', 1, 'Nurse Licensure Examination', ''),
        ('Bachelor of Secondary Education', 'BSEd', 1, 'Licensure Examination for Teachers', ''),
        ('Bachelor of Elementary Education', 'BEEd', 1, 'Licensure Examination for Teachers', ''),
        ('Bachelor of Science in Accountancy', 'BSA', 1, 'CPA Licensure Examination', ''),
        ('Bachelor of Science in Business Administration', 'BSBA', 0, '', ''),
        ('Bachelor of Science in Hotel and Restaurant Management', 'BSHM', 0, '', ''),
    ]

    for prog in default_programs:
        c.execute("SELECT id FROM programs WHERE name = ?", [prog[0]])
        if not c.fetchone():
            c.execute("""
                INSERT INTO programs (name, code, has_board_exam, board_exam_name, description, status)
                VALUES (?,?,?,?,?,'Active')
            """, prog)

    # ── NCAE Questions (self-rating format) ──────────────────────────
    # Detect old multiple-choice format by checking if option_a has real content
    c.execute("SELECT COUNT(*) FROM ncae_questions WHERE length(option_a) > 3")
    old_format_count = c.fetchone()[0]
    if old_format_count > 0:
        # Old MCQ format found — wipe and re-seed with new self-rating format
        c.execute("DELETE FROM ncae_questions")
        c.execute("DELETE FROM ncae_results")
        print("Cleared old MCQ format NCAE questions. Re-seeding with self-rating format.")

    c.execute("SELECT COUNT(*) FROM ncae_questions")
    if c.fetchone()[0] == 0:
        try:
            from ncae_data import ALL_QUESTIONS
            for program, questions in ALL_QUESTIONS.items():
                for q in questions:
                    c.execute("""
                        INSERT OR IGNORE INTO ncae_questions
                        (program, question_num, question, option_a, option_b, option_c, option_d, correct_answer, category)
                        VALUES (?,?,?,?,?,?,?,?,?)
                    """, [program, q['num'], q['statement'], '', '', '', '', '', q['category']])
            print("NCAE self-rating questions seeded.")
        except Exception as e:
            print(f"NCAE seed skipped: {e}")

    # ── Test alumni accounts ──────────────────────────────────────────────
    test_alumni = [
        ('Juan', 'Dela Cruz', 'BSCS', 'juan.delacruz@plp.edu.ph', 2023, 23),
        ('Maria', 'Santos', 'BSIT', 'maria.santos@plp.edu.ph', 2023, 22),
        ('Pedro', 'Reyes', 'BSA', 'pedro.reyes@plp.edu.ph', 2022, 24),
        ('Ana', 'Garcia', 'BSN', 'ana.garcia@plp.edu.ph', 2023, 22),
        ('Jose', 'Mendoza', 'BSBA', 'jose.mendoza@plp.edu.ph', 2022, 25),
    ]
    for first, last, course, email, yr, age in test_alumni:
        c.execute("SELECT id FROM users WHERE email = ?", [email])
        if not c.fetchone():
            c.execute("""
                INSERT INTO users (first_name, last_name, course, email, password_hash,
                    role, account_status, graduation_year, age, employed, ncae_completed,
                    soft_skills, hard_skills, avg_grade, board_passer)
                VALUES (?,?,?,?,?,'alumni','Active',?,?,1,1,75,75,85,0)
            """, (first, last, course, email, hash_pw('pass123'), yr, age))

    # ── Fill pending skills from ml_training_rows averages ───────────────
    # For alumni who haven't completed NCAE and have no skills data,
    # fill soft_skills and hard_skills using program/year averages from training data.
    c.execute("""
        SELECT u.id, u.course, u.graduation_year
        FROM users u
        WHERE u.role = 'alumni'
          AND (u.ncae_completed = 0 OR u.ncae_completed IS NULL)
          AND (u.soft_skills = 0 OR u.soft_skills IS NULL)
          AND (u.hard_skills = 0 OR u.hard_skills IS NULL)
    """)
    pending_users = c.fetchall()

    filled = 0
    for pu in pending_users:
        uid, course, grad_year = pu[0], pu[1], pu[2]
        # Try exact match first (same course + year), then just course
        c.execute("""
            SELECT AVG(soft_skills) AS avg_soft, AVG(hard_skills) AS avg_hard
            FROM ml_training_rows
            WHERE is_active = 1 AND course = ? AND graduation_year = ?
        """, [course, grad_year])
        row = c.fetchone()
        avg_soft = row[0]
        avg_hard = row[1]

        if avg_soft is None:
            # Fall back to course-wide average
            c.execute("""
                SELECT AVG(soft_skills) AS avg_soft, AVG(hard_skills) AS avg_hard
                FROM ml_training_rows WHERE is_active = 1 AND course = ?
            """, [course])
            row = c.fetchone()
            avg_soft = row[0]
            avg_hard = row[1]

        if avg_soft is not None and avg_hard is not None:
            c.execute("""
                UPDATE users SET soft_skills = ?, hard_skills = ? WHERE id = ?
            """, [round(float(avg_soft), 2), round(float(avg_hard), 2), uid])
            filled += 1

    if filled > 0:
        print(f"Filled skills data for {filled} pending alumni from dataset averages.")

    conn.commit()
    conn.close()
    print("Database seeded successfully.")


if __name__ == '__main__':
    from database import init_db
    init_db()
    seed()
