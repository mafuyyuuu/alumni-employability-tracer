"""External job fetching service.

Fetches from Adzuna (real PH jobs) when API keys are configured.
Falls back to curated realistic mock data from multiple PH job sources.
"""
import os
import random
import requests
import urllib.parse
from datetime import datetime, timedelta


def _days_ago(n):
    return (datetime.now() - timedelta(days=n)).strftime('%Y-%m-%d')


def _fb_search(title):
    q = urllib.parse.quote_plus(title + ' hiring Philippines')
    return f'https://www.facebook.com/search/posts/?q={q}'

def _linkedin_url(title):
    q = urllib.parse.quote_plus(title)
    return f'https://www.linkedin.com/jobs/search/?keywords={q}&location=Philippines'

def _jobstreet_url(title):
    slug = urllib.parse.quote_plus(title).replace('+', '-').lower()
    return f'https://www.jobstreet.com.ph/jobs/{slug}-jobs'

def _kalibrr_url(title):
    q = urllib.parse.quote_plus(title)
    return f'https://www.kalibrr.com/jobs#query={q}&location=Philippines'

def _bossjob_url(title):
    q = urllib.parse.quote_plus(title)
    return f'https://www.bossjob.ph/jobs?keyword={q}'

def _indeed_url(title):
    q = urllib.parse.quote_plus(title)
    return f'https://ph.indeed.com/jobs?q={q}&l=Philippines'

def _adzuna_url(title):
    q = urllib.parse.quote_plus(title)
    return f'https://www.adzuna.com.ph/search?q={q}'


# Map each program to job search keywords and category label
PROGRAM_MAP = {
    'BSCS': {
        'keywords': ['software developer', 'data scientist', 'web developer', 'python developer'],
        'category': 'IT & Software',
    },
    'BSIT': {
        'keywords': ['IT support', 'network engineer', 'system administrator', 'database administrator'],
        'category': 'IT & Networks',
    },
    'BSBA': {
        'keywords': ['business analyst', 'marketing specialist', 'operations manager'],
        'category': 'Business & Management',
    },
    'BSEd': {
        'keywords': ['teacher', 'instructor', 'tutor', 'education coordinator'],
        'category': 'Education',
    },
    'BSA': {
        'keywords': ['accountant', 'auditor', 'financial analyst', 'bookkeeper'],
        'category': 'Finance & Accounting',
    },
    'BSHM': {
        'keywords': ['hotel manager', 'food and beverage', 'housekeeping', 'front desk officer'],
        'category': 'Hospitality & Tourism',
    },
    'BSN': {
        'keywords': ['registered nurse', 'staff nurse', 'clinical nurse', 'nurse'],
        'category': 'Healthcare & Nursing',
    },
}

# Words in a job title/category that match each program
PROGRAM_MATCH_TAGS = {
    'BSCS': ['software', 'developer', 'data', 'web', 'programmer', 'engineer', 'analyst', 'IT', 'tech', 'python', 'java', 'full stack'],
    'BSIT': ['IT', 'network', 'system', 'support', 'infrastructure', 'cloud', 'security', 'database', 'helpdesk', 'sysadmin'],
    'BSBA': ['business', 'marketing', 'operations', 'management', 'sales', 'HR', 'admin', 'project', 'coordinator', 'manager'],
    'BSEd': ['teacher', 'instructor', 'tutor', 'education', 'training', 'academic', 'faculty', 'professor', 'school'],
    'BSA': ['accountant', 'auditor', 'finance', 'accounting', 'tax', 'CPA', 'bookkeeping', 'treasury', 'payroll', 'financial'],
    'BSHM': ['hotel', 'hospitality', 'tourism', 'food', 'beverage', 'housekeeping', 'front desk', 'restaurant', 'events', 'resort'],
    'BSN': ['nurse', 'nursing', 'RN', 'registered nurse', 'clinical', 'healthcare', 'hospital', 'patient care', 'ward', 'ICU', 'caregiver', 'medical'],
}

