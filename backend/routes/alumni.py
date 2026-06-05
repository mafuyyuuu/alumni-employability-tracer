import json
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db
from routes.jobs import is_job_recommended

alumni_bp = Blueprint('alumni', __name__)


@alumni_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    user_id = get_jwt_identity()
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE id = ?', [user_id]).fetchone()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    keys = user.keys()
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
            'boardPasser': bool(user['board_passer']) if 'board_passer' in keys else False,
            'boardExamScore': float(user['board_exam_score']) if 'board_exam_score' in keys else 0.0,
            'ncaeCompleted': bool(user['ncae_completed']) if 'ncae_completed' in keys else False,
            'monthsToEmployment': user['months_to_employment'] if 'months_to_employment' in keys else None,
            'employed': bool(user['employed']) if 'employed' in keys else False,
            'workPosition': user['work_position'] if 'work_position' in keys else '',
            'employerName': user['employer_name'] if 'employer_name' in keys else '',
            'employmentType': user['employment_type'] if 'employment_type' in keys else '',
        }
    }), 200


@alumni_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    data = request.get_json()
    db = get_db()

    employed_val = data.get('employed')
    employed_int = None
    if employed_val is not None:
        employed_int = 1 if str(employed_val).lower() in ('true', '1', 'yes', 'employed') else 0

    db.execute("""
        UPDATE users SET
            first_name = ?, middle_name = ?, last_name = ?, age = ?,
            work_position = ?, employer_name = ?, employment_type = ?
            {employed_clause}
        WHERE id = ?
    """.format(
        employed_clause=', employed = ?' if employed_int is not None else ''
    ), [
        data.get('firstName', ''), data.get('middleName', ''), data.get('lastName', ''),
        data.get('age', 22),
        data.get('workPosition', ''), data.get('employerName', ''), data.get('employmentType', ''),
    ] + ([employed_int] if employed_int is not None else []) + [user_id])
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


# ── NCAE Assessment ────────────────────────────────────────────────────────

@alumni_bp.route('/ncae', methods=['GET'])
@jwt_required()
def get_ncae_questions():
    user_id = get_jwt_identity()
    db = get_db()
    user = db.execute('SELECT course, ncae_completed FROM users WHERE id = ?', [user_id]).fetchone()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    keys = user.keys()
    ncae_completed = bool(user['ncae_completed']) if 'ncae_completed' in keys else False
    if ncae_completed:
        result = db.execute('SELECT * FROM ncae_results WHERE user_id = ?', [user_id]).fetchone()
        return jsonify({
            'already_completed': True,
            'scores': {
                'hard_skills': result['hard_skills_score'] if result else 0,
                'soft_skills': result['soft_skills_score'] if result else 0,
                'specific_skills': result['specific_skills_score'] if result else 0,
                'total': result['total_score'] if result else 0,
            } if result else None,
        }), 200

    from ncae_data import get_program_key
    program_key = get_program_key(user['course'])

    rows = db.execute("""
        SELECT question_num, question, category
        FROM ncae_questions
        WHERE program = ?
        ORDER BY question_num
    """, [program_key]).fetchall()

    if not rows:
        return jsonify({'error': f'No questions found for program {program_key}. Please contact admin.'}), 404

    # Self-rating format: each item is a statement to rate 1-5
    questions = [{
        'num': r['question_num'],
        'statement': r['question'],
        'category': r['category'],
    } for r in rows]

    return jsonify({
        'already_completed': False,
        'program': program_key,
        'course': user['course'],
        'total_questions': len(questions),
        'rating_scale': {'min': 1, 'max': 5, 'labels': {
            '1': 'Poor', '2': 'Fair', '3': 'Good', '4': 'Very Good', '5': 'Excellent',
        }},
        'sections': {
            'hard': {'label': 'Hard Skills', 'range': '1-20', 'count': 20},
            'soft': {'label': 'Soft Skills', 'range': '21-35', 'count': 15},
            'specific': {'label': 'Specific Skills', 'range': '36-50', 'count': 15},
        },
        'questions': questions,
    }), 200


