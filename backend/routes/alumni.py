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
        SELECT question_num, question, option_a, option_b, option_c, option_d, category
        FROM ncae_questions
        WHERE program = ?
        ORDER BY question_num
    """, [program_key]).fetchall()

    if not rows:
        return jsonify({'error': f'No questions found for program {program_key}. Please contact admin.'}), 404

    questions = [{
        'num': r['question_num'],
        'question': r['question'],
        'options': {
            'A': r['option_a'],
            'B': r['option_b'],
            'C': r['option_c'],
            'D': r['option_d'],
        },
        'category': r['category'],
    } for r in rows]

    return jsonify({
        'already_completed': False,
        'program': program_key,
        'course': user['course'],
        'total_questions': len(questions),
        'sections': {
            'hard_skills': {'label': 'Hard Skills Aptitude', 'range': '1–20', 'count': 20},
            'soft_skills': {'label': 'Soft Skills Situational Judgment', 'range': '21–35', 'count': 15},
            'specific_skills': {'label': 'Specific Skills Assessment', 'range': '36–50', 'count': 15},
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
    answers = data.get('answers', {})  # {question_num (str or int): 'A'/'B'/'C'/'D'}

    from ncae_data import get_program_key
    program_key = get_program_key(user['course'])

    rows = db.execute("""
        SELECT question_num, correct_answer, category
        FROM ncae_questions WHERE program = ?
    """, [program_key]).fetchall()

    if not rows:
        return jsonify({'error': 'Questions not found for this program'}), 404

    hard_correct = soft_correct = specific_correct = 0
    hard_total = soft_total = specific_total = 0

    for row in rows:
        num = str(row['question_num'])
        submitted = str(answers.get(num, answers.get(int(num), ''))).upper()
        correct = row['correct_answer'].upper()
        cat = row['category']

        if cat == 'hard':
            hard_total += 1
            if submitted == correct:
                hard_correct += 1
        elif cat == 'soft':
            soft_total += 1
            if submitted == correct:
                soft_correct += 1
        else:
            specific_total += 1
            if submitted == correct:
                specific_correct += 1

    hard_score = round(hard_correct / max(hard_total, 1) * 100, 2)
    soft_score = round(soft_correct / max(soft_total, 1) * 100, 2)
    specific_score = round(specific_correct / max(specific_total, 1) * 100, 2)
    total_score = round((hard_correct + soft_correct + specific_correct) / max(len(rows), 1) * 100, 2)

    # Update user skills from NCAE scores
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
          json.dumps(answers)])

    db.commit()

    return jsonify({
        'message': 'Assessment completed successfully',
        'scores': {
            'hard_skills': hard_score,
            'hard_correct': hard_correct,
            'hard_total': hard_total,
            'soft_skills': soft_score,
            'soft_correct': soft_correct,
            'soft_total': soft_total,
            'specific_skills': specific_score,
            'specific_correct': specific_correct,
            'specific_total': specific_total,
            'total': total_score,
        },
        'program': program_key,
    }), 200
