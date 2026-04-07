from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db
from functools import wraps

feedback_bp = Blueprint('feedback', __name__)

STATUS_MAP = {
    'hired': 'Hired via platform',
    'elsewhere': 'Found employment',
    'looking': 'Still looking',
}


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


@feedback_bp.route('', methods=['POST'])
@jwt_required()
def submit_feedback():
    user_id = get_jwt_identity()
    data = request.get_json()
    status_val = data.get('status', '')

    db = get_db()
    db.execute("""
        INSERT INTO feedbacks (user_id, employment_status, company, position, duration, work_setup, employment_type)
        VALUES (?,?,?,?,?,?,?)
    """, [
        user_id, status_val,
        data.get('company', ''), data.get('position', ''),
        data.get('duration', ''), data.get('workSetup', ''),
        data.get('employmentType', ''),
    ])

    # Update employed status based on feedback
    if status_val in ('hired', 'elsewhere'):
        db.execute('UPDATE users SET employed = 1 WHERE id = ?', [user_id])
    elif status_val == 'looking':
        db.execute('UPDATE users SET employed = 0 WHERE id = ?', [user_id])

    db.commit()
    return jsonify({'message': 'Feedback submitted successfully'}), 201


@feedback_bp.route('', methods=['GET'])
@admin_required
def list_feedbacks():
    db = get_db()
    rows = db.execute("""
        SELECT f.*, u.first_name, u.last_name, u.course, u.graduation_year
        FROM feedbacks f
        JOIN users u ON f.user_id = u.id
        ORDER BY f.submitted_at DESC
    """).fetchall()

    STATUS_LABEL = {
        'hired': 'Hired via platform',
        'elsewhere': 'Found employment',
        'looking': 'Still looking',
    }

    feedbacks = [{
        'id': r['id'],
        'name': f"{r['first_name']} {r['last_name']}",
        'course': r['course'],
        'year': r['graduation_year'],
        'status': STATUS_LABEL.get(r['employment_status'], r['employment_status']),
        'company': r['company'],
        'position': r['position'],
        'setup': r['work_setup'],
        'type': r['employment_type'],
        'duration': r['duration'],
        'date': r['submitted_at'][:10] if r['submitted_at'] else '',
    } for r in rows]

    return jsonify({'feedbacks': feedbacks}), 200
