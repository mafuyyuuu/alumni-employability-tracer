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

    # ── Users (insert per email — safe to re-run) ──────────────────────
    # Columns: first_name, middle_name, last_name, email, password_hash, role,
    #          course, graduation_year, age, employed, account_status,
    #          avg_grade, avg_prof_grade, avg_elec_grade, ojt_grade, soft_skills, hard_skills,
    #          months_to_employment (NULL = unemployed or unknown)
    users = [
        ('Admin', '', 'PLP', 'admin@plp.edu.ph', hash_pw('admin123'), 'admin',
         '', 2020, 30, 1, 'Active', 0, 0, 0, 0, 0, 0, None),
        # BSCS
        ('Juan', 'D.', 'Cruz', 'juan@plp.edu.ph', hash_pw('pass123'), 'alumni',
         'BSCS', 2022, 25, 1, 'Active', 90.0, 88.0, 87.0, 91.0, 80.0, 63.0, 3),
        ('Carlos', '', 'Villanueva', 'carlos@plp.edu.ph', hash_pw('pass123'), 'alumni',
         'BSCS', 2021, 26, 1, 'Active', 92.0, 90.0, 89.0, 93.0, 83.0, 68.0, 4),
        # BSIT
        ('Maria', '', 'Santos', 'maria@plp.edu.ph', hash_pw('pass123'), 'alumni',
         'BSIT', 2023, 23, 1, 'Active', 85.0, 84.0, 82.0, 88.0, 75.0, 70.0, 2),
        ('Ramon', '', 'Dela Cruz', 'ramon@plp.edu.ph', hash_pw('pass123'), 'alumni',
         'BSIT', 2022, 24, 1, 'Active', 83.0, 81.0, 80.0, 85.0, 73.0, 67.0, 5),
        # BSEd
        ('Pedro', '', 'Reyes', 'pedro@plp.edu.ph', hash_pw('pass123'), 'alumni',
         'BSEd', 2021, 26, 0, 'Active', 78.0, 76.0, 77.0, 80.0, 72.0, 55.0, None),
        ('Liza', '', 'Navarro', 'liza@plp.edu.ph', hash_pw('pass123'), 'alumni',
         'BSEd', 2023, 23, 1, 'Active', 82.0, 80.0, 81.0, 84.0, 74.0, 57.0, 8),
        # BSBA
        ('Ana', '', 'Gonzales', 'ana@plp.edu.ph', hash_pw('pass123'), 'alumni',
         'BSBA', 2022, 25, 1, 'Active', 88.0, 85.0, 86.0, 89.0, 78.0, 60.0, 4),
        ('Sofia', '', 'Ramos', 'sofia@plp.edu.ph', hash_pw('pass123'), 'alumni',
         'BSBA', 2023, 23, 1, 'Active', 86.0, 83.0, 84.0, 87.0, 76.0, 58.0, 7),
        # BSA
        ('Jose', '', 'Mendoza', 'jose@plp.edu.ph', hash_pw('pass123'), 'alumni',
         'BSA', 2020, 27, 0, 'Inactive', 72.0, 70.0, 71.0, 75.0, 65.0, 50.0, None),
        ('Cris', '', 'Bautista', 'cris@plp.edu.ph', hash_pw('pass123'), 'alumni',
         'BSA', 2022, 25, 1, 'Active', 84.0, 82.0, 83.0, 86.0, 75.0, 62.0, 6),
        # BSHM
        ('Rosa', '', 'Aquino', 'rosa@plp.edu.ph', hash_pw('pass123'), 'alumni',
         'BSHM', 2023, 23, 1, 'Active', 86.0, 84.0, 85.0, 87.0, 76.0, 62.0, 3),
        ('Marco', '', 'Ferrer', 'marco@plp.edu.ph', hash_pw('pass123'), 'alumni',
         'BSHM', 2022, 24, 0, 'Active', 80.0, 78.0, 79.0, 82.0, 71.0, 58.0, None),
        # BSN (College of Nursing)
        ('Lea', '', 'Morales', 'lea@plp.edu.ph', hash_pw('pass123'), 'alumni',
         'BSN', 2023, 23, 1, 'Active', 88.0, 86.0, 85.0, 89.0, 77.0, 65.0, 2),
        ('Nilo', '', 'Batungbakal', 'nilo@plp.edu.ph', hash_pw('pass123'), 'alumni',
         'BSN', 2022, 24, 0, 'Active', 80.0, 78.0, 79.0, 82.0, 71.0, 58.0, None),
        ('Grace', '', 'Tolentino', 'grace@plp.edu.ph', hash_pw('pass123'), 'alumni',
         'BSN', 2021, 26, 1, 'Active', 85.0, 83.0, 84.0, 87.0, 74.0, 61.0, 5),
    ]

    for user in users:
        c.execute("SELECT id FROM users WHERE email = ?", [user[3]])
        if not c.fetchone():
            c.execute("""
                INSERT INTO users (first_name, middle_name, last_name, email, password_hash,
                    role, course, graduation_year, age, employed, account_status,
                    avg_grade, avg_prof_grade, avg_elec_grade, ojt_grade, soft_skills, hard_skills,
                    months_to_employment)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, user)
        else:
            # Backfill months_to_employment for existing seed users that don't have it
            c.execute("""
                UPDATE users SET months_to_employment = ?
                WHERE email = ? AND months_to_employment IS NULL AND employed = 1
            """, [user[17], user[3]])

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

    # ── Employment data (historical) ───────────────────────────────────
    emp_data = [
        (2019, 58.2, 60.0, 56.0, 2910, 2090),
        (2020, 52.1, 54.0, 50.0, 2605, 2395),
        (2021, 61.4, 63.0, 59.0, 3070, 1930),
        (2022, 65.8, 67.0, 64.0, 3290, 1710),
    ]

    c.execute("SELECT COUNT(*) FROM employment_data")
    if c.fetchone()[0] == 0:
        c.executemany("""
            INSERT INTO employment_data (year, overall_rate, male_rate, female_rate, employed_count, unemployed_count)
            VALUES (?,?,?,?,?,?)
        """, emp_data)

    # ── Program rates (per year+course — safe to re-run) ──────────────
    prog_rates = [
        (2023, 'BSCS', 82), (2023, 'BSIT', 78), (2023, 'BSBA', 74),
        (2023, 'BSEd', 71), (2023, 'BSA', 68), (2023, 'BSHM', 65), (2023, 'BSN', 79),
        (2022, 'BSCS', 79), (2022, 'BSIT', 75), (2022, 'BSBA', 71),
        (2022, 'BSEd', 68), (2022, 'BSA', 65), (2022, 'BSHM', 62), (2022, 'BSN', 76),
        (2021, 'BSCS', 74), (2021, 'BSIT', 70), (2021, 'BSBA', 66),
        (2021, 'BSEd', 63), (2021, 'BSA', 60), (2021, 'BSHM', 58), (2021, 'BSN', 72),
    ]

    for rate in prog_rates:
        c.execute("SELECT id FROM program_rates WHERE year = ? AND course = ?", [rate[0], rate[1]])
        if not c.fetchone():
            c.execute("INSERT INTO program_rates (year, course, rate) VALUES (?,?,?)", rate)

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

    # ── Reports ───────────────────────────────────────────────────────
    reps = [
        ('Employment Forecast Report 2024', 'PDF', '2019–2024', 'ARIMA (2,1,2)', 'Ready'),
        ('Annual Graduate Outcomes 2023', 'Excel', '2019–2023', 'ARIMA (2,1,2)', 'Ready'),
        ('ARIMA Model Accuracy Summary', 'PDF', '2019–2023', 'ARIMA (2,1,2)', 'Ready'),
        ('Employment by Program (2019–2023)', 'Excel', '2019–2023', 'ARIMA (2,1,2)', 'Ready'),
    ]

    c.execute("SELECT COUNT(*) FROM reports")
    if c.fetchone()[0] == 0:
        c.executemany("""
            INSERT INTO reports (name, type, year_range, model_name, status) VALUES (?,?,?,?,?)
        """, reps)

    # ── Model uploads ─────────────────────────────────────────────────
    uploads = [
        ('Employment Forecast Model v1', 'model2019-2024.csv', 485625, 2, 'Active'),
        ('Employment Data 2019–2024', 'employment2019-2024.csv', 485625, 2, 'Active'),
        ('ALCO Model 2019–2024', 'alco_model2019-2024.csv', 485625, 2, 'Active'),
    ]

    c.execute("SELECT COUNT(*) FROM model_uploads")
    if c.fetchone()[0] == 0:
        c.executemany("""
            INSERT INTO model_uploads (name, original_filename, file_size, records, status) VALUES (?,?,?,?,?)
        """, uploads)

    # ── Notifications ─────────────────────────────────────────────────
    c.execute("SELECT id FROM users WHERE email = 'juan@plp.edu.ph'")
    juan = c.fetchone()
    if juan:
        uid = juan[0]
        c.execute("SELECT COUNT(*) FROM notifications WHERE user_id = ?", [uid])
        if c.fetchone()[0] == 0:
            notifs = [
                (uid, 'New Job Match', 'A UI/UX Designer role at Facebook matches your profile!', 0),
                (uid, 'Profile Reminder', 'Complete your profile to improve job recommendations.', 0),
                (uid, 'Welcome to PLP Alumni Portal', 'Start exploring job opportunities matched to your degree.', 1),
            ]
            c.executemany("""
                INSERT INTO notifications (user_id, title, message, is_read) VALUES (?,?,?,?)
            """, notifs)

    # ── Feedbacks ─────────────────────────────────────────────────────
    c.execute("SELECT COUNT(*) FROM feedbacks")
    if c.fetchone()[0] == 0:
        c.execute("SELECT id FROM users WHERE email = 'juan@plp.edu.ph'")
        u1 = c.fetchone()
        c.execute("SELECT id FROM users WHERE email = 'maria@plp.edu.ph'")
        u2 = c.fetchone()
        c.execute("SELECT id FROM users WHERE email = 'pedro@plp.edu.ph'")
        u3 = c.fetchone()
        c.execute("SELECT id FROM users WHERE email = 'ana@plp.edu.ph'")
        u4 = c.fetchone()
        c.execute("SELECT id FROM users WHERE email = 'rosa@plp.edu.ph'")
        u5 = c.fetchone()
        c.execute("SELECT id FROM users WHERE email = 'lea@plp.edu.ph'")
        u6 = c.fetchone()
        feedback_data = []
        if u1: feedback_data.append((u1[0], 'hired', 'Facebook', 'Frontend Dev', '1 year', 'Remote', 'Full-time'))
        if u2: feedback_data.append((u2[0], 'elsewhere', 'SM Retail', 'IT Support', '6 months', 'On-site', 'Full-time'))
        if u3: feedback_data.append((u3[0], 'looking', '', '', '', '', ''))
        if u4: feedback_data.append((u4[0], 'hired', 'BDO Unibank', 'Bank Teller', '2 years', 'On-site', 'Full-time'))
        if u5: feedback_data.append((u5[0], 'elsewhere', 'Jollibee', 'Shift Manager', '8 months', 'On-site', 'Full-time'))
        if u6: feedback_data.append((u6[0], 'hired', 'Philippine General Hospital', 'Staff Nurse', '1 year', 'On-site', 'Full-time'))
        if feedback_data:
            c.executemany("""
                INSERT INTO feedbacks (user_id, employment_status, company, position, duration, work_setup, employment_type)
                VALUES (?,?,?,?,?,?,?)
            """, feedback_data)

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
