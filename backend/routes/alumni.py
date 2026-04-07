from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db
from services.job_fetcher import is_job_recommended

alumni_bp = Blueprint('alumni', __name__)


@alumni_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE id = ?', [user_id]).fetchone()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({
        'profile': {
            'id': user['id'],
            'firstName': user['first_name'],
            'middleName': user['middle_name'],
            'lastName': user['last_name'],
            'email': user['email'],
            'age': user['age'],
            'degree': user['course'],
            'avgGrade': user['avg_grade'],
            'avgProfGrade': user['avg_prof_grade'],
            'avgElecGrade': user['avg_elec_grade'],
            'ojtGrade': user['ojt_grade'],
            'softSkills': user['soft_skills'],
            'hardSkills': user['hard_skills'],
        }
    }), 200


@alumni_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    data = request.get_json()
    db = get_db()

    db.execute("""
        UPDATE users SET
            first_name = ?, middle_name = ?, last_name = ?,
            age = ?, course = ?,
            avg_grade = ?, avg_prof_grade = ?, avg_elec_grade = ?,
            ojt_grade = ?, soft_skills = ?, hard_skills = ?
        WHERE id = ?
    """, [
        data.get('firstName', ''), data.get('middleName', ''), data.get('lastName', ''),
        data.get('age', 22), data.get('degree', ''),
        data.get('avgGrade', 0), data.get('avgProfGrade', 0), data.get('avgElecGrade', 0),
        data.get('ojtGrade', 0), data.get('softSkills', 0), data.get('hardSkills', 0),
        user_id,
    ])
    db.commit()
    return jsonify({'message': 'Profile updated successfully'}), 200


@alumni_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    user_id = get_jwt_identity()
    db = get_db()

    user = db.execute('SELECT course FROM users WHERE id = ?', [user_id]).fetchone()
    course = user['course'] if user else ''

    saved_count = db.execute(
        'SELECT COUNT(*) as cnt FROM saved_jobs WHERE user_id = ?', [user_id]
    ).fetchone()['cnt']

    notif_count = db.execute(
        'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0', [user_id]
    ).fetchone()['cnt']

    # Fetch recent open jobs, then sort: course-matched first
    rows = db.execute("""
        SELECT j.* FROM jobs j
        WHERE j.status = 'Open'
        ORDER BY j.posted_at DESC LIMIT 20
    """).fetchall()

    colors = ['#6366f1', '#0ea5e9', '#f59e0b', '#10b981', '#8b5cf6']

    def to_dict(j, idx):
        return {
            'id': j['id'],
            'title': j['title'],
            'company': j['company_name'],
            'location': j['location'],
            'type': j['type'],
            'salary': j['salary'],
            'category': j['category'] if 'category' in j.keys() else '',
            'color': colors[idx % len(colors)],
            'recommended': is_job_recommended(j['title'], j['category'] if 'category' in j.keys() else '', course),
        }

    all_jobs = [to_dict(j, i) for i, j in enumerate(rows)]

    # Only show course-matched jobs
    matched = [j for j in all_jobs if j['recommended']]
    latest_jobs = matched[:4]
    recommended_jobs = matched[:5]

    return jsonify({
        'saved_jobs_count': saved_count,
        'notifications_count': notif_count,
        'latest_jobs': latest_jobs,
        'recommended_jobs': recommended_jobs,
        'course': course,
    }), 200