# Curated realistic external jobs per program (from different PH job platforms)
MOCK_JOBS_BY_PROGRAM = {
    'BSCS': [
        {
            'source': 'LinkedIn', 'title': 'Junior Software Developer',
            'company': 'Accenture Philippines', 'location': 'Taguig, Metro Manila',
            'type': 'Full-time', 'salary': '₱35,000–₱55,000/mo',
            'description': 'Join our Technology Services team to develop and maintain enterprise-level software solutions for global clients. You will work with modern technologies including React, Node.js, and cloud platforms. Fresh graduates are welcome. Strong programming fundamentals required.',
            'url': _linkedin_url('Junior Software Developer Philippines'), 'category': 'IT & Software', 'program': 'BSCS', 'posted_at': _days_ago(2),
        },
        {
            'source': 'Kalibrr', 'title': 'Data Analyst',
            'company': 'Globe Telecom', 'location': 'BGC, Taguig',
            'type': 'Full-time', 'salary': '₱30,000–₱45,000/mo',
            'description': 'Analyze large datasets to drive business decisions and improve telecom services. Work with SQL, Python, and Tableau to create insightful reports and dashboards. Collaborate with product teams to identify trends and opportunities.',
            'url': _kalibrr_url('Data Analyst'), 'category': 'IT & Software', 'program': 'BSCS', 'posted_at': _days_ago(4),
        },
        {
            'source': 'JobStreet', 'title': 'Full Stack Web Developer',
            'company': 'Sprout Solutions', 'location': 'Makati City',
            'type': 'Full-time', 'salary': '₱40,000–₱65,000/mo',
            'description': 'Build and maintain our HR tech platform used by thousands of Philippine companies. Develop features using React, Laravel, and MySQL. Experience with REST APIs and version control (Git) required. Flexible work arrangements offered.',
            'url': _jobstreet_url('Full Stack Web Developer'), 'category': 'IT & Software', 'program': 'BSCS', 'posted_at': _days_ago(1),
        },
        {
            'source': 'Indeed', 'title': 'Backend Engineer',
            'company': 'Mynt (GCash)', 'location': 'Taguig, Metro Manila',
            'type': 'Full-time', 'salary': '₱50,000–₱80,000/mo',
            'description': 'Help build the next generation of financial technology for Filipinos. Design and implement scalable backend services handling millions of transactions daily. Strong understanding of microservices architecture, security, and database design required.',
            'url': _indeed_url('Backend Engineer'), 'category': 'IT & Software', 'program': 'BSCS', 'posted_at': _days_ago(3),
        },
        {
            'source': 'BossJob', 'title': 'Junior Frontend Developer',
            'company': 'PayMongo', 'location': 'Makati City (Hybrid)',
            'type': 'Full-time', 'salary': '₱35,000–₱50,000/mo',
            'description': 'Join our growing fintech startup and shape the future of online payments in the Philippines. Build intuitive user interfaces with React and TypeScript. Agile environment with talented engineers. Open to fresh graduates with strong portfolio or personal projects.',
            'url': _bossjob_url('Junior Frontend Developer'), 'category': 'IT & Software', 'program': 'BSCS', 'posted_at': _days_ago(5),
        },
        {
            'source': 'Adzuna', 'title': 'Machine Learning Engineer',
            'company': 'Smart Communications', 'location': 'Makati, Metro Manila',
            'type': 'Full-time', 'salary': '₱55,000–₱90,000/mo',
            'description': 'Develop and deploy ML models to optimize network performance, predict customer churn, and detect fraud. Strong Python skills and experience with TensorFlow or PyTorch required. Knowledge of MLOps and cloud platforms (AWS/GCP) is a big plus.',
            'url': _adzuna_url('Machine Learning Engineer'), 'category': 'IT & Software', 'program': 'BSCS', 'posted_at': _days_ago(6),
        },
    ],
    'BSIT': [
        {
            'source': 'JobStreet', 'title': 'IT Support Specialist',
            'company': 'BDO Unibank', 'location': 'Mandaluyong, Metro Manila',
            'type': 'Full-time', 'salary': '₱22,000–₱35,000/mo',
            'description': 'Provide technical support to bank employees across multiple branches. Troubleshoot hardware, software, and network issues. Manage help desk tickets and ensure SLA compliance. Knowledge of Windows Server, Active Directory, and networking protocols required.',
            'url': _jobstreet_url('IT Support Specialist'), 'category': 'IT & Networks', 'program': 'BSIT', 'posted_at': _days_ago(2),
        },
        {
            'source': 'LinkedIn', 'title': 'Network Administrator',
            'company': 'PLDT', 'location': 'Makati City',
            'type': 'Full-time', 'salary': '₱30,000–₱45,000/mo',
            'description': 'Manage and maintain network infrastructure for one of the Philippines\' largest telcos. Configure and monitor routers, switches, and firewalls. Ensure uptime and security of national network assets. CCNA certification preferred.',
            'url': _linkedin_url('Network Administrator Philippines'), 'category': 'IT & Networks', 'program': 'BSIT', 'posted_at': _days_ago(3),
        },
        {
            'source': 'Kalibrr', 'title': 'Database Administrator',
            'company': 'Metrobank', 'location': 'Pasig, Metro Manila',
            'type': 'Full-time', 'salary': '₱35,000–₱55,000/mo',
            'description': 'Design, implement, and maintain database systems supporting banking operations. Perform database tuning, backup, and recovery. Experience with Oracle, MySQL, or SQL Server required. Strong knowledge of stored procedures, indexing, and database security.',
            'url': _kalibrr_url('Database Administrator'), 'category': 'IT & Networks', 'program': 'BSIT', 'posted_at': _days_ago(1),
        },
        {
            'source': 'BossJob', 'title': 'Systems Analyst',
            'company': 'Jollibee Foods Corporation', 'location': 'Ortigas, Pasig',
            'type': 'Full-time', 'salary': '₱28,000–₱42,000/mo',
            'description': 'Analyze and improve IT systems that power one of Asia\'s largest fast food chains. Work with business units to gather requirements, design solutions, and implement improvements. Experience with ERP systems and business process analysis preferred.',
            'url': _bossjob_url('Systems Analyst'), 'category': 'IT & Networks', 'program': 'BSIT', 'posted_at': _days_ago(4),
        },
        {
            'source': 'Indeed', 'title': 'Cloud Infrastructure Engineer',
            'company': 'Converge ICT', 'location': 'Quezon City',
            'type': 'Full-time', 'salary': '₱40,000–₱65,000/mo',
            'description': 'Build and manage cloud infrastructure on AWS and Azure for a leading Philippine internet provider. Implement DevOps practices, CI/CD pipelines, and containerization using Docker and Kubernetes. Strong scripting skills and IaC tools experience required.',
            'url': _indeed_url('Cloud Infrastructure Engineer'), 'category': 'IT & Networks', 'program': 'BSIT', 'posted_at': _days_ago(5),
        },
    ],
    'BSBA': [
        {
            'source': 'LinkedIn', 'title': 'Marketing Specialist',
            'company': 'Jollibee Foods Corporation', 'location': 'Pasig, Metro Manila',
            'type': 'Full-time', 'salary': '₱25,000–₱40,000/mo',
            'description': 'Support brand management and marketing campaigns for iconic Filipino food brands. Plan and execute digital and traditional marketing initiatives. Analyze campaign performance and prepare reports. Knowledge of social media marketing and digital advertising platforms required.',
            'url': _linkedin_url('Marketing Specialist Philippines'), 'category': 'Business & Management', 'program': 'BSBA', 'posted_at': _days_ago(1),
        },
        {
            'source': 'BossJob', 'title': 'HR Assistant',
            'company': 'SM Retail Inc.', 'location': 'Pasay, Metro Manila',
            'type': 'Full-time', 'salary': '₱20,000–₱28,000/mo',
            'description': 'Support HR operations including recruitment, employee records management, and payroll processing. Assist in onboarding and training coordination. Knowledge of Philippine Labor Law and HRIS is an advantage. Detail-oriented and able to handle confidential information.',
            'url': _bossjob_url('HR Assistant'), 'category': 'Business & Management', 'program': 'BSBA', 'posted_at': _days_ago(2),
        },
        {
            'source': 'JobStreet', 'title': 'Business Development Associate',
            'company': 'Ayala Corporation', 'location': 'Makati City',
            'type': 'Full-time', 'salary': '₱30,000–₱50,000/mo',
            'description': 'Identify and develop new business opportunities for one of the Philippines\' largest conglomerates. Conduct market research, prepare business proposals, and support deal execution. Work with diverse business units including real estate, banking, and retail.',
            'url': _jobstreet_url('Business Development Associate'), 'category': 'Business & Management', 'program': 'BSBA', 'posted_at': _days_ago(3),
        },
        {
            'source': 'Kalibrr', 'title': 'Operations Manager Trainee',
            'company': 'Robinsons Retail Holdings', 'location': 'Quezon City',
            'type': 'Full-time', 'salary': '₱25,000–₱35,000/mo',
            'description': 'Join our management trainee program and learn to oversee retail operations across our store network. Manage inventory, staff scheduling, and customer service quality. Fresh graduates with leadership potential encouraged to apply.',
            'url': _kalibrr_url('Operations Manager Trainee'), 'category': 'Business & Management', 'program': 'BSBA', 'posted_at': _days_ago(4),
        },
        {
            'source': 'Indeed', 'title': 'Project Coordinator',
            'company': 'Aboitiz Equity Ventures', 'location': 'Taguig, Metro Manila',
            'type': 'Full-time', 'salary': '₱28,000–₱42,000/mo',
            'description': 'Coordinate and track multiple projects across energy, banking, and food business units. Prepare project plans, status reports, and stakeholder presentations. MS Project proficiency preferred. Strong organizational skills and ability to work under pressure required.',
            'url': _indeed_url('Project Coordinator'), 'category': 'Business & Management', 'program': 'BSBA', 'posted_at': _days_ago(5),
        },
    ],
    'BSEd': [
        {
            'source': 'JobStreet', 'title': 'Elementary School Teacher',
            'company': 'Ateneo de Manila University', 'location': 'Quezon City',
            'type': 'Full-time', 'salary': '₱22,000–₱35,000/mo',
            'description': 'Teach core subjects to elementary students using modern, student-centered approaches. Develop lesson plans aligned with DepEd curriculum. Collaborate with colleagues and communicate regularly with parents. LET passer preferred.',
            'url': _jobstreet_url('Elementary School Teacher'), 'category': 'Education', 'program': 'BSEd', 'posted_at': _days_ago(2),
        },
        {
            'source': 'LinkedIn', 'title': 'Online English Tutor',
            'company': '51Talk Philippines', 'location': 'Remote / Work from Home',
            'type': 'Part-time', 'salary': '₱100–₱180/hour',
            'description': 'Teach English online to students of various ages and levels. Use proven curriculum and platform to deliver engaging lessons. Flexible scheduling available. No prior experience required — full training provided. Stable internet connection and quiet environment required.',
            'url': _linkedin_url('Online English Tutor Philippines'), 'category': 'Education', 'program': 'BSEd', 'posted_at': _days_ago(1),
        },
        {
            'source': 'BossJob', 'title': 'Corporate Training Coordinator',
            'company': 'BDO Unibank', 'location': 'Mandaluyong, Metro Manila',
            'type': 'Full-time', 'salary': '₱25,000–₱38,000/mo',
            'description': 'Design and coordinate training programs for bank employees nationwide. Facilitate classroom and online learning sessions. Develop training materials and assess learning outcomes. Experience in instructional design or corporate training is an advantage.',
            'url': _bossjob_url('Training Coordinator'), 'category': 'Education', 'program': 'BSEd', 'posted_at': _days_ago(3),
        },
        {
            'source': 'Kalibrr', 'title': 'Curriculum Developer',
            'company': 'DepEd Philippines', 'location': 'Pasig, Metro Manila',
            'type': 'Full-time', 'salary': '₱28,000–₱40,000/mo',
            'description': 'Develop and review educational materials aligned with the K-12 curriculum. Collaborate with subject matter experts and teachers. Strong writing skills and educational technology knowledge required. LET passers and those with classroom experience preferred.',
            'url': _kalibrr_url('Curriculum Developer'), 'category': 'Education', 'program': 'BSEd', 'posted_at': _days_ago(4),
        },
    ],
    'BSA': [
        {
            'source': 'LinkedIn', 'title': 'Junior Auditor',
            'company': 'SGV & Co. (EY Philippines)', 'location': 'Makati City',
            'type': 'Full-time', 'salary': '₱28,000–₱45,000/mo',
            'description': 'Join one of the Philippines\' Big Four accounting firms and audit financial statements for leading corporations. Perform risk assessments, test internal controls, and prepare audit findings. CPA board exam passers preferred.',
            'url': _linkedin_url('Junior Auditor Philippines'), 'category': 'Finance & Accounting', 'program': 'BSA', 'posted_at': _days_ago(1),
        },
        {
            'source': 'JobStreet', 'title': 'General Accountant',
            'company': 'Bank of the Philippine Islands', 'location': 'Makati City',
            'type': 'Full-time', 'salary': '₱25,000–₱40,000/mo',
            'description': 'Handle daily accounting operations including journal entries, bank reconciliation, and financial report preparation. Ensure compliance with PFRS and BIR requirements. Proficiency in SAP or other ERP systems is an advantage.',
            'url': _jobstreet_url('Accountant'), 'category': 'Finance & Accounting', 'program': 'BSA', 'posted_at': _days_ago(2),
        },
        {
            'source': 'Kalibrr', 'title': 'Tax Specialist',
            'company': 'Meralco', 'location': 'Pasig, Metro Manila',
            'type': 'Full-time', 'salary': '₱30,000–₱48,000/mo',
            'description': 'Prepare and file tax returns, manage BIR compliance, and provide tax advisory services. Monitor changes in tax regulations and assess business impact. Assist in tax planning and represent the company in BIR examinations. CPA preferred.',
            'url': _kalibrr_url('Tax Specialist'), 'category': 'Finance & Accounting', 'program': 'BSA', 'posted_at': _days_ago(3),
        },
        {
            'source': 'BossJob', 'title': 'Financial Analyst',
            'company': 'Monde Nissin Corporation', 'location': 'Quezon City',
            'type': 'Full-time', 'salary': '₱30,000–₱50,000/mo',
            'description': 'Analyze financial data to support strategic decisions for one of the Philippines\' leading FMCG companies. Prepare financial models, variance analysis, and management reports. Excel financial modeling and PowerBI experience a plus.',
            'url': _bossjob_url('Financial Analyst'), 'category': 'Finance & Accounting', 'program': 'BSA', 'posted_at': _days_ago(4),
        },
        {
            'source': 'Indeed', 'title': 'Payroll Specialist',
            'company': 'Concentrix Philippines', 'location': 'Quezon City',
            'type': 'Full-time', 'salary': '₱25,000–₱38,000/mo',
            'description': 'Process payroll for thousands of BPO employees accurately and on time. Manage SSS, PhilHealth, Pag-IBIG, and withholding tax computations. Handle payroll inquiries and resolve discrepancies. Knowledge of Philippine payroll regulations required.',
            'url': _indeed_url('Payroll Specialist'), 'category': 'Finance & Accounting', 'program': 'BSA', 'posted_at': _days_ago(5),
        },
    ],
    'BSN': [
        {
            'source': 'JobStreet', 'title': 'Registered Nurse – Staff Nurse',
            'company': 'Philippine General Hospital', 'location': 'Manila, Metro Manila',
            'type': 'Full-time', 'salary': '₱25,000–₱40,000/mo',
            'description': 'Provide direct patient care in a government tertiary hospital setting. Assess, plan, implement, and evaluate nursing care for assigned patients. Collaborate with physicians and allied health professionals. PRC-licensed RN required. Willing to work on shifting schedules including nights, weekends, and holidays.',
            'url': _jobstreet_url('Registered Nurse Staff Nurse'), 'category': 'Healthcare & Nursing', 'program': 'BSN', 'posted_at': _days_ago(1),
        },
        {
            'source': 'LinkedIn', 'title': 'Clinical Nurse – ICU',
            'company': 'Makati Medical Center', 'location': 'Makati City',
            'type': 'Full-time', 'salary': '₱30,000–₱50,000/mo',
            'description': 'Provide specialized nursing care for critically ill patients in the Intensive Care Unit. Monitor hemodynamic status, manage mechanical ventilators, and administer IV medications. At least 1 year of ICU experience required. Must be PRC licensed with updated PRC ID.',
            'url': _linkedin_url('Clinical Nurse ICU Philippines'), 'category': 'Healthcare & Nursing', 'program': 'BSN', 'posted_at': _days_ago(2),
        },
        {
            'source': 'Kalibrr', 'title': 'Company Nurse / Occupational Health Nurse',
            'company': 'Jollibee Foods Corporation', 'location': 'Pasig, Metro Manila',
            'type': 'Full-time', 'salary': '₱22,000–₱32,000/mo',
            'description': 'Provide occupational health services for employees at a leading food company. Conduct pre-employment medical exams, manage workplace injuries, facilitate wellness programs, and maintain health records. Must be a licensed RN with experience in occupational health or a clinical setting.',
            'url': _kalibrr_url('Company Nurse Occupational Health'), 'category': 'Healthcare & Nursing', 'program': 'BSN', 'posted_at': _days_ago(3),
        },
        {
            'source': 'Indeed', 'title': 'Nurse Educator / Clinical Instructor',
            'company': 'Far Eastern University – NRMF', 'location': 'Quezon City',
            'type': 'Full-time', 'salary': '₱28,000–₱40,000/mo',
            'description': 'Teach nursing subjects and supervise students in clinical settings. Develop lesson plans, conduct skills laboratory demonstrations, and evaluate student performance. Must be a PRC-licensed RN. Master of Arts in Nursing (MAN) preferred. At least 2 years of clinical practice required.',
            'url': _indeed_url('Nurse Educator Clinical Instructor'), 'category': 'Healthcare & Nursing', 'program': 'BSN', 'posted_at': _days_ago(4),
        },
        {
            'source': 'BossJob', 'title': 'Overseas Nurse – Qatar / UAE',
            'company': 'Optimal Staffing Solutions', 'location': 'Metro Manila (Deploy Abroad)',
            'type': 'Full-time', 'salary': 'QAR 3,500–5,000/mo (tax-free)',
            'description': 'Seeking licensed Filipino nurses for deployment to hospitals and clinics in Qatar and UAE. Minimum 2 years clinical experience required. NCLEX or HAAD/DHA/Prometric exam passers are prioritized. All documents, visa processing, and airfare provided by the agency. Monthly tax-free salary plus free accommodation and medical.',
            'url': _bossjob_url('Overseas Nurse Qatar UAE'), 'category': 'Healthcare & Nursing', 'program': 'BSN', 'posted_at': _days_ago(5),
        },
        {
            'source': 'Adzuna', 'title': 'Dialysis Nurse',
            'company': 'National Kidney and Transplant Institute', 'location': 'Quezon City',
            'type': 'Full-time', 'salary': '₱28,000–₱42,000/mo',
            'description': 'Provide specialized care for patients with chronic kidney disease undergoing hemodialysis treatment. Monitor patients during dialysis sessions, manage access care, and educate patients on renal diet and fluid restrictions. PRC-licensed RN with at least 1 year hospital experience required.',
            'url': _adzuna_url('Dialysis Nurse'), 'category': 'Healthcare & Nursing', 'program': 'BSN', 'posted_at': _days_ago(6),
        },
    ],
    'BSHM': [
        {
            'source': 'JobStreet', 'title': 'Front Desk Officer',
            'company': 'Shangri-La Makati', 'location': 'Makati City',
            'type': 'Full-time', 'salary': '₱20,000–₱30,000/mo',
            'description': 'Provide exceptional guest experiences at a world-class luxury hotel. Handle check-in/check-out, reservations, and guest inquiries with professionalism. Fluency in English required. Experience with Opera PMS is an advantage. Willing to work on shifting schedules.',
            'url': _jobstreet_url('Front Desk Officer'), 'category': 'Hospitality & Tourism', 'program': 'BSHM', 'posted_at': _days_ago(1),
        },
        {
            'source': 'BossJob', 'title': 'Restaurant Supervisor',
            'company': "Max's Restaurant", 'location': 'Various Locations, Metro Manila',
            'type': 'Full-time', 'salary': '₱22,000–₱32,000/mo',
            'description': 'Supervise daily restaurant operations, manage staff, and ensure outstanding customer service. Handle food quality control, inventory, and sales targets. Leadership experience in food service preferred. Willing to be assigned to any branch.',
            'url': _bossjob_url('Restaurant Supervisor'), 'category': 'Hospitality & Tourism', 'program': 'BSHM', 'posted_at': _days_ago(2),
        },
        {
            'source': 'LinkedIn', 'title': 'Tour Operations Coordinator',
            'company': 'Philippine Airlines (PAL)', 'location': 'Pasay, Metro Manila',
            'type': 'Full-time', 'salary': '₱25,000–₱38,000/mo',
            'description': 'Coordinate domestic and international tour packages for airline passengers. Liaise with hotels, transport providers, and tour guides. Handle bookings, itinerary planning, and client communication. Knowledge of GDS (Amadeus, Sabre) is an advantage.',
            'url': _linkedin_url('Tour Operations Coordinator Philippines'), 'category': 'Hospitality & Tourism', 'program': 'BSHM', 'posted_at': _days_ago(3),
        },
        {
            'source': 'Kalibrr', 'title': 'Events Coordinator',
            'company': 'SMDC (SM Development Corporation)', 'location': 'Pasay, Metro Manila',
            'type': 'Full-time', 'salary': '₱22,000–₱35,000/mo',
            'description': 'Plan and execute events including product launches, corporate gatherings, and lifestyle events. Coordinate with vendors, venues, and clients from concept to completion. Excellent organizational skills and ability to work flexible hours/weekends required.',
            'url': _kalibrr_url('Events Coordinator'), 'category': 'Hospitality & Tourism', 'program': 'BSHM', 'posted_at': _days_ago(4),
        },
        {
            'source': 'Indeed', 'title': 'Housekeeping Supervisor',
            'company': 'Solaire Resort & Casino', 'location': 'Paranaque, Metro Manila',
            'type': 'Full-time', 'salary': '₱22,000–₱32,000/mo',
            'description': 'Supervise housekeeping team to maintain the highest standards of cleanliness in a world-class integrated resort. Train and evaluate housekeeping staff, manage room assignments, and handle guest requests. Luxury hotel experience required.',
            'url': _indeed_url('Housekeeping Supervisor'), 'category': 'Hospitality & Tourism', 'program': 'BSHM', 'posted_at': _days_ago(5),
        },
    ],
}