@alumni_bp.route('/ncae/submit', methods=['POST'])
@jwt_required()
def submit_ncae():
    user_id = get_jwt_identity()
    db = get_db()
    user = db.execute('SELECT course, ncae_completed FROM users WHERE id = ?', [user_id]).fetchone()
    if not user:
        return jsonify({'error': 'User not found'}), 404

    keys = user.keys()
    if 'ncae_completed' in keys and user['ncae_completed']:
        return jsonify({'error': 'Assessment already completed'}), 409

    data = request.get_json()
    # ratings: {question_num (str): 1-5 integer}
    ratings = data.get('ratings', data.get('answers', {}))

    from ncae_data import get_program_key
    program_key = get_program_key(user['course'])

    rows = db.execute("""
        SELECT question_num, category
        FROM ncae_questions WHERE program = ?
    """, [program_key]).fetchall()

    if not rows:
        return jsonify({'error': 'Questions not found for this program'}), 404

    hard_sum = soft_sum = specific_sum = 0
    hard_total = soft_total = specific_total = 0

    for row in rows:
        num = str(row['question_num'])
        rating = int(ratings.get(num, ratings.get(int(num), 0)) or 0)
        rating = max(1, min(5, rating))  # clamp to 1-5
        cat = row['category']

        if cat == 'hard':
            hard_total += 1
            hard_sum += rating
        elif cat == 'soft':
            soft_total += 1
            soft_sum += rating
        else:
            specific_total += 1
            specific_sum += rating

    # Score = sum_of_ratings / (count * 5) * 100  →  0-100 percentage of max
    hard_score     = round(hard_sum     / max(hard_total     * 5, 1) * 100, 2)
    soft_score     = round(soft_sum     / max(soft_total     * 5, 1) * 100, 2)
    specific_score = round(specific_sum / max(specific_total * 5, 1) * 100, 2)
    total_sum      = hard_sum + soft_sum + specific_sum
    total_items    = hard_total + soft_total + specific_total
    total_score    = round(total_sum / max(total_items * 5, 1) * 100, 2)

    # Store avg ratings (out of 5) for the result screen
    hard_avg     = round(hard_sum     / max(hard_total,     1), 2)
    soft_avg     = round(soft_sum     / max(soft_total,     1), 2)
    specific_avg = round(specific_sum / max(specific_total, 1), 2)

    # Update user skills from self-rating scores
    db.execute("""
        UPDATE users SET
            hard_skills = ?,
            soft_skills = ?,
            ncae_completed = 1
        WHERE id = ?
    """, [hard_score, soft_score, user_id])

    # Store detailed results
    db.execute("""
        INSERT INTO ncae_results
            (user_id, program, hard_skills_score, soft_skills_score, specific_skills_score, total_score, answers)
        VALUES (?,?,?,?,?,?,?)
        ON CONFLICT(user_id) DO UPDATE SET
            program=excluded.program,
            hard_skills_score=excluded.hard_skills_score,
            soft_skills_score=excluded.soft_skills_score,
            specific_skills_score=excluded.specific_skills_score,
            total_score=excluded.total_score,
            answers=excluded.answers,
            completed_at=datetime('now')
    """, [user_id, program_key, hard_score, soft_score, specific_score, total_score,
          json.dumps(ratings)])

    db.commit()

    return jsonify({
        'message': 'Assessment completed successfully',
        'scores': {
            'hard_skills': hard_score,
            'hard_avg': hard_avg,
            'hard_total': hard_total,
            'soft_skills': soft_score,
            'soft_avg': soft_avg,
            'soft_total': soft_total,
            'specific_skills': specific_score,
            'specific_avg': specific_avg,
            'specific_total': specific_total,
            'total': total_score,
        },
        'program': program_key,
    }), 200
