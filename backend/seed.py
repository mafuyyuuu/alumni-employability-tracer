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

    # ── Companies ──────────────────────────────────────────────────────
    companies = [
        ('Facebook / Meta', 'Technology', 'Pasay', 'Large', 'Global social media company', 'Active'),
        ('Jollibee Foods', 'F&B', 'Pasig City', 'Large', 'Leading fast food chain', 'Active'),
        ('SM Retail', 'Retail', 'Pasig City', 'Large', 'Major retail conglomerate', 'Active'),
        ('BDO Unibank', 'Banking', 'Makati', 'Large', 'Largest bank in the Philippines', 'Active'),
        ('Accenture PH', 'IT Services', 'BGC', 'Large', 'Global consulting and IT services', 'Active'),
        ('PLDT', 'Telecom', 'Makati', 'Large', 'Major telecommunications company', 'Inactive'),
        ('Philippine General Hospital', 'Healthcare', 'Manila', 'Large', 'National tertiary government hospital', 'Active'),
    ]

    c.execute("SELECT COUNT(*) FROM companies")
    if c.fetchone()[0] == 0:
        c.executemany("""
            INSERT INTO companies (name, industry, location, size, description, status)
            VALUES (?,?,?,?,?,?)
        """, companies)

    # ── Jobs (with category for program-based matching) ───────────────
    jobs = [
        ('UI/UX Designer', 1, 'Facebook / Meta', 'Full-time', 'Pasay', '₱25,000–₱40,000/mo',
         'Design user interfaces and create wireframes, prototypes, and high-fidelity mockups for web and mobile products. Conduct user research and usability testing. Collaborate closely with developers to bring designs to life.',
         'IT & Software', 'Open'),
        ('Web Developer', 1, 'Facebook / Meta', 'Part-time', 'Pasig City', '₱18,000–₱30,000/mo',
         'Build and maintain responsive web applications using HTML, CSS, JavaScript, and React. Integrate REST APIs and ensure cross-browser compatibility. Experience with version control (Git) required.',
         'IT & Software', 'Open'),
        ('Data Analyst', 2, 'Jollibee Foods', 'Full-time', 'Quezon City', '₱20,000–₱35,000/mo',
         'Analyze sales data, customer behavior, and operational metrics to support business decisions. Create dashboards using Excel and Tableau. Prepare weekly and monthly reports for management. SQL proficiency required.',
         'IT & Software', 'Open'),
        ('IT Support', 3, 'SM Retail', 'Contract', 'Pasig City', '₱15,000–₱20,000/mo',
         'Provide Level 1 and Level 2 technical support to retail staff. Troubleshoot hardware, software, and network issues. Manage helpdesk tickets and escalate complex issues. Willing to work on shifting schedules.',
         'IT & Networks', 'Open'),
        ('Software Engineer', 5, 'Accenture PH', 'Full-time', 'BGC', '₱40,000–₱60,000/mo',
         'Develop and maintain enterprise software solutions for international clients. Work with Java, Spring Boot, and React in an Agile environment. Participate in code reviews and contribute to architecture decisions.',
         'IT & Software', 'Closed'),
        ('Marketing Coordinator', 2, 'Jollibee Foods', 'Full-time', 'Ortigas', '₱22,000–₱32,000/mo',
         'Support marketing campaigns for our iconic Filipino food brands. Create social media content, coordinate with agencies, and track campaign performance. Knowledge of digital marketing tools and analytics required.',
         'Business & Management', 'Open'),
        ('Accountant', 4, 'BDO Unibank', 'Full-time', 'BGC, Taguig', '₱25,000–₱40,000/mo',
         'Handle general accounting duties including journal entries, bank reconciliation, and financial statement preparation. Ensure compliance with PFRS and BIR requirements. CPA board passers preferred.',
         'Finance & Accounting', 'Open'),
        ('Company Nurse', 7, 'Philippine General Hospital', 'Full-time', 'Manila', '₱25,000–₱38,000/mo',
         'Provide healthcare services to hospital staff and patients. Conduct health assessments, administer first aid, manage medical records, and coordinate with occupational health programs. PRC-licensed RN required.',
         'Healthcare & Nursing', 'Open'),
        ('Hotel Operations Trainee', 3, 'SM Retail', 'Full-time', 'Pasay', '₱18,000–₱25,000/mo',
         'Join our management trainee program covering front desk operations, housekeeping, and food and beverage service. Ideal for BSHM graduates seeking to build a hotel career. Willing to rotate across departments.',
         'Hospitality & Tourism', 'Open'),
        ('HR Assistant', 2, 'Jollibee Foods', 'Full-time', 'Ortigas', '₱20,000–₱28,000/mo',
         'Support HR operations including recruitment, onboarding, payroll coordination, and employee records management. Knowledge of Philippine labor law and HRIS is an advantage. Detail-oriented with strong interpersonal skills.',
         'Business & Management', 'Open'),
    ]

    c.execute("SELECT COUNT(*) FROM jobs")
    if c.fetchone()[0] == 0:
        c.executemany("""
            INSERT INTO jobs (title, company_id, company_name, type, location, salary, description, category, status)
            VALUES (?,?,?,?,?,?,?,?,?)
        """, jobs)


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