# Facebook Groups job posts per program
# URLs use Facebook post search so clicking goes to real matching posts in PH
FACEBOOK_JOBS_BY_PROGRAM = {
    'BSCS': {
        'source': 'Facebook Groups', 'title': 'Junior Web Developer (Urgent Hiring!)',
        'company': 'TechZone Solutions PH', 'location': 'Quezon City / Remote',
        'type': 'Full-time', 'salary': '₱25,000–₱40,000/mo',
        'description': 'URGENT HIRING! We are looking for a Junior Web Developer to join our growing team. Requirements: BS Computer Science or related field, knowledge of HTML/CSS/JS and any backend framework (PHP, Node, Python). Fresh grads welcome! Send CV to careers@techzoneph.com or DM this page. Interview slots available this week.',
        'url': _fb_search('Junior Web Developer'), 'category': 'IT & Software', 'program': 'BSCS', 'posted_at': _days_ago(1),
    },
    'BSIT': {
        'source': 'Facebook Groups', 'title': 'IT Technician / Helpdesk (Walk-in Interview)',
        'company': 'DataBridge IT Services', 'location': 'Mandaluyong, Metro Manila',
        'type': 'Full-time', 'salary': '₱20,000–₱28,000/mo',
        'description': 'WALK-IN INTERVIEW EVERYDAY 9AM–3PM! We need IT Technicians and Helpdesk staff for our growing client base in Metro Manila. Requirements: BSIT or related course, knowledge of Windows OS, networking basics, hardware troubleshooting. With or without experience welcome. Bring 2 copies of resume + valid ID.',
        'url': _fb_search('IT Technician Helpdesk'), 'category': 'IT & Networks', 'program': 'BSIT', 'posted_at': _days_ago(0),
    },
    'BSBA': {
        'source': 'Facebook Groups', 'title': 'Marketing Officer (Entry Level)',
        'company': 'Bright Marketing Corp.', 'location': 'Ortigas, Pasig',
        'type': 'Full-time', 'salary': '₱22,000–₱30,000/mo',
        'description': 'NOW HIRING: Marketing Officer! Looking for a passionate fresh graduate to join our marketing team. You will handle social media management, content creation, and campaign coordination. Requirements: BSBA Marketing or any business course, creative, good communication skills, knows Canva or basic design tools. Email your CV to hr@brightmktg.com. Subject: MARKETING OFFICER APPLICATION.',
        'url': _fb_search('Marketing Officer entry level'), 'category': 'Business & Management', 'program': 'BSBA', 'posted_at': _days_ago(1),
    },
    'BSEd': {
        'source': 'Facebook Groups', 'title': 'Grade School Teacher (SY 2025–2026)',
        'company': 'Pasig Catholic College', 'location': 'Pasig, Metro Manila',
        'type': 'Full-time', 'salary': '₱20,000–₱28,000/mo',
        'description': 'HIRING: Grade School Teachers for SY 2025–2026! We are looking for dedicated and passionate educators. Requirements: BSEd graduate, LET passer preferred (non-board passers may apply), with or without teaching experience. Submit application letter, resume, TOR, and copy of PRC ID (if applicable) to the HR Office or email principal@pasigcatholic.edu.ph.',
        'url': _fb_search('Grade School Teacher'), 'category': 'Education', 'program': 'BSEd', 'posted_at': _days_ago(2),
    },
    'BSA': {
        'source': 'Facebook Groups', 'title': 'Accounting Staff / Bookkeeper',
        'company': 'Reyes & Associates CPA Firm', 'location': 'Makati City',
        'type': 'Full-time', 'salary': '₱20,000–₱28,000/mo',
        'description': 'WE ARE HIRING: Accounting Staff / Bookkeeper for our CPA firm in Makati. Requirements: BS Accountancy graduate, with basic knowledge of bookkeeping, BIR forms, and payroll. CPA not required. Computer literate (MS Excel, QuickBooks or any accounting software). Interested? Send your updated CV to reyesassociates.hr@gmail.com. For inquiries, DM this post.',
        'url': _fb_search('Accounting Staff Bookkeeper'), 'category': 'Finance & Accounting', 'program': 'BSA', 'posted_at': _days_ago(1),
    },
    'BSN': {
        'source': 'Facebook Groups', 'title': 'Registered Nurse – Urgent Hiring (Local & Abroad)',
        'company': 'MedStaff Recruitment Agency', 'location': 'Metro Manila / Abroad',
        'type': 'Full-time', 'salary': '₱25,000–₱45,000/mo or Tax-free abroad',
        'description': 'URGENT HIRING: Registered Nurses for local hospitals and international deployment (Qatar, Saudi Arabia, UAE, Canada). Requirements: Active PRC license, at least 1 year clinical experience, good English communication. Abroad applicants: IELTS or OET preferred. Benefits include processing assistance, accommodation, and relocation support. DM this page or send CV to hr@medstaffrecruitment.com',
        'url': _fb_search('Registered Nurse urgent hiring Philippines'), 'category': 'Healthcare & Nursing', 'program': 'BSN', 'posted_at': _days_ago(0),
    },
    'BSHM': {
        'source': 'Facebook Groups', 'title': 'F&B Service Crew / Waitstaff',
        'company': 'The Grillery Restaurant Group', 'location': 'BGC, Taguig',
        'type': 'Full-time', 'salary': '₱17,000–₱22,000/mo + tips',
        'description': 'HIRING NOW: F&B Service Crew for our BGC branches! Looking for energetic and customer-focused individuals with a passion for hospitality. BSHM or HRM graduates preferred but not required. With or without experience. Benefits: SSS, PhilHealth, Pag-IBIG, HMO, meal allowance, and tips. Interview is walk-in, Monday–Saturday 10AM–4PM. Bring resume and valid ID.',
        'url': _fb_search('F&B Service Crew Waitstaff'), 'category': 'Hospitality & Tourism', 'program': 'BSHM', 'posted_at': _days_ago(0),
    },
}

