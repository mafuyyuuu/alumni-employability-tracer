from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db
from functools import wraps
from services.job_fetcher import get_external_jobs_for_course, is_job_recommended, SOURCE_COLORS, get_source_color

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


def job_row(row, idx=0, course=''):
    title = row['title']
    category = row['category'] if 'category' in row.keys() else ''
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
        'recommended': is_job_recommended(title, category, course) if course else False,
    }


@jobs_bp.route('', methods=['GET'])
@jwt_required()
def list_jobs():
    user_id = get_jwt_identity()
    db = get_db()

    # Get user's course for program-based recommendations
    user = db.execute('SELECT course FROM users WHERE id = ?', [user_id]).fetchone()
    course = request.args.get('course', user['course'] if user else '') or ''

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
    jobs = [job_row(r, i, course) for i, r in enumerate(rows)]
    return jsonify({'jobs': jobs, 'total': len(jobs), 'course': course}), 200


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


@jobs_bp.route('/external', methods=['GET'])
@jwt_required()
def list_external_jobs():
    """Fetch jobs from external sources (Adzuna API or curated mock data) filtered by program."""
    user_id = get_jwt_identity()
    db = get_db()
    user = db.execute('SELECT course FROM users WHERE id = ?', [user_id]).fetchone()
    course = request.args.get('course', user['course'] if user else '') or ''
    search_keyword = request.args.get('keyword', '').strip()

    jobs = get_external_jobs_for_course(course, search_keyword=search_keyword)

    # Add source color and sequential IDs for frontend keys
    result = []
    for i, j in enumerate(jobs):
        result.append({
            'id': f"ext-{i}",
            'title': j.get('title', ''),
            'company': j.get('company', ''),
            'location': j.get('location', 'Philippines'),
            'type': j.get('type', 'Full-time'),
            'salary': j.get('salary', ''),
            'description': j.get('description', ''),
            'url': j.get('url', ''),
            'source': j.get('source', 'External'),
            'source_color': get_source_color(j.get('source', '')),
            'category': j.get('category', ''),
            'program': j.get('program', ''),
            'posted': j.get('posted_at', ''),
            'recommended': j.get('program', '') == course.upper() or
                           (j.get('program', '') == '' and is_job_recommended(j.get('title', ''), j.get('category', ''), course)),
        })

    return jsonify({'jobs': result, 'course': course, 'total': len(result)}), 200


@jobs_bp.route('', methods=['POST'])
@admin_required
def create_job():
    data = request.get_json()
    db = get_db()
    cur = db.execute("""
        INSERT INTO jobs (title, company_id, company_name, type, location, salary, description, status)
        VALUES (?,?,?,?,?,?,?,?)
    """, [
        data.get('title'), data.get('company_id'), data.get('company'),
        data.get('type', 'Full-time'), data.get('location', ''),
        data.get('salary', ''), data.get('description', ''),
        data.get('status', 'Open'),
    ])
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
    db.commit()
    return jsonify({'message': 'Job deleted'}), 200
