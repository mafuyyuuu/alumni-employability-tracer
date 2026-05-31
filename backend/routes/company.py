from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db
from functools import wraps
import bcrypt
from routes.jobs import _notify_matching_alumni

company_bp = Blueprint('company', __name__)


def company_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        uid = get_jwt_identity()
        db = get_db()
        user = db.execute('SELECT role FROM users WHERE id = ?', [uid]).fetchone()
        if not user or user['role'] != 'company':
            return jsonify({'error': 'Company access required'}), 403
        return fn(*args, **kwargs)
    return wrapper


def _company_user(db, user_id):
    return db.execute("""
        SELECT u.*, c.name AS company_name, c.industry, c.location AS company_location,
               c.size, c.description AS company_description, c.status AS company_status
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.id
        WHERE u.id = ? AND u.role = 'company'
    """, [user_id]).fetchone()


@company_bp.route('/dashboard', methods=['GET'])
@company_required
def dashboard():
    user_id = get_jwt_identity()
    db = get_db()
    user = _company_user(db, user_id)
    if not user:
        return jsonify({'error': 'Company user not found'}), 404

    company_id = user['company_id']

    total_jobs = 0
    open_jobs = 0
    closed_jobs = 0
    recent_jobs = []

    if company_id:
        total_jobs = db.execute(
            'SELECT COUNT(*) FROM jobs WHERE company_id = ?', [company_id]
        ).fetchone()[0]
        open_jobs = db.execute(
            "SELECT COUNT(*) FROM jobs WHERE company_id = ? AND status = 'Open'", [company_id]
        ).fetchone()[0]
        closed_jobs = total_jobs - open_jobs
        rows = db.execute(
            'SELECT * FROM jobs WHERE company_id = ? ORDER BY posted_at DESC LIMIT 5', [company_id]
        ).fetchall()
        recent_jobs = [dict(r) for r in rows]

    return jsonify({
        'company_name': user['company_name'] or '',
        'industry': user['industry'] or '',
        'location': user['company_location'] or '',
        'stats': {
            'total_jobs': total_jobs,
            'open_jobs': open_jobs,
            'closed_jobs': closed_jobs,
        },
        'recent_jobs': recent_jobs,
    }), 200


@company_bp.route('/jobs', methods=['GET'])
@company_required
def list_jobs():
    user_id = get_jwt_identity()
    db = get_db()
    user = _company_user(db, user_id)
    if not user or not user['company_id']:
        return jsonify({'jobs': []}), 200

    search = request.args.get('search', '').lower()
    status = request.args.get('status', '')
    company_id = user['company_id']

    query = 'SELECT * FROM jobs WHERE company_id = ?'
    params = [company_id]
    if status:
        query += ' AND status = ?'
        params.append(status)
    if search:
        query += ' AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ?)'
        params += [f'%{search}%', f'%{search}%']
    query += ' ORDER BY posted_at DESC'

    rows = db.execute(query, params).fetchall()
    jobs = [dict(r) for r in rows]
    return jsonify({'jobs': jobs, 'total': len(jobs)}), 200