GENERAL_EXTERNAL_JOBS = [
    {
        'source': 'JobStreet', 'title': 'Administrative Assistant',
        'company': 'Convergys Philippines', 'location': 'Quezon City',
        'type': 'Full-time', 'salary': '₱18,000–₱25,000/mo',
        'description': 'Provide administrative support to operations team. Manage schedules, prepare reports, and coordinate meetings. Strong MS Office skills and attention to detail required.',
        'url': _jobstreet_url('Administrative Assistant'), 'category': 'Admin & Office', 'program': '', 'posted_at': _days_ago(1),
    },
    {
        'source': 'BossJob', 'title': 'Customer Service Representative',
        'company': 'Teleperformance Philippines', 'location': 'Makati City',
        'type': 'Full-time', 'salary': '₱18,000–₱25,000/mo',
        'description': 'Handle customer inquiries and resolve issues for international clients. Must be fluent in English. Night shift required. HMO benefits, performance bonuses, and career growth opportunities offered.',
        'url': _bossjob_url('Customer Service Representative'), 'category': 'Customer Service', 'program': '', 'posted_at': _days_ago(2),
    },
    {
        'source': 'Facebook Groups', 'title': 'Office Staff / Admin (Multiple Positions)',
        'company': 'Various Companies — Metro Manila', 'location': 'Metro Manila',
        'type': 'Full-time', 'salary': '₱16,000–₱22,000/mo',
        'description': 'MULTIPLE HIRING POSTS! Various companies in Metro Manila are looking for office staff, admin assistants, data encoders, and receptionist. Fresh graduates from any 4-year course are encouraged to apply. New posts are added daily by HR managers and company recruiters across the Philippines.',
        'url': _fb_search('Office Staff Admin'), 'category': 'Admin & Office', 'program': '', 'posted_at': _days_ago(0),
    },
]

