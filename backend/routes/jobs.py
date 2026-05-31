from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db
from functools import wraps

BOARD_EXAM_PROGRAMS = {'BSCE', 'BSEE', 'BSME', 'BSECE', 'BSN', 'BSEd', 'BEEd', 'BSA', 'BSCPE'}

# Maps job category labels → matching program codes
CATEGORY_PROGRAM_MAP = {
    'it & software':          ['BSCS', 'BSIT'],
    'software':               ['BSCS', 'BSIT'],
    'it & networks':          ['BSIT', 'BSCPE', 'BSECE'],
    'networks':               ['BSIT', 'BSCPE', 'BSECE'],
    'business & management':  ['BSBA', 'BSHM'],
    'management':             ['BSBA', 'BSHM'],
    'finance & accounting':   ['BSA', 'BSBA'],
    'accounting':             ['BSA'],
    'finance':                ['BSA', 'BSBA'],
    'healthcare & nursing':   ['BSN'],
    'nursing':                ['BSN'],
    'healthcare':             ['BSN'],
    'hospitality & tourism':  ['BSHM'],
    'hospitality':            ['BSHM'],
    'tourism':                ['BSHM'],
    'food & beverage':        ['BSHM'],
    'education':              ['BSEd', 'BEEd'],
    'teaching':               ['BSEd', 'BEEd'],
    'engineering':            ['BSCPE', 'BSECE', 'BSCE'],
    'electronics':            ['BSECE', 'BSCPE'],
    'civil engineering':      ['BSCE'],
    'computer engineering':   ['BSCPE'],
}

# Title/description keyword fallbacks per program
KEYWORD_MAP = {
    'BSCS':  ['software', 'developer', 'web', 'data scientist', 'data analyst', 'programmer',
               'backend', 'frontend', 'fullstack', 'full-stack', 'machine learning', 'ai engineer'],
    'BSIT':  ['it support', 'tech support', 'network', 'helpdesk', 'systems admin',
               'database admin', 'it admin', 'it officer', 'system analyst', 'it specialist'],
    'BSBA':  ['business analyst', 'marketing', 'sales', 'hr officer', 'human resource',
               'operations', 'business development', 'project manager'],
    'BSA':   ['accountant', 'auditor', 'bookkeeper', 'cpa', 'tax', 'financial analyst',
               'accounting', 'finance officer', 'accounts payable', 'accounts receivable'],
    'BSHM':  ['hotel', 'hospitality', 'tourism', 'front desk', 'restaurant', 'food',
               'housekeeping', 'banquet', 'events coordinator', 'guest service'],
    'BSEd':  ['teacher', 'instructor', 'tutor', 'educator', 'academic', 'school',
               'faculty', 'learning', 'curriculum', 'professor'],
    'BEEd':  ['elementary teacher', 'primary teacher', 'grade school', 'kinder teacher',
               'tutor', 'instructor', 'educator'],
    'BSN':   ['nurse', 'nursing', 'healthcare', 'hospital', 'medical', 'clinical',
               'patient care', 'ward nurse', 'staff nurse', 'company nurse', 'rn'],
    'BSCE':  ['civil engineer', 'construction', 'infrastructure', 'structural', 'site engineer',
               'project engineer', 'quantity surveyor'],
    'BSECE': ['electronics engineer', 'ece', 'embedded', 'telecommunications', 'rf engineer',
               'signal', 'communications engineer'],
    'BSCPE': ['computer engineer', 'hardware', 'firmware', 'fpga', 'embedded systems',
               'systems engineer', 'pcb', 'circuit design'],
}


def is_job_recommended(title, category, course):
    course_upper = (course or '').upper().strip()
    if not course_upper:
        return False

    # 1. Direct category-to-program match (most reliable)
    cat_lower = (category or '').lower().strip()
    for cat_key, programs in CATEGORY_PROGRAM_MAP.items():
        if cat_key in cat_lower and course_upper in programs:
            return True

    # 2. Title keyword match for the specific program
    title_lower = (title or '').lower()
    keywords = KEYWORD_MAP.get(course_upper, [])
    if any(kw in title_lower for kw in keywords):
        return True

    return False

jobs_bp = Blueprint('jobs', __name__)