@company_bp.route('/jobs', methods=['POST'])
@company_required
def create_job():
    user_id = get_jwt_identity()
    db = get_db()
    user = _company_user(db, user_id)
    if not user or not user['company_id']:
        return jsonify({'error': 'No company linked to this account'}), 400

    data = request.get_json()
    company_id = user['company_id']
    company_name = user['company_name'] or data.get('company', '')

    title = data.get('title', '')
    category = data.get('category', '')
    status = data.get('status', 'Open')
    cur = db.execute("""
        INSERT INTO jobs (title, company_id, company_name, type, location, salary, description, category, status)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, [
        title, company_id, company_name,
        data.get('type', 'Full-time'), data.get('location', ''),
        data.get('salary', ''), data.get('description', ''),
        category, status,
    ])
    db.commit()
    if status == 'Open':
        _notify_matching_alumni(db, cur.lastrowid, title, category, company_name)
        db.commit()
    return jsonify({'message': 'Job posted', 'id': cur.lastrowid}), 201


@company_bp.route('/jobs/<int:job_id>', methods=['PUT'])
@company_required
def update_job(job_id):
    user_id = get_jwt_identity()
    db = get_db()
    user = _company_user(db, user_id)
    if not user or not user['company_id']:
        return jsonify({'error': 'No company linked to this account'}), 400

    job = db.execute('SELECT * FROM jobs WHERE id = ? AND company_id = ?',
                     [job_id, user['company_id']]).fetchone()
    if not job:
        return jsonify({'error': 'Job not found or not yours'}), 404

    data = request.get_json()
    db.execute("""
        UPDATE jobs SET title=?, type=?, location=?, salary=?, description=?, category=?, status=?
        WHERE id=?
    """, [
        data.get('title', job['title']),
        data.get('type', job['type']),
        data.get('location', job['location']),
        data.get('salary', job['salary']),
        data.get('description', job['description']),
        data.get('category', job['category']),
        data.get('status', job['status']),
        job_id,
    ])
    db.commit()
    return jsonify({'message': 'Job updated'}), 200


@company_bp.route('/jobs/<int:job_id>', methods=['DELETE'])
@company_required
def delete_job(job_id):
    user_id = get_jwt_identity()
    db = get_db()
    user = _company_user(db, user_id)
    if not user or not user['company_id']:
        return jsonify({'error': 'No company linked to this account'}), 400

    job = db.execute('SELECT id FROM jobs WHERE id = ? AND company_id = ?',
                     [job_id, user['company_id']]).fetchone()
    if not job:
        return jsonify({'error': 'Job not found or not yours'}), 404

    db.execute('DELETE FROM jobs WHERE id = ?', [job_id])
    db.execute('DELETE FROM saved_jobs WHERE job_id = ?', [job_id])
    db.execute('DELETE FROM job_applications WHERE job_id = ?', [job_id])
    db.commit()
    return jsonify({'message': 'Job deleted'}), 200


@company_bp.route('/jobs/<int:job_id>/applicants', methods=['GET'])
@company_required
def job_applicants(job_id):
    user_id = get_jwt_identity()
    db = get_db()
    user = _company_user(db, user_id)
    if not user or not user['company_id']:
        return jsonify({'error': 'No company linked'}), 400

    job = db.execute('SELECT id, title FROM jobs WHERE id = ? AND company_id = ?',
                     [job_id, user['company_id']]).fetchone()
    if not job:
        return jsonify({'error': 'Job not found or not yours'}), 404

    rows = db.execute("""
        SELECT ja.id, ja.status, ja.cover_letter, ja.applied_at,
               u.id AS user_id, u.first_name, u.last_name, u.email,
               u.course, u.graduation_year, u.avg_grade, u.soft_skills, u.hard_skills
        FROM job_applications ja
        JOIN users u ON ja.user_id = u.id
        WHERE ja.job_id = ?
        ORDER BY ja.applied_at DESC
    """, [job_id]).fetchall()
    return jsonify({'job_title': job['title'], 'applicants': [dict(r) for r in rows], 'total': len(rows)}), 200


@company_bp.route('/applications/<int:app_id>/status', methods=['PUT'])
@company_required
def update_application_status(app_id):
    user_id = get_jwt_identity()
    db = get_db()
    user = _company_user(db, user_id)
    if not user or not user['company_id']:
        return jsonify({'error': 'No company linked'}), 400

    data = request.get_json() or {}
    new_status = data.get('status', '')
    if new_status not in ('Accepted', 'Rejected', 'Pending'):
        return jsonify({'error': 'Invalid status'}), 400

    app_row = db.execute("""
        SELECT ja.*, j.title, j.company_name
        FROM job_applications ja
        JOIN jobs j ON ja.job_id = j.id
        WHERE ja.id = ? AND j.company_id = ?
    """, [app_id, user['company_id']]).fetchone()
    if not app_row:
        return jsonify({'error': 'Application not found'}), 404

    db.execute(
        "UPDATE job_applications SET status = ?, updated_at = datetime('now') WHERE id = ?",
        [new_status, app_id],
    )
    msg = f'Your application for "{app_row["title"]}" at {app_row["company_name"]} has been {new_status.lower()}.'
    db.execute(
        "INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)",
        [app_row['user_id'], f'Application {new_status}', msg],
    )
    db.commit()
    return jsonify({'message': f'Application marked as {new_status}'}), 200


@company_bp.route('/profile', methods=['GET'])
@company_required
def get_profile():
    user_id = get_jwt_identity()
    db = get_db()
    user = _company_user(db, user_id)
    if not user:
        return jsonify({'error': 'Not found'}), 404

    return jsonify({
        'id': user['id'],
        'first_name': user['first_name'],
        'last_name': user['last_name'],
        'email': user['email'],
        'company_id': user['company_id'],
        'company_name': user['company_name'] or '',
        'industry': user['industry'] or '',
        'location': user['company_location'] or '',
        'size': user['size'] or '',
        'description': user['company_description'] or '',
        'company_status': user['company_status'] or 'Active',
    }), 200


@company_bp.route('/profile', methods=['PUT'])
@company_required
def update_profile():
    user_id = get_jwt_identity()
    db = get_db()
    user = _company_user(db, user_id)
    if not user:
        return jsonify({'error': 'Not found'}), 404

    data = request.get_json()

    # Update user name/email
    db.execute("""
        UPDATE users SET first_name=?, last_name=?, email=?
        WHERE id=?
    """, [
        data.get('first_name', user['first_name']),
        data.get('last_name', user['last_name']),
        data.get('email', user['email']),
        user_id,
    ])

    # Update company info if linked
    if user['company_id']:
        db.execute("""
            UPDATE companies SET name=?, industry=?, location=?, size=?, description=?
            WHERE id=?
        """, [
            data.get('company_name', user['company_name'] or ''),
            data.get('industry', user['industry'] or ''),
            data.get('location', user['company_location'] or ''),
            data.get('size', user['size'] or ''),
            data.get('description', user['company_description'] or ''),
            user['company_id'],
        ])

    db.commit()
    return jsonify({'message': 'Profile updated'}), 200


@company_bp.route('/change-password', methods=['PUT'])
@company_required
def change_password():
    user_id = get_jwt_identity()
    db = get_db()
    data = request.get_json()
    current = data.get('current_password', '')
    new_pw = data.get('new_password', '')

    if not current or not new_pw or len(new_pw) < 6:
        return jsonify({'error': 'Invalid password data'}), 400

    user = db.execute('SELECT password_hash FROM users WHERE id = ?', [user_id]).fetchone()
    if not user or not bcrypt.checkpw(current.encode(), user['password_hash'].encode()):
        return jsonify({'error': 'Current password is incorrect'}), 401

    new_hash = bcrypt.hashpw(new_pw.encode(), bcrypt.gensalt()).decode()
    db.execute('UPDATE users SET password_hash=? WHERE id=?', [new_hash, user_id])
    db.commit()
    return jsonify({'message': 'Password changed'}), 200