SOURCE_COLORS = {
    'LinkedIn': '#0077b5',
    'JobStreet': '#e60000',
    'Kalibrr': '#6c3baa',
    'BossJob': '#1a73e8',
    'Indeed': '#003a9b',
    'Adzuna': '#ef8500',
    'Facebook Groups': '#1877f2',
    'Glassdoor': '#0caa41',
    'ZipRecruiter': '#4a90d9',
    'Monster': '#7b2d8b',
    'Jooble': '#ff5722',
    'JSearch': '#ff6b35',
    'Google': '#4285f4',
}

# Palette for unknown publishers — deterministic by hash
_COLOR_PALETTE = [
    '#0d9488', '#7c3aed', '#b45309', '#0369a1', '#9d174d',
    '#065f46', '#1d4ed8', '#b91c1c', '#6d28d9', '#0f766e',
    '#92400e', '#1e40af', '#831843', '#14532d', '#1e3a8a',
]


def get_source_color(source_name):
    """Return a consistent color for any source/publisher name."""
    if source_name in SOURCE_COLORS:
        return SOURCE_COLORS[source_name]
    return _COLOR_PALETTE[abs(hash(source_name)) % len(_COLOR_PALETTE)]


def is_job_recommended(job_title, job_category, course):
    """Check if a job matches the user's program using word-boundary matching."""
    import re
    course = (course or '').upper()
    tags = PROGRAM_MATCH_TAGS.get(course, [])
    combined = (job_title + ' ' + (job_category or '')).lower()
    for tag in tags:
        if re.search(r'\b' + re.escape(tag.lower()) + r'\b', combined):
            return True
    return False