COLORS = ['#6366f1', '#0ea5e9', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#2d6a4f']


def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        uid = get_jwt_identity()
        db = get_db()
        user = db.execute('SELECT role FROM users WHERE id = ?', [uid]).fetchone()
        if not user or user['role'] != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return fn(*args, **kwargs)
    return wrapper


def job_row(row, idx=0, user_data=None):
    title = row['title']
    category = row['category'] if 'category' in row.keys() else ''
    course = user_data['course'] if user_data else ''
    
    required_hard = float(row['required_hard_skills']) if 'required_hard_skills' in row.keys() else 60.0
    required_soft = float(row['required_soft_skills']) if 'required_soft_skills' in row.keys() else 60.0
    
    skill_match = 0
    if user_data:
        user_hard = float(user_data['hard_skills'] or 0)
        user_soft = float(user_data['soft_skills'] or 0)
        
        # Simple weighted average match
        hard_match = min(1.0, user_hard / required_hard) if required_hard > 0 else 1.0
        soft_match = min(1.0, user_soft / required_soft) if required_soft > 0 else 1.0
        skill_match = round((hard_match * 0.7 + soft_match * 0.3) * 100)

    return {
        'id': row['id'],
        'title': title,
        'company': row['company_name'],
        'company_id': row['company_id'],
        'type': row['type'],
        'location': row['location'],
        'salary': row['salary'],
        'description': row['description'],
        'category': category,
        'status': row['status'],
        'posted': row['posted_at'][:10] if row['posted_at'] else '',
        'color': COLORS[idx % len(COLORS)],
        'source': 'Platform',
        'recommended': is_job_recommended(title, category, course) or (skill_match >= 85),
        'skill_match': skill_match,
        'required_skills': {
            'hard': required_hard,
            'soft': required_soft
        }
    }


@jobs_bp.route('', methods=['GET'])
@jwt_required()
def list_jobs():
    user_id = get_jwt_identity()
    db = get_db()

    # Get user's course and skills for program-based recommendations and matching
    user = db.execute('SELECT course, hard_skills, soft_skills FROM users WHERE id = ?', [user_id]).fetchone()
    user_data = {
        'course': (request.args.get('course') or (user['course'] if user else '')) or '',
        'hard_skills': user['hard_skills'] if user else 0,
        'soft_skills': user['soft_skills'] if user else 0
    }

    search = request.args.get('search', '').lower()
    location = request.args.get('location', '').lower()
    job_type = request.args.get('type', '')
    status = request.args.get('status', 'Open')

    query = "SELECT * FROM jobs WHERE 1=1"
    params = []
    if status:
        query += " AND status = ?"
        params.append(status)
    if search:
        query += " AND (LOWER(title) LIKE ? OR LOWER(company_name) LIKE ?)"
        params += [f'%{search}%', f'%{search}%']
    if location:
        query += " AND LOWER(location) LIKE ?"
        params.append(f'%{location}%')
    if job_type:
        query += " AND type = ?"
        params.append(job_type)

    query += " ORDER BY posted_at DESC"
    rows = db.execute(query, params).fetchall()
    jobs = [job_row(r, i, user_data) for i, r in enumerate(rows)]
    return jsonify({'jobs': jobs, 'total': len(jobs), 'course': user_data['course']}), 200


@jobs_bp.route('/saved', methods=['GET'])
@jwt_required()
def get_saved():
    user_id = get_jwt_identity()
    db = get_db()
    rows = db.execute("""
        SELECT j.*, sj.saved_at FROM jobs j
        JOIN saved_jobs sj ON j.id = sj.job_id
        WHERE sj.user_id = ?
        ORDER BY sj.saved_at DESC
    """, [user_id]).fetchall()
    jobs = [job_row(r, i) for i, r in enumerate(rows)]
    return jsonify({'jobs': jobs}), 200


@jobs_bp.route('/<int:job_id>/save', methods=['POST'])
@jwt_required()
def save_job(job_id):
    user_id = get_jwt_identity()
    db = get_db()
    try:
        db.execute(
            'INSERT INTO saved_jobs (user_id, job_id) VALUES (?, ?)',
            [user_id, job_id]
        )
        db.commit()
        return jsonify({'message': 'Job saved'}), 201
    except Exception:
        return jsonify({'error': 'Already saved or job not found'}), 409


@jobs_bp.route('/<int:job_id>/save', methods=['DELETE'])
@jwt_required()
def unsave_job(job_id):
    user_id = get_jwt_identity()
    db = get_db()
    db.execute(
        'DELETE FROM saved_jobs WHERE user_id = ? AND job_id = ?',
        [user_id, job_id]
    )
    db.commit()
    return jsonify({'message': 'Job removed from saved'}), 200



def company_or_admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        uid = get_jwt_identity()
        db = get_db()
        user = db.execute('SELECT role FROM users WHERE id = ?', [uid]).fetchone()
        if not user or user['role'] not in ('admin', 'company'):
            return jsonify({'error': 'Company or admin access required'}), 403
        return fn(*args, **kwargs)
    return wrapper


def _notify_matching_alumni(db, job_id, title, category, company_name):
    """Send a notification to every alumni whose course matches the new job."""
    cat_lower = (category or '').lower().strip()
    title_lower = (title or '').lower()

    # Collect all program codes that match this job
    matched_programs = set()
    for cat_key, programs in CATEGORY_PROGRAM_MAP.items():
        if cat_key in cat_lower:
            matched_programs.update(programs)

    # Also match via title keywords
    for prog, keywords in KEYWORD_MAP.items():
        if any(kw in title_lower for kw in keywords):
            matched_programs.add(prog)

    if not matched_programs:
        return 0

    placeholders = ','.join('?' * len(matched_programs))
    alumni = db.execute(
        f"SELECT id, course FROM users WHERE role = 'alumni' AND UPPER(TRIM(course)) IN ({placeholders})",
        list(matched_programs),
    ).fetchall()

    count = 0
    for a in alumni:
        db.execute(
            """INSERT INTO notifications (user_id, title, message)
               VALUES (?, ?, ?)""",
            [a['id'],
             f'New Job Match: {title}',
             f'{company_name} posted "{title}" — it matches your {a["course"]} program. Check Browse Jobs now!'],
        )
        count += 1
    return count


@jobs_bp.route('', methods=['POST'])
@company_or_admin_required
def create_job():
    data = request.get_json()
    db = get_db()
    title = data.get('title', '')
    category = data.get('category', '')
    company_name = data.get('company', '')
    cur = db.execute("""
        INSERT INTO jobs (title, company_id, company_name, type, location, salary, description, category, status)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, [
        title, data.get('company_id'), company_name,
        data.get('type', 'Full-time'), data.get('location', ''),
        data.get('salary', ''), data.get('description', ''),
        category, data.get('status', 'Open'),
    ])
    db.commit()
    # Notify matching alumni about the new job posting
    if data.get('status', 'Open') == 'Open':
        notified = _notify_matching_alumni(db, cur.lastrowid, title, category, company_name)
        db.commit()
    return jsonify({'message': 'Job created', 'id': cur.lastrowid}), 201


@jobs_bp.route('/<int:job_id>', methods=['PUT'])
@admin_required
def update_job(job_id):
    data = request.get_json()
    db = get_db()
    db.execute("""
        UPDATE jobs SET title=?, company_name=?, type=?, location=?, salary=?, status=?
        WHERE id=?
    """, [
        data.get('title'), data.get('company'), data.get('type'),
        data.get('location'), data.get('salary'), data.get('status'), job_id,
    ])
    db.commit()
    return jsonify({'message': 'Job updated'}), 200


@jobs_bp.route('/<int:job_id>', methods=['DELETE'])
@admin_required
def delete_job(job_id):
    db = get_db()
    db.execute('DELETE FROM jobs WHERE id = ?', [job_id])
    db.execute('DELETE FROM saved_jobs WHERE job_id = ?', [job_id])
    db.execute('DELETE FROM job_applications WHERE job_id = ?', [job_id])
    db.commit()
    return jsonify({'message': 'Job deleted'}), 200


# ── Job Applications ──────────────────────────────────────────────────────────

@jobs_bp.route('/<int:job_id>/apply', methods=['POST'])
@jwt_required()
def apply_job(job_id):
    user_id = get_jwt_identity()
    db = get_db()

    user = db.execute("SELECT role FROM users WHERE id = ?", [user_id]).fetchone()
    if not user or user['role'] != 'alumni':
        return jsonify({'error': 'Only alumni can apply for jobs'}), 403

    job = db.execute("SELECT * FROM jobs WHERE id = ? AND status = 'Open'", [job_id]).fetchone()
    if not job:
        return jsonify({'error': 'Job not found or not open'}), 404

    data = request.get_json(silent=True) or {}
    cover_letter = data.get('cover_letter', '')

    try:
        db.execute(
            "INSERT INTO job_applications (user_id, job_id, cover_letter) VALUES (?, ?, ?)",
            [user_id, job_id, cover_letter],
        )
        db.commit()
    except Exception:
        return jsonify({'error': 'You have already applied for this job'}), 409

    # Notify company users linked to this job
    applicant = db.execute(
        "SELECT first_name, last_name, course FROM users WHERE id = ?", [user_id]
    ).fetchone()
    applicant_name = f"{applicant['first_name']} {applicant['last_name']}".strip() if applicant else 'An alumni'
    course = applicant['course'] if applicant else ''
    if job['company_id']:
        company_users = db.execute(
            "SELECT id FROM users WHERE company_id = ? AND role = 'company'",
            [job['company_id']]
        ).fetchall()
        for cu in company_users:
            db.execute(
                "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)",
                [cu['id'],
                 f'New Application: {job["title"]}',
                 f'{applicant_name} ({course}) applied for "{job["title"]}". Review in Job Postings.']
            )
        db.commit()

    return jsonify({'message': 'Application submitted'}), 201


@jobs_bp.route('/applications', methods=['GET'])
@jwt_required()
def my_applications():
    user_id = get_jwt_identity()
    db = get_db()
    rows = db.execute("""
        SELECT ja.id, ja.status, ja.cover_letter, ja.applied_at, ja.updated_at,
               j.id AS job_id, j.title, j.company_name AS company, j.type,
               j.location, j.salary, j.category, j.status AS job_status
        FROM job_applications ja
        JOIN jobs j ON ja.job_id = j.id
        WHERE ja.user_id = ?
        ORDER BY ja.applied_at DESC
    """, [user_id]).fetchall()
    return jsonify({'applications': [dict(r) for r in rows]}), 200


@jobs_bp.route('/applications/<int:app_id>', methods=['DELETE'])
@jwt_required()
def withdraw_application(app_id):
    user_id = get_jwt_identity()
    db = get_db()
    app_row = db.execute(
        "SELECT * FROM job_applications WHERE id = ? AND user_id = ?", [app_id, user_id]
    ).fetchone()
    if not app_row:
        return jsonify({'error': 'Application not found'}), 404
    if app_row['status'] not in ('Pending',):
        return jsonify({'error': 'Cannot withdraw an application that has been reviewed'}), 400

    db.execute("DELETE FROM job_applications WHERE id = ?", [app_id])
    db.commit()
    return jsonify({'message': 'Application withdrawn'}), 200


@jobs_bp.route('/applications/<int:app_id>/status', methods=['PUT'])
@company_or_admin_required
def update_application_status(app_id):
    db = get_db()
    data = request.get_json() or {}
    new_status = data.get('status', '')
    if new_status not in ('Accepted', 'Rejected', 'Pending'):
        return jsonify({'error': 'Status must be Accepted, Rejected, or Pending'}), 400

    app_row = db.execute(
        "SELECT ja.*, j.title, j.company_name FROM job_applications ja JOIN jobs j ON ja.job_id = j.id WHERE ja.id = ?",
        [app_id]
    ).fetchone()
    if not app_row:
        return jsonify({'error': 'Application not found'}), 404

    db.execute(
        "UPDATE job_applications SET status = ?, updated_at = datetime('now') WHERE id = ?",
        [new_status, app_id],
    )
    # Notify the applicant
    msg = (
        f'Your application for "{app_row["title"]}" at {app_row["company_name"]} has been {new_status.lower()}.'
    )
    db.execute(
        "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)",
        [app_row['user_id'], f'Application {new_status}', msg],
    )
    db.commit()
    return jsonify({'message': f'Application marked as {new_status}'}), 200


@jobs_bp.route('/<int:job_id>/applicants', methods=['GET'])
@company_or_admin_required
def job_applicants(job_id):
    db = get_db()
    rows = db.execute("""
        SELECT ja.id, ja.status, ja.cover_letter, ja.applied_at,
               u.id AS user_id, u.first_name, u.last_name, u.email,
               u.course, u.graduation_year, u.avg_grade, u.soft_skills, u.hard_skills
        FROM job_applications ja
        JOIN users u ON ja.user_id = u.id
        WHERE ja.job_id = ?
        ORDER BY ja.applied_at DESC
    """, [job_id]).fetchall()
    return jsonify({'applicants': [dict(r) for r in rows], 'total': len(rows)}), 200