def fetch_from_jsearch(keyword, n=10):
    """Fetch real job listings from JSearch (RapidAPI) — Google Jobs aggregator.
    Free tier: 200 requests/month. Get key at rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
    Set JSEARCH_API_KEY in .env to enable.
    """
    api_key = os.getenv('JSEARCH_API_KEY', '')
    if not api_key:
        return None
    try:
        resp = requests.get(
            'https://jsearch.p.rapidapi.com/search',
            headers={
                'X-RapidAPI-Key': api_key,
                'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
            },
            params={
                'query': f'{keyword} in Philippines',
                'num_pages': '1',
                'date_posted': 'month',
            },
            timeout=10,
        )
        if resp.status_code == 200:
            jobs = []
            for r in resp.json().get('data', []):
                emp_type = r.get('job_employment_type', 'FULLTIME')
                type_map = {'FULLTIME': 'Full-time', 'PARTTIME': 'Part-time', 'CONTRACTOR': 'Contract', 'INTERN': 'Internship'}
                sal_min = r.get('job_min_salary')
                sal_max = r.get('job_max_salary')
                sal_period = (r.get('job_salary_period') or '').lower()
                if sal_min and sal_max:
                    salary = f"PHP {int(sal_min):,}–{int(sal_max):,}/{sal_period or 'mo'}"
                elif sal_min:
                    salary = f"PHP {int(sal_min):,}+/{sal_period or 'mo'}"
                else:
                    salary = ''
                apply_url = r.get('job_apply_link') or r.get('job_google_link') or ''
                publisher = r.get('job_publisher', 'JSearch')
                jobs.append({
                    'source': publisher,
                    'title': r.get('job_title', ''),
                    'company': r.get('employer_name', ''),
                    'location': ', '.join(filter(None, [r.get('job_city'), r.get('job_state'), r.get('job_country', 'Philippines')])),
                    'type': type_map.get(emp_type, 'Full-time'),
                    'salary': salary,
                    'description': (r.get('job_description', '') or '')[:600],
                    'url': apply_url,
                    'category': r.get('job_required_skills', [''])[0] if r.get('job_required_skills') else '',
                    'program': '',
                    'posted_at': (r.get('job_posted_at_datetime_utc', '') or '')[:10],
                })
            return jobs if jobs else None
    except Exception:
        pass
    return None


def fetch_from_jooble(keyword, n=10):
    """Fetch real job listings from Jooble — free job aggregator covering PH.
    Get free API key: email api@jooble.org with your domain/project name.
    Set JOOBLE_API_KEY in .env to enable.
    """
    api_key = os.getenv('JOOBLE_API_KEY', '')
    if not api_key:
        return None
    try:
        resp = requests.post(
            f'https://jooble.org/api/{api_key}',
            json={'keywords': keyword, 'location': 'Philippines', 'resultsOnPage': n},
            timeout=10,
        )
        if resp.status_code == 200:
            jobs = []
            for r in resp.json().get('jobs', []):
                jobs.append({
                    'source': 'Jooble',
                    'title': r.get('title', ''),
                    'company': r.get('company', ''),
                    'location': r.get('location', 'Philippines'),
                    'type': r.get('type', 'Full-time'),
                    'salary': r.get('salary', ''),
                    'description': (r.get('snippet', '') or '')[:600],
                    'url': r.get('link', ''),
                    'category': '',
                    'program': '',
                    'posted_at': (r.get('updated', '') or '')[:10],
                })
            return jobs if jobs else None
    except Exception:
        pass
    return None


def fetch_from_adzuna(keyword, n=10):
    """Fetch real PH jobs from Adzuna API.
    Free tier available. Get key at developer.adzuna.com.
    Set ADZUNA_APP_ID and ADZUNA_APP_KEY in .env to enable.
    """
    app_id = os.getenv('ADZUNA_APP_ID', '')
    app_key = os.getenv('ADZUNA_APP_KEY', '')
    if not app_id or not app_key:
        return None
    try:
        resp = requests.get(
            'https://api.adzuna.com/v1/api/jobs/ph/search/1',
            params={'app_id': app_id, 'app_key': app_key, 'results_per_page': n, 'what': keyword},
            timeout=8,
        )
        if resp.status_code == 200:
            jobs = []
            for r in resp.json().get('results', []):
                sal_min = r.get('salary_min', 0)
                sal_max = r.get('salary_max', 0)
                salary = f"PHP {int(sal_min):,}–{int(sal_max):,}/mo" if sal_min and sal_max else (
                    f"PHP {int(sal_min):,}+/mo" if sal_min else '')
                jobs.append({
                    'source': 'Adzuna',
                    'title': r.get('title', ''),
                    'company': r.get('company', {}).get('display_name', 'Company'),
                    'location': r.get('location', {}).get('display_name', 'Philippines'),
                    'type': 'Full-time', 'salary': salary,
                    'description': (r.get('description', '') or '')[:600],
                    'url': r.get('redirect_url', ''),
                    'category': r.get('category', {}).get('label', ''),
                    'program': '',
                    'posted_at': (r.get('created', '') or '')[:10],
                })
            return jobs if jobs else None
    except Exception:
        pass
    return None


def get_external_jobs_for_course(course='', search_keyword=''):
    """Return real-time external job listings for a given program/course.

    Priority:
    1. JSearch (RapidAPI) — Google Jobs aggregator, most comprehensive, direct apply URLs
    2. Jooble — free job aggregator, good PH coverage, direct job URLs
    3. Adzuna — real PH jobs, direct links
    4. Mock data fallback (when no API keys are configured)

    If search_keyword is provided it overrides the program-based default keyword.
    Configure any API key in backend/.env to get real listings.
    """
    prog = (course or '').upper().strip()
    prog_info = PROGRAM_MAP.get(prog, {})

    if search_keyword:
        keyword = search_keyword + ' Philippines'
    else:
        keyword = prog_info['keywords'][0] if prog_info else 'jobs Philippines'

    # 1. Try JSearch (Google Jobs aggregator) — direct apply URLs
    if os.getenv('JSEARCH_API_KEY'):
        real = fetch_from_jsearch(keyword)
        if real:
            return real

    # 2. Try Jooble — free, good PH coverage, direct job links
    if os.getenv('JOOBLE_API_KEY'):
        real = fetch_from_jooble(keyword)
        if real:
            return real

    # 3. Try Adzuna
    if os.getenv('ADZUNA_APP_ID'):
        real = fetch_from_adzuna(keyword)
        if real:
            return real

    # 4. Fallback: curated mock data with platform search links
    program_jobs = list(MOCK_JOBS_BY_PROGRAM.get(prog, []))
    if not program_jobs:
        all_prog = []
        for jobs in MOCK_JOBS_BY_PROGRAM.values():
            all_prog.extend(jobs[:2])
        random.shuffle(all_prog)
        program_jobs = all_prog[:8]

    fb_post = FACEBOOK_JOBS_BY_PROGRAM.get(prog)
    fb_jobs = [fb_post] if fb_post else []

    return program_jobs + fb_jobs + GENERAL_EXTERNAL_JOBS
