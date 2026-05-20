import os
import hashlib
import random
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db
from ml.arima_model import run_arima_forecast, parse_order
from ml.train_lr import run_lr_forecast
from ml.rf_forecast import run_rf_forecast
from ml.predictor import (
    predict_employability_details,
    predictor_feature_importance,
    predictor_status,
    ml_predictor,
)
from ml.dataset_importer import (
    import_first_clean_dataset as import_first_clean_dataset_rows,
    import_training_csv,
)
from ml.train_rf import train_random_forest
from ml.train_employability_lr import train_linear_employability
from functools import wraps

admin_bp = Blueprint('admin', __name__)


def _send_welcome_email(to_email, name, password):
    smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_user = os.environ.get('SMTP_USER', '')
    smtp_pass = os.environ.get('SMTP_PASS', '')
    smtp_from = os.environ.get('SMTP_FROM', smtp_user)
    if not smtp_user or not smtp_pass:
        return False, 'SMTP not configured'
    msg = MIMEMultipart('alternative')
    msg['Subject'] = 'Your PLP Alumni Portal Account'
    msg['From'] = smtp_from
    msg['To'] = to_email
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
      <div style="background:#163d22;border-radius:8px;padding:18px 24px;margin-bottom:20px">
        <h2 style="color:#fff;margin:0;font-size:18px">PLP Alumni Employability Portal</h2>
        <p style="color:#b7e4c7;margin:4px 0 0;font-size:13px">Pamantasan ng Lungsod ng Pasig</p>
      </div>
      <p style="color:#374151;font-size:14px">Hello <strong>{name}</strong>,</p>
      <p style="color:#374151;font-size:14px">Your alumni account has been created. Use the credentials below to log in:</p>
      <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0">
        <p style="margin:0 0 8px;font-size:13px;color:#6b7280">Email</p>
        <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#111827">{to_email}</p>
        <p style="margin:0 0 8px;font-size:13px;color:#6b7280">Temporary Password</p>
        <p style="margin:0;font-size:18px;font-weight:900;color:#163d22;letter-spacing:2px">{password}</p>
      </div>
      <p style="color:#6b7280;font-size:12px">Please change your password after your first login. If you did not expect this email, please contact your administrator.</p>
    </div>
    """
    msg.attach(MIMEText(html, 'html'))
    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_from, to_email, msg.as_string())
        return True, None
    except Exception as e:
        return False, str(e)


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


def _alumni_features_from_db(db, user_id):
    row = db.execute("""
        SELECT
            course,
            graduation_year,
            age,
            avg_grade,
            avg_prof_grade,
            avg_elec_grade,
            ojt_grade,
            soft_skills,
            hard_skills,
            board_passer,
            board_exam_score
        FROM users
        WHERE id = ? AND role = 'alumni'
    """, [user_id]).fetchone()
    if not row:
        return None
    keys = row.keys()
    return {
        'course': row['course'],
        'graduation_year': row['graduation_year'],
        'age': row['age'],
        'avg_grade': row['avg_grade'],
        'avg_prof_grade': row['avg_prof_grade'],
        'avg_elec_grade': row['avg_elec_grade'],
        'ojt_grade': row['ojt_grade'],
        'soft_skills': row['soft_skills'],
        'hard_skills': row['hard_skills'],
        'board_passer': int(row['board_passer']) if 'board_passer' in keys else 0,
        'board_exam_score': float(row['board_exam_score']) if 'board_exam_score' in keys else 0.0,
    }


def _file_sha256(path):
    digest = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            digest.update(chunk)
    return digest.hexdigest()


def _clamp(value, lo=0.0, hi=1.0):
    return max(lo, min(hi, value))


def _to_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def _is_truthy(value, default=False):
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    text = str(value).strip().lower()
    if text in ('1', 'true', 'yes', 'on'):
        return True
    if text in ('0', 'false', 'no', 'off'):
        return False
    return default


def _feature_number(features, *keys, default=0.0):
    for key in keys:
        if key in features and features[key] is not None:
            return _to_float(features[key], default)
    return float(default)


def _format_percent_metric(value):
    return f"{value}%" if isinstance(value, (int, float)) else str(value)


def _normalize_grade(value):
    return _clamp(_to_float(value) / 100.0)


def _normalize_age(value):
    age = _to_float(value, 22.0)
    # Expected alumni age range for scaling.
    return _clamp((age - 18.0) / 27.0)


def _normalize_model_choice(raw):
    text = (raw or '').strip().lower()
    if text in ('rf', 'random forest', 'random forest regressor', 'random forest classifier'):
        return 'rf'
    if text in ('lr', 'linear regression', 'linear'):
        return 'lr'
    if text.startswith('arima') or 'auto arima' in text:
        return 'arima'
    return 'rf'


def _forecast_result_for_model(rates, horizon, model_str):
    normalized = _normalize_model_choice(model_str)
    if normalized == 'rf':
        return run_rf_forecast(rates, horizon=horizon)
    if normalized == 'lr':
        return run_lr_forecast(rates, horizon=horizon)
    order = parse_order(model_str)
    return run_arima_forecast(rates, horizon=horizon, order=order)


def _predict_with_arima_employability(db, features):
    row = db.execute(
        "SELECT year, overall_rate FROM employment_data ORDER BY year"
    ).fetchall()
    if not row:
        return {'error': 'Employment trend data is unavailable for ARIMA prediction.'}

    rates = [float(r['overall_rate']) for r in row]
    years = [int(r['year']) for r in row]
    grad_year = int(_feature_number(features, 'graduation_year', 'graduationYear', default=years[-1]))

    if grad_year in years:
        rate = rates[years.index(grad_year)]
    elif grad_year < years[0]:
        rate = rates[0]
    else:
        horizon = max(grad_year - years[-1], 1)
        forecast = run_arima_forecast(rates, horizon=horizon, order=None)
        rate = float(forecast['forecast_values'][-1])

    probability = _clamp(rate / 100.0)
    prediction = 1 if probability >= 0.5 else 0
    return {
        'label': 'Employed' if prediction == 1 else 'Unemployed',
        'prediction': prediction,
        'probability_employed': round(probability, 4),
        'model_used': 'arima',
        'requested_model': 'arima',
        'model_note': 'ARIMA employability mode estimates cohort-level probability from historical employment trend.',
    }


def _read_prediction_settings(db):
    row = db.execute(
        "SELECT use_voter_weights FROM prediction_settings WHERE id = 1"
    ).fetchone()
    if not row:
        db.execute(
            "INSERT INTO prediction_settings (id, use_voter_weights) VALUES (1, 0)"
        )
        db.commit()
        return {'use_voter_weights': False}
    return {'use_voter_weights': bool(row['use_voter_weights'])}


def _read_voter_fields(db):
    rows = db.execute(
        "SELECT * FROM voter_config ORDER BY id"
    ).fetchall()
    return [{
        'id': r['id'],
        'name': r['field_name'],
        'key': r['field_key'],
        'enabled': bool(r['enabled']),
        'weight': int(r['weight'] or 0),
    } for r in rows]


def _normalize_weights_to_100(raw_weights):
    keys = list(raw_weights.keys())
    total = sum(max(0.0, float(v)) for v in raw_weights.values())
    if total <= 0:
        return {key: 0 for key in keys}

    scaled = {key: (max(0.0, float(raw_weights[key])) / total) * 100.0 for key in keys}
    rounded = {key: int(scaled[key]) for key in keys}
    remainder = 100 - sum(rounded.values())

    if remainder != 0:
        fractions = sorted(
            ((key, scaled[key] - int(scaled[key])) for key in keys),
            key=lambda item: item[1],
            reverse=(remainder > 0),
        )
        idx = 0
        while remainder != 0 and fractions:
            key = fractions[idx % len(fractions)][0]
            if remainder > 0:
                rounded[key] += 1
                remainder -= 1
            else:
                if rounded[key] > 0:
                    rounded[key] -= 1
                    remainder += 1
            idx += 1

    return rounded


def _suggest_voter_weights_from_rf(voter_fields):
    importance_result = predictor_feature_importance(model='rf')
    if importance_result.get('error'):
        return {'error': importance_result['error']}

    feature_importance = importance_result.get('feature_importance', {})
    factor_feature_map = {
        'gpa': ('avg_grade',),
        'prof_grade': ('avg_prof_grade',),
        'elec_grade': ('avg_elec_grade',),
        'ojt_grade': ('ojt_grade',),
        'soft_skills': ('soft_skills',),
        'hard_skills': ('hard_skills',),
        'age': ('age',),
        # Keep gender neutral/unmapped for ML-suggested weights.
        'gender': (),
    }

    raw_factor_weights = {}
    for field in voter_fields:
        if not field.get('enabled'):
            continue
        key = field['key']
        mapped_features = factor_feature_map.get(key, ())
        raw_factor_weights[key] = sum(feature_importance.get(feature, 0.0) for feature in mapped_features)

    if not raw_factor_weights:
        return {'error': 'No enabled voter factors available for ML suggestion.'}

    normalized = _normalize_weights_to_100(raw_factor_weights)
    suggested = []
    for field in voter_fields:
        key = field['key']
        if field.get('enabled'):
            suggested_weight = normalized.get(key, 0)
        else:
            suggested_weight = int(field.get('weight', 0) or 0)

        suggested.append({
            **field,
            'weight': max(0, min(100, int(suggested_weight))),
        })

    return {
        'config': suggested,
        'model': 'rf',
        'top_features': importance_result.get('top_features', []),
    }


def _predict_with_voter_weights(features, voter_fields):
    enabled = [f for f in voter_fields if f.get('enabled') and int(f.get('weight', 0)) > 0]
    if not enabled:
        return {
            'label': 'Employed',
            'prediction': 1,
            'probability_employed': 0.5,
            'reason': 'No enabled voter factors with positive weights.',
        }

    factor_scores = {}
    for field in enabled:
        key = field['key']
        if key == 'gpa':
            factor_scores[key] = _normalize_grade(_feature_number(features, 'avg_grade', 'avgGrade'))
        elif key == 'prof_grade':
            factor_scores[key] = _normalize_grade(_feature_number(features, 'avg_prof_grade', 'avgProfGrade'))
        elif key == 'elec_grade':
            factor_scores[key] = _normalize_grade(_feature_number(features, 'avg_elec_grade', 'avgElecGrade'))
        elif key == 'ojt_grade':
            factor_scores[key] = _normalize_grade(_feature_number(features, 'ojt_grade', 'ojtGrade'))
        elif key == 'soft_skills':
            factor_scores[key] = _normalize_grade(_feature_number(features, 'soft_skills', 'softSkills'))
        elif key == 'hard_skills':
            factor_scores[key] = _normalize_grade(_feature_number(features, 'hard_skills', 'hardSkills'))
        elif key == 'age':
            factor_scores[key] = _normalize_age(_feature_number(features, 'age'))
        elif key == 'board_passer':
            raw = _feature_number(features, 'board_passer', 'boardPasser')
            factor_scores[key] = 1.0 if raw >= 1 else 0.0
        elif key == 'gender':
            factor_scores[key] = 0.5
        else:
            factor_scores[key] = 0.5

    total_weight = sum(int(f['weight']) for f in enabled)
    weighted_sum = sum(factor_scores[f['key']] * int(f['weight']) for f in enabled)
    probability = _clamp(weighted_sum / total_weight if total_weight > 0 else 0.5)
    prediction = 1 if probability >= 0.5 else 0
    return {
        'label': 'Employed' if prediction == 1 else 'Unemployed',
        'prediction': prediction,
        'probability_employed': round(probability, 4),
        'reason': 'Computed from configured voter factor weights.',
    }


# ── Dashboard ──────────────────────────────────────────────────────────────

@admin_bp.route('/dashboard', methods=['GET'])
@admin_required
def dashboard():
    db = get_db()
    model_str = request.args.get('model', 'Linear Regression')

    total_alumni = db.execute(
        "SELECT COUNT(*) as cnt FROM users WHERE role = 'alumni'"
    ).fetchone()['cnt']

    employed_count = db.execute(
        "SELECT COUNT(*) as cnt FROM users WHERE role = 'alumni' AND employed = 1"
    ).fetchone()['cnt']

    employment_rate = round(employed_count / total_alumni * 100, 1) if total_alumni > 0 else 69.6

    # Historical employment data
    emp_rows = db.execute(
        "SELECT year, overall_rate FROM employment_data ORDER BY year"
    ).fetchall()

    chart_data = [{'year': str(r['year']), 'rate': r['overall_rate']} for r in emp_rows]

    # Add simple 1-year forecast
    forecast = None
    if chart_data:
        rates = [r['overall_rate'] for r in emp_rows]
        forecast = _forecast_result_for_model(rates, horizon=1, model_str=model_str)
        next_year = str(emp_rows[-1]['year'] + 1)
        chart_data.append({
            'year': next_year,
            'rate': forecast['forecast_values'][0],
            'forecast': True,
        })

    margin_of_error = 1.1
    if forecast:
        mape = forecast.get('metrics', {}).get('mape')
        if isinstance(mape, (int, float)):
            margin_of_error = round(float(mape), 1)

    return jsonify({
        'metrics': {
            'total_alumni': total_alumni,
            'employment_rate': employment_rate,
            'employment_rate_change': 4.6,
            'graduate_success': 97.5,
            'margin_of_error': margin_of_error,
        },
        'employment_data': chart_data,
        'model_used': (forecast or {}).get('model_used', 'Linear Regression'),
    }), 200


# ── Users ──────────────────────────────────────────────────────────────────

@admin_bp.route('/users', methods=['GET'])
@admin_required
def list_users():
    db = get_db()
    search = request.args.get('search', '').lower()
    filter_by = request.args.get('filter', 'All')

    # Always fetch all alumni for accurate totals
    all_rows = db.execute("SELECT * FROM users WHERE role = 'alumni'").fetchall()

    def _employability_score(r):
        avg_g = float(r['avg_grade'] or 0)
        soft  = float(r['soft_skills'] or 0)
        hard  = float(r['hard_skills'] or 0)
        ojt   = float(r['ojt_grade'] or 0)
        board = float(r['board_passer'] if 'board_passer' in r.keys() else 0)
        score = avg_g * 0.35 + ojt * 0.20 + soft * 0.15 + hard * 0.15 + board * 15
        return round(min(score, 100), 1)

    def _employability_level(r, score):
        # Alumni with no NCAE results yet cannot be fairly classified
        soft = float(r['soft_skills'] or 0)
        hard = float(r['hard_skills'] or 0)
        ncae_done = soft > 0 or hard > 0
        keys = r.keys() if hasattr(r, 'keys') else {}
        ncae_flag = bool(r['ncae_completed']) if 'ncae_completed' in keys else False
        if not ncae_done and not ncae_flag:
            return 'Pending Assessment'
        return 'Likely Employable' if score >= 50 else 'Least Employable'

    all_users = [{
        'id': r['id'],
        'name': f"{r['first_name']} {r['last_name']}",
        'email': r['email'],
        'course': r['course'],
        'year': r['graduation_year'],
        'status': r['account_status'],
        'employed': bool(r['employed']),
        'board_passer': bool(r['board_passer']) if 'board_passer' in r.keys() else False,
        'board_exam_score': float(r['board_exam_score']) if 'board_exam_score' in r.keys() else 0.0,
        'employability_score': _employability_score(r),
        'employability_level': _employability_level(r, _employability_score(r)),
    } for r in all_rows]

    # Stats always reflect full alumni pool
    stats = {
        'total': len(all_users),
        'active': sum(1 for u in all_users if u['status'] == 'Active'),
        'employed': sum(1 for u in all_users if u['employed']),
        'unemployed': sum(1 for u in all_users if not u['employed']),
    }

    # Apply filter tab
    users = all_users
    if filter_by == 'Active':
        users = [u for u in users if u['status'] == 'Active']
    elif filter_by == 'Employed':
        users = [u for u in users if u['employed']]
    elif filter_by == 'Unemployed':
        users = [u for u in users if not u['employed']]

    # Apply search on top of filter
    if search:
        users = [u for u in users if search in u['name'].lower() or search in u['email'].lower()]

    return jsonify({'users': users, 'stats': stats}), 200


@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@admin_required
def update_user(user_id):
    data = request.get_json()
    db = get_db()

    if 'status' in data:
        db.execute(
            'UPDATE users SET account_status = ? WHERE id = ?',
            [data['status'], user_id]
        )
    if 'employed' in data:
        db.execute(
            'UPDATE users SET employed = ? WHERE id = ?',
            [int(data['employed']), user_id]
        )
    db.commit()
    return jsonify({'message': 'User updated'}), 200


# ── Forecasting ────────────────────────────────────────────────────────────

@admin_bp.route('/forecasting', methods=['GET'])
@admin_required
def get_forecasting():
    db = get_db()

    emp_rows = db.execute(
        "SELECT year, overall_rate, male_rate, female_rate FROM employment_data ORDER BY year"
    ).fetchall()

    historical = [{'year': str(r['year']), 'rate': r['overall_rate']} for r in emp_rows]
    rates = [r['overall_rate'] for r in emp_rows]
    years = [r['year'] for r in emp_rows]

    # Default 3-year forecast
    result = _forecast_result_for_model(rates, horizon=3, model_str='Linear Regression')
    forecast_points = []
    for i, val in enumerate(result['forecast_values']):
        forecast_points.append({
            'year': str(max(years) + i + 1),
            'rate': val,
            'forecast': True,
        })

    by_course = db.execute(
        "SELECT course, rate FROM program_rates WHERE year = ? ORDER BY rate DESC",
        [max(years)]
    ).fetchall()
    course_data = [{'course': r['course'], 'rate': r['rate']} for r in by_course]

    return jsonify({
        'historical_data': historical,
        'forecast_data': historical + forecast_points,
        'course_data': course_data,
        'projected_values': [
            {'year': str(max(years) + i + 1), 'val': f"{v}%"}
            for i, v in enumerate(result['forecast_values'])
        ],
        'model_metrics': result['metrics'],
        'model_used': result.get('model_used', 'Linear Regression'),
    }), 200


@admin_bp.route('/forecasting/run', methods=['POST'])
@admin_required
def run_forecasting():
    data = request.get_json()
    horizon = int(data.get('horizon', 3))
    model_str = data.get('model', 'Linear Regression')

    db = get_db()
    emp_rows = db.execute(
        "SELECT year, overall_rate FROM employment_data ORDER BY year"
    ).fetchall()

    rates = [r['overall_rate'] for r in emp_rows]
    years = [r['year'] for r in emp_rows]

    result = _forecast_result_for_model(rates, horizon=horizon, model_str=model_str)

    historical = [{'year': str(r['year']), 'rate': r['overall_rate']} for r in emp_rows]
    forecast_points = []
    for i, val in enumerate(result['forecast_values']):
        forecast_points.append({
            'year': str(max(years) + i + 1),
            'rate': val,
            'forecast': True,
        })

    return jsonify({
        'data': historical + forecast_points,
        'forecast_values': [
            {'year': str(max(years) + i + 1), 'val': f"{v}%"}
            for i, v in enumerate(result['forecast_values'])
        ],
        'metrics': result['metrics'],
        'model_used': result.get('model_used', model_str),
    }), 200


# ── Employment Comparison ──────────────────────────────────────────────────

@admin_bp.route('/employment-comparison', methods=['GET'])
@admin_required
def employment_comparison():
    db = get_db()

    rows = db.execute(
        "SELECT year, overall_rate, male_rate, female_rate FROM employment_data ORDER BY year"
    ).fetchall()

    by_year = [{
        'year': str(r['year']),
        'employed': r['overall_rate'],
        'unemployed': round(100 - r['overall_rate'], 1),
    } for r in rows]

    by_gender = [{
        'year': str(r['year']),
        'male': r['male_rate'],
        'female': r['female_rate'],
    } for r in rows]

    latest_year = max(r['year'] for r in rows)
    course_rows = db.execute(
        "SELECT course, rate FROM program_rates WHERE year = ? ORDER BY rate DESC",
        [latest_year]
    ).fetchall()
    by_course = [{'course': r['course'], 'rate': r['rate']} for r in course_rows]

    rates = [r['overall_rate'] for r in rows]
    avg_rate = round(sum(rates) / len(rates), 1) if rates else 0
    first_rate = rates[0] if rates else 0
    last_rate = rates[-1] if rates else 0
    change = round(last_rate - first_rate, 1)

    best_course = by_course[0]['course'] if by_course else 'BSCS'
    best_rate = by_course[0]['rate'] if by_course else 82
    peak_year = str(max(rows, key=lambda r: r['overall_rate'])['year'])
    peak_rate = max(r['overall_rate'] for r in rows)

    gender_gap = round(
        sum(r['male_rate'] - r['female_rate'] for r in rows) / len(rows), 1
    ) if rows else 3.0

    return jsonify({
        'by_year': by_year,
        'by_course': by_course,
        'by_gender': by_gender,
        'summary': {
            'avg_rate': f'{avg_rate}%',
            'avg_delta': f'+{change}%',
            'best_prog': best_course,
            'best_rate': f'{best_rate}% rate',
            'peak_year': peak_year,
            'peak_rate': f'{peak_rate}%',
            'gender_gap': f'{gender_gap}%',
            'gender_note': 'Male higher',
        },
    }), 200


# ── Predict & Report ───────────────────────────────────────────────────────

@admin_bp.route('/predict-employability', methods=['POST'])
@admin_required
def predict_employability_route():
    payload = request.get_json() or {}
    db = get_db()

    features = payload.get('features')
    user_id = payload.get('user_id')
    requested_model = _normalize_model_choice(payload.get('model', 'rf'))

    if features is None and user_id is not None:
        features = _alumni_features_from_db(db, user_id)
        if not features:
            return jsonify({'error': 'Alumni user not found'}), 404

    if not isinstance(features, dict):
        return jsonify({'error': 'Provide a features object or user_id'}), 400

    settings = _read_prediction_settings(db)
    use_voter_weights = settings['use_voter_weights']

    if requested_model == 'arima':
        ml_details = _predict_with_arima_employability(db, features)
    else:
        ml_details = predict_employability_details(features, model=requested_model)
    voter_fields = _read_voter_fields(db)
    voter_details = _predict_with_voter_weights(features, voter_fields)

    mode = 'ml_default'
    details = ml_details
    if use_voter_weights:
        mode = 'voter_weighted'
        details = voter_details
    elif ml_details.get('error'):
        mode = 'voter_fallback'
        details = voter_details

    if details.get('error'):
        return jsonify({'error': details['error']}), 503

    return jsonify({
        'prediction': {
            **details,
            'mode': mode,
            'use_voter_weights': use_voter_weights,
            'requested_model': requested_model,
            'ml_reference': None if ml_details.get('error') else ml_details,
        }
    }), 200


@admin_bp.route('/models/status', methods=['GET'])
@admin_required
def model_status():
    return jsonify({'model': predictor_status()}), 200


@admin_bp.route('/models/retrain', methods=['POST'])
@admin_required
def retrain_model():
    db_path = current_app.config.get('DATABASE', os.getenv('DATABASE', 'plp_alumni.db'))
    rf_metadata = train_random_forest(database_path=db_path)
    lr_metadata = train_linear_employability(database_path=db_path)
    ml_predictor._load_models()
    return jsonify({
        'message': 'Model retrained successfully',
        'model': rf_metadata,
        'models': {
            'rf': rf_metadata,
            'lr': lr_metadata,
        },
    }), 200


@admin_bp.route('/models/import-first-clean-dataset', methods=['POST'])
@admin_required
def import_first_clean_dataset():
    payload = request.get_json() or {}
    retrain_after_import = bool(payload.get('retrain_after_import', True))
    db_path = current_app.config.get('DATABASE', os.getenv('DATABASE', 'plp_alumni.db'))
    dataset_name = 'first_clean_dataset.csv'
    dataset_path = os.path.join(current_app.root_path, 'ml', 'data', dataset_name)

    try:
        imported = import_first_clean_dataset_rows(
            database_path=db_path,
            csv_path=dataset_path,
            source_name=dataset_name,
        )
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400

    response = {
        'message': 'Dataset imported into ML training rows',
        'import': imported,
    }

    if retrain_after_import:
        rf_metadata = train_random_forest(database_path=db_path)
        lr_metadata = train_linear_employability(database_path=db_path)
        ml_predictor._load_models()
        response['message'] = 'Dataset imported and model retrained'
        response['models'] = {
            'rf': rf_metadata,
            'lr': lr_metadata,
        }

    return jsonify(response), 200


@admin_bp.route('/predict-report', methods=['GET'])
@admin_required
def predict_report():
    db = get_db()

    reports = db.execute(
        "SELECT * FROM reports ORDER BY created_at DESC"
    ).fetchall()

    report_list = [{
        'id': r['id'],
        'name': r['name'],
        'date': r['created_at'][:10] if r['created_at'] else '',
        'type': r['type'],
        'status': r['status'],
        'year_range': r['year_range'],
    } for r in reports]

    # Run all forecast models to get latest metrics
    emp_rows = db.execute(
        "SELECT overall_rate FROM employment_data ORDER BY year"
    ).fetchall()
    rates = [r['overall_rate'] for r in emp_rows]
    model_runs = {
        'Linear Regression': _forecast_result_for_model(rates, horizon=1, model_str='Linear Regression'),
        'Random Forest Regressor': _forecast_result_for_model(rates, horizon=1, model_str='Random Forest'),
        'Auto ARIMA (AIC search)': _forecast_result_for_model(rates, horizon=1, model_str='Auto ARIMA (AIC search)'),
    }
    default_metrics = model_runs['Linear Regression']['metrics']
    metrics_by_model = {
        model_name: {
            'mae': str(result['metrics']['mae']),
            'rmse': str(result['metrics']['rmse']),
            'mape': _format_percent_metric(result['metrics']['mape']),
            'r2': str(result['metrics']['r2']),
        }
        for model_name, result in model_runs.items()
    }

    return jsonify({
        'reports': report_list,
        'metrics': {
            'mae': str(default_metrics['mae']),
            'rmse': str(default_metrics['rmse']),
            'mape': _format_percent_metric(default_metrics['mape']),
            'r2': str(default_metrics['r2']),
        },
        'metrics_by_model': metrics_by_model,
    }), 200


@admin_bp.route('/predict-report/generate', methods=['POST'])
@admin_required
def generate_report():
    data = request.get_json()
    report_type = data.get('type', data.get('report_type', 'PDF'))
    year_range = data.get('year_range', '2019\u20132024')
    model_name = data.get('model', 'Linear Regression')

    report_name = f"Employment Forecast Report ({year_range})"
    db = get_db()
    cur = db.execute("""
        INSERT INTO reports (name, type, year_range, model_name, status)
        VALUES (?,?,?,?,?)
    """, [report_name, report_type, year_range, model_name, 'Ready'])
    db.commit()

    # Get metrics
    emp_rows = db.execute("SELECT overall_rate FROM employment_data ORDER BY year").fetchall()
    rates = [r['overall_rate'] for r in emp_rows]
    metrics_by_model = None
    model_choice = _normalize_model_choice(model_name)
    if str(model_name or '').strip().lower() == 'all models':
        model_runs = {
            'Linear Regression': _forecast_result_for_model(rates, horizon=1, model_str='Linear Regression'),
            'Random Forest Regressor': _forecast_result_for_model(rates, horizon=1, model_str='Random Forest'),
            'Auto ARIMA (AIC search)': _forecast_result_for_model(rates, horizon=1, model_str='Auto ARIMA (AIC search)'),
        }
        fm = model_runs['Linear Regression']['metrics']
        metrics_by_model = {
            model: {
                'mae': str(result['metrics']['mae']),
                'rmse': str(result['metrics']['rmse']),
                'mape': _format_percent_metric(result['metrics']['mape']),
                'r2': str(result['metrics']['r2']),
            }
            for model, result in model_runs.items()
        }
    elif model_choice == 'lr':
        fm = _forecast_result_for_model(rates, horizon=1, model_str='Linear Regression')['metrics']
    elif model_choice == 'rf':
        fm = _forecast_result_for_model(rates, horizon=1, model_str='Random Forest')['metrics']
    else:
        fm = _forecast_result_for_model(rates, horizon=1, model_str=model_name)['metrics']

    from datetime import date
    return jsonify({
        'message': 'Report generated successfully',
        'report': {
            'id': cur.lastrowid,
            'name': report_name,
            'date': date.today().strftime('%b %d, %Y'),
            'type': report_type,
            'status': 'Ready',
        },
        'metrics': {
            'mae': str(fm['mae']),
            'rmse': str(fm['rmse']),
            'mape': _format_percent_metric(fm['mape']),
            'r2': str(fm['r2']),
        },
        'metrics_by_model': metrics_by_model,
    }), 201


# ── Voter Config ───────────────────────────────────────────────────────────

@admin_bp.route('/voter-config', methods=['GET'])
@admin_required
def get_voter_config():
    db = get_db()
    fields = _read_voter_fields(db)
    settings = _read_prediction_settings(db)
    return jsonify({
        'config': fields,
        'use_voter_weights': settings['use_voter_weights'],
    }), 200


@admin_bp.route('/voter-config', methods=['PUT'])
@admin_required
def update_voter_config():
    data = request.get_json() or {}
    fields = data.get('config', data.get('fields', []))
    use_voter_weights = bool(data.get('use_voter_weights', False))
    db = get_db()

    for field in fields:
        weight = int(field.get('weight', 0) or 0)
        weight = max(0, min(100, weight))
        db.execute("""
            UPDATE voter_config SET enabled = ?, weight = ? WHERE field_key = ?
        """, [int(field.get('enabled', True)), weight, field['key']])

    db.execute("""
        INSERT INTO prediction_settings (id, use_voter_weights, updated_at)
        VALUES (1, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
            use_voter_weights = excluded.use_voter_weights,
            updated_at = excluded.updated_at
    """, [int(use_voter_weights)])

    db.commit()
    return jsonify({
        'message': 'Voter configuration saved',
        'use_voter_weights': use_voter_weights,
    }), 200


@admin_bp.route('/voter-config/suggest', methods=['POST'])
@admin_required
def suggest_voter_config():
    db = get_db()
    fields = _read_voter_fields(db)
    suggestion = _suggest_voter_weights_from_rf(fields)
    if suggestion.get('error'):
        return jsonify({'error': suggestion['error']}), 503
    return jsonify(suggestion), 200


# ── Upload Model ───────────────────────────────────────────────────────────

def _auto_forecast_3yr(db, dataset_year):
    """Compute employment rate for dataset_year from training rows, update employment_data,
    then run all 3 models with horizon=3 and return structured forecast."""
    row = db.execute("""
        SELECT COUNT(*) as total, COALESCE(SUM(employed), 0) as emp
        FROM ml_training_rows WHERE graduation_year = ? AND is_active = 1
    """, [dataset_year]).fetchone()
    if row['total'] > 0:
        rate = round((row['emp'] / row['total']) * 100, 2)
        db.execute("""
            INSERT INTO employment_data (year, overall_rate, employed_count, unemployed_count)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(year) DO UPDATE SET
                overall_rate = excluded.overall_rate,
                employed_count = excluded.employed_count,
                unemployed_count = excluded.unemployed_count
        """, [dataset_year, rate, int(row['emp']), row['total'] - int(row['emp'])])
        db.commit()

    emp_rows = db.execute(
        "SELECT year, overall_rate FROM employment_data ORDER BY year"
    ).fetchall()
    if not emp_rows:
        return None

    rates = [r['overall_rate'] for r in emp_rows]
    base_year = max(r['year'] for r in emp_rows)
    forecast_years = [base_year + 1, base_year + 2, base_year + 3]
    predictions = {}
    for key, model_str in [('lr', 'Linear Regression'), ('rf', 'Random Forest'), ('arima', 'Auto ARIMA (AIC search)')]:
        try:
            result = _forecast_result_for_model(rates, horizon=3, model_str=model_str)
            fv = result.get('forecast_values', [])
            predictions[key] = [
                {'year': forecast_years[i], 'rate': round(float(v), 2)}
                for i, v in enumerate(fv) if i < 3
            ]
        except Exception:
            predictions[key] = []

    return {'base_year': dataset_year, 'forecast_years': forecast_years, 'predictions': predictions}


@admin_bp.route('/upload', methods=['POST'])
@admin_required
def upload_model():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    model_name = request.form.get('name', file.filename)
    apply_to_training = _is_truthy(request.form.get('apply_to_training'), default=False)
    retrain_after_import = _is_truthy(request.form.get('retrain_after_import'), default=True)
    dataset_year_raw = request.form.get('dataset_year', '').strip()
    conflict_mode = request.form.get('conflict_mode', '').lower()  # 'overwrite' or 'merge'

    dataset_year = None
    if dataset_year_raw:
        try:
            dataset_year = int(dataset_year_raw)
        except ValueError:
            return jsonify({'error': 'dataset_year must be a valid integer'}), 400

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    os.makedirs(upload_folder, exist_ok=True)

    safe_name = file.filename.replace(' ', '_')
    file_path = os.path.join(upload_folder, safe_name)
    file.save(file_path)
    file_size = os.path.getsize(file_path)
    file_hash = _file_sha256(file_path)
    is_csv = safe_name.lower().endswith('.csv')

    is_tabular = is_csv or safe_name.lower().endswith('.xlsx') or safe_name.lower().endswith('.xls')
    if apply_to_training and not is_tabular:
        return jsonify({'error': 'Training import is only supported for CSV or Excel (.xlsx/.xls) files.'}), 400

    records = 0
    if is_tabular:
        try:
            if is_csv:
                import csv as _csv
                with open(file_path, newline='', encoding='utf-8-sig') as f:
                    records = max(sum(1 for _ in _csv.reader(f)) - 1, 0)
            else:
                import pandas as _pd
                records = len(_pd.read_excel(file_path))
        except Exception as exc:
            return jsonify({'error': f'Unable to parse file rows: {exc}'}), 400

    db = get_db()

    # ── Year sequence + conflict check ────────────────────────────────────────
    if apply_to_training and is_csv and dataset_year:
        max_year_row = db.execute(
            "SELECT MAX(graduation_year) AS my FROM ml_training_rows WHERE is_active = 1"
        ).fetchone()
        max_year = max_year_row['my'] if max_year_row else None

        # Reject year that skips ahead (e.g. 2022 exists, trying to upload 2024)
        if max_year and dataset_year > max_year + 1:
            return jsonify({
                'error': f'Cannot upload year {dataset_year}. '
                         f'Year {max_year + 1} is missing — upload that first.',
                'next_allowed': max_year + 1,
                'last_recorded': max_year,
            }), 400

        existing = db.execute(
            "SELECT COUNT(*) FROM ml_training_rows WHERE graduation_year = ? AND is_active = 1",
            [dataset_year]
        ).fetchone()[0]
        if existing > 0 and not conflict_mode:
            return jsonify({
                'year_conflict': True,
                'year': dataset_year,
                'existing_count': existing,
                'message': f'{existing} training rows already exist for {dataset_year}.',
            }), 409

        if conflict_mode == 'overwrite' and dataset_year:
            db.execute("DELETE FROM ml_training_rows WHERE graduation_year = ?", [dataset_year])
            db.commit()

    cur = db.execute("""
        INSERT INTO model_uploads (
            name, original_filename, file_size, records, status, sha256, applied_to_training
        )
        VALUES (?,?,?,?,?,?,?)
    """, [model_name, safe_name, file_size, records, 'Active', file_hash, 0])
    db.commit()

    import_result = None
    trained_models = None
    training_policy = 'archive_only'
    forecast = None

    if apply_to_training and is_tabular:
        db_path = current_app.config.get('DATABASE', os.getenv('DATABASE', 'plp_alumni.db'))
        try:
            import_result = import_training_csv(
                database_path=db_path,
                csv_path=file_path,
                source_name=safe_name,
                year_override=dataset_year,
            )
            db.execute(
                "UPDATE model_uploads SET applied_to_training = 1, status = 'Imported' WHERE id = ?",
                [cur.lastrowid],
            )
            db.commit()
            training_policy = 'uploaded_csv_imported'
        except ValueError as exc:
            db.execute(
                "UPDATE model_uploads SET status = 'Import Failed' WHERE id = ?",
                [cur.lastrowid],
            )
            db.commit()
            return jsonify({'error': str(exc)}), 400

        if retrain_after_import:
            rf_metadata = train_random_forest(database_path=db_path)
            lr_metadata = train_linear_employability(database_path=db_path)
            ml_predictor._load_models()
            trained_models = {'rf': rf_metadata, 'lr': lr_metadata}
            training_policy = 'uploaded_csv_imported_and_retrained'

        # ── Auto-forecast 3 years ahead ───────────────────────────────────────
        if dataset_year:
            try:
                forecast = _auto_forecast_3yr(db, dataset_year)
            except Exception:
                forecast = None

    upload_row = db.execute(
        "SELECT * FROM model_uploads WHERE id = ?", [cur.lastrowid]
    ).fetchone()

    upload = {
        'id': upload_row['id'],
        'name': upload_row['name'],
        'filename': upload_row['original_filename'],
        'size': f"{upload_row['file_size'] / 1024:.2f} KB",
        'records': f"{upload_row['records']} records",
        'status': upload_row['status'],
        'date': datetime.now().strftime('%Y-%m-%d'),
        'sha256': upload_row['sha256'],
        'applied_to_training': bool(upload_row['applied_to_training']),
    }

    response = {
        'message': 'File uploaded successfully',
        'training_policy': training_policy,
        'upload': upload,
    }
    if import_result:
        response['import'] = import_result
    if trained_models:
        response['models'] = trained_models
        response['message'] = 'File uploaded, imported to training, and model retrained'
    if forecast:
        response['forecast'] = forecast

    return jsonify(response), 201


@admin_bp.route('/uploads', methods=['GET'])
@admin_required
def list_uploads():
    db = get_db()
    rows = db.execute(
        "SELECT * FROM model_uploads ORDER BY uploaded_at DESC"
    ).fetchall()

    uploads = [{
        'id': r['id'],
        'name': r['name'],
        'filename': r['original_filename'],
        'size': f"{r['file_size'] / 1024:.2f} KB",
        'records': f"{r['records']} records",
        'status': r['status'],
        'date': r['uploaded_at'][:10] if r['uploaded_at'] else '',
        'sha256': r['sha256'],
        'applied_to_training': bool(r['applied_to_training']),
    } for r in rows]

    return jsonify({'uploads': uploads}), 200


# ── All-Models Forecasting ─────────────────────────────────────────────────

@admin_bp.route('/forecasting/run-all', methods=['POST'])
@admin_required
def run_forecasting_all_models():
    """Run all 3 models and return combined chart data for merged graph."""
    data = request.get_json()
    horizon = int(data.get('horizon', 3))

    db = get_db()

    emp_rows = db.execute(
        "SELECT year, overall_rate FROM employment_data ORDER BY year"
    ).fetchall()
    rates = [r['overall_rate'] for r in emp_rows]
    years = [r['year'] for r in emp_rows]
    if not rates:
        return jsonify({'error': 'No employment data available'}), 404

    historical = [{'year': str(r['year']), 'rate': r['overall_rate']} for r in emp_rows]

    model_map = {
        'lr': 'Linear Regression',
        'rf': 'Random Forest',
        'arima': 'Auto ARIMA (AIC search)',
    }
    combined = {str(r['year']): {'year': str(r['year']), 'rate': r['overall_rate']} for r in emp_rows}
    projections = {}
    metrics_all = {}

    for key, model_str in model_map.items():
        result = _forecast_result_for_model(rates, horizon=horizon, model_str=model_str)
        fv = result.get('forecast_values', [])
        for i, val in enumerate(fv):
            yr = str(max(years) + i + 1)
            if yr not in combined:
                combined[yr] = {'year': yr, 'forecast': True}
            combined[yr][key] = val
        projections[key] = [
            {'year': str(max(years) + i + 1), 'val': f"{v}%"}
            for i, v in enumerate(fv)
        ]
        metrics_all[key] = result.get('metrics', {})

    chart_data = list(combined.values())
    chart_data.sort(key=lambda x: x['year'])

    return jsonify({
        'data': chart_data,
        'historical': historical,
        'projections': projections,
        'metrics': metrics_all,
        'horizon': horizon,
    }), 200


# ── Programs Management ────────────────────────────────────────────────────

BOARD_EXAM_PROGRAMS = {
    'BSCE', 'BSEE', 'BSME', 'BSECE', 'BSN', 'BSEd', 'BEEd', 'BSA', 'BSCPE', 'BSMA', 'BSPH',
}

DEFAULT_PROGRAMS = [
    {'name': 'Bachelor of Science in Computer Science', 'code': 'BSCS', 'has_board_exam': 0, 'board_exam_name': '', 'description': ''},
    {'name': 'Bachelor of Science in Information Technology', 'code': 'BSIT', 'has_board_exam': 0, 'board_exam_name': '', 'description': ''},
    {'name': 'Bachelor of Science in Computer Engineering', 'code': 'BSCPE', 'has_board_exam': 1, 'board_exam_name': 'Electronics Engineering Licensure Exam', 'description': 'Combines hardware and software engineering disciplines.'},
    {'name': 'Bachelor of Science in Electronics Engineering', 'code': 'BSECE', 'has_board_exam': 1, 'board_exam_name': 'Electronics Engineering Licensure Exam', 'description': ''},
    {'name': 'Bachelor of Science in Civil Engineering', 'code': 'BSCE', 'has_board_exam': 1, 'board_exam_name': 'Civil Engineering Licensure Exam', 'description': ''},
    {'name': 'Bachelor of Science in Nursing', 'code': 'BSN', 'has_board_exam': 1, 'board_exam_name': 'Nurse Licensure Examination', 'description': ''},
    {'name': 'Bachelor of Secondary Education', 'code': 'BSEd', 'has_board_exam': 1, 'board_exam_name': 'Licensure Examination for Teachers', 'description': ''},
    {'name': 'Bachelor of Elementary Education', 'code': 'BEEd', 'has_board_exam': 1, 'board_exam_name': 'Licensure Examination for Teachers', 'description': ''},
    {'name': 'Bachelor of Science in Accountancy', 'code': 'BSA', 'has_board_exam': 1, 'board_exam_name': 'CPA Licensure Examination', 'description': ''},
    {'name': 'Bachelor of Science in Business Administration', 'code': 'BSBA', 'has_board_exam': 0, 'board_exam_name': '', 'description': ''},
    {'name': 'Bachelor of Science in Hotel and Restaurant Management', 'code': 'BSHM', 'has_board_exam': 0, 'board_exam_name': '', 'description': ''},
]


@admin_bp.route('/programs', methods=['GET'])
@admin_required
def list_programs():
    db = get_db()
    rows = db.execute('SELECT * FROM programs ORDER BY name').fetchall()
    if not rows:
        # Auto-seed default programs on first load
        for p in DEFAULT_PROGRAMS:
            try:
                db.execute("""
                    INSERT INTO programs (name, code, has_board_exam, board_exam_name, description, status)
                    VALUES (?,?,?,?,?,'Active')
                """, [p['name'], p['code'], p['has_board_exam'], p['board_exam_name'], p['description']])
            except Exception:
                pass
        db.commit()
        rows = db.execute('SELECT * FROM programs ORDER BY name').fetchall()

    programs = [{
        'id': r['id'],
        'name': r['name'],
        'code': r['code'],
        'has_board_exam': bool(r['has_board_exam']),
        'board_exam_name': r['board_exam_name'] or '',
        'description': r['description'] or '',
        'status': r['status'],
        'created_at': r['created_at'][:10] if r['created_at'] else '',
    } for r in rows]
    return jsonify({'programs': programs}), 200


@admin_bp.route('/programs', methods=['POST'])
@admin_required
def create_program():
    data = request.get_json()
    name = (data.get('name') or '').strip()
    if not name:
        return jsonify({'error': 'Program name is required'}), 400
    db = get_db()
    try:
        cur = db.execute("""
            INSERT INTO programs (name, code, has_board_exam, board_exam_name, description, status)
            VALUES (?,?,?,?,?,?)
        """, [
            name,
            (data.get('code') or '').strip().upper(),
            int(bool(data.get('has_board_exam', False))),
            (data.get('board_exam_name') or '').strip(),
            (data.get('description') or '').strip(),
            data.get('status', 'Active'),
        ])
        db.commit()
        return jsonify({'message': 'Program created', 'id': cur.lastrowid}), 201
    except Exception:
        return jsonify({'error': 'Program name already exists'}), 409


@admin_bp.route('/programs/<int:program_id>', methods=['PUT'])
@admin_required
def update_program(program_id):
    data = request.get_json()
    db = get_db()
    prog = db.execute('SELECT * FROM programs WHERE id = ?', [program_id]).fetchone()
    if not prog:
        return jsonify({'error': 'Program not found'}), 404
    try:
        db.execute("""
            UPDATE programs SET name=?, code=?, has_board_exam=?, board_exam_name=?, description=?, status=?
            WHERE id=?
        """, [
            (data.get('name') or prog['name']).strip(),
            (data.get('code') or prog['code'] or '').strip().upper(),
            int(bool(data.get('has_board_exam', bool(prog['has_board_exam'])))),
            (data.get('board_exam_name') or prog['board_exam_name'] or '').strip(),
            (data.get('description') or prog['description'] or '').strip(),
            data.get('status', prog['status']),
            program_id,
        ])
        db.commit()
        return jsonify({'message': 'Program updated'}), 200
    except Exception:
        return jsonify({'error': 'Program name already exists'}), 409


@admin_bp.route('/programs/<int:program_id>', methods=['DELETE'])
@admin_required
def delete_program(program_id):
    db = get_db()
    db.execute('DELETE FROM programs WHERE id = ?', [program_id])
    db.commit()
    return jsonify({'message': 'Program deleted'}), 200


# ── Company Account Management ─────────────────────────────────────────────

@admin_bp.route('/company-accounts', methods=['GET'])
@admin_required
def list_company_accounts():
    db = get_db()
    rows = db.execute("""
        SELECT u.id, u.first_name, u.last_name, u.email, u.account_status,
               u.company_id, c.name AS company_name, c.industry, u.created_at
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.id
        WHERE u.role = 'company'
        ORDER BY u.created_at DESC
    """).fetchall()
    accounts = [{
        'id': r['id'],
        'name': f"{r['first_name']} {r['last_name']}",
        'email': r['email'],
        'status': r['account_status'],
        'company_id': r['company_id'],
        'company_name': r['company_name'] or '',
        'industry': r['industry'] or '',
        'created_at': r['created_at'][:10] if r['created_at'] else '',
    } for r in rows]
    return jsonify({'accounts': accounts}), 200


@admin_bp.route('/company-accounts', methods=['POST'])
@admin_required
def create_company_account():
    import bcrypt as _bcrypt
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or 'company123'
    first_name = (data.get('first_name') or data.get('name') or 'Company').strip()
    last_name = (data.get('last_name') or 'User').strip()
    company_id = data.get('company_id')

    if not email:
        return jsonify({'error': 'Email is required'}), 400

    db = get_db()
    existing = db.execute('SELECT id FROM users WHERE LOWER(email) = ?', [email]).fetchone()
    if existing:
        return jsonify({'error': 'Email already registered'}), 409

    pw_hash = _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()
    cur = db.execute("""
        INSERT INTO users (first_name, last_name, email, password_hash, role, account_status, company_id)
        VALUES (?,?,?,?,'company','Active',?)
    """, [first_name, last_name, email, pw_hash, company_id])
    db.commit()
    return jsonify({'message': 'Company account created', 'id': cur.lastrowid}), 201


@admin_bp.route('/company-accounts/<int:user_id>', methods=['PUT'])
@admin_required
def update_company_account(user_id):
    data = request.get_json()
    db = get_db()
    user = db.execute("SELECT id FROM users WHERE id = ? AND role = 'company'", [user_id]).fetchone()
    if not user:
        return jsonify({'error': 'Company account not found'}), 404

    if 'status' in data:
        db.execute('UPDATE users SET account_status=? WHERE id=?', [data['status'], user_id])
    if 'company_id' in data:
        db.execute('UPDATE users SET company_id=? WHERE id=?', [data['company_id'], user_id])
    db.commit()
    return jsonify({'message': 'Account updated'}), 200


@admin_bp.route('/company-accounts/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_company_account(user_id):
    db = get_db()
    db.execute("DELETE FROM users WHERE id = ? AND role = 'company'", [user_id])
    db.commit()
    return jsonify({'message': 'Account deleted'}), 200


# ── Training Data Management ────────────────────────────────────────────────

@admin_bp.route('/training-data/years', methods=['GET'])
@admin_required
def training_data_years():
    db = get_db()
    rows = db.execute("""
        SELECT graduation_year, COUNT(*) AS count,
               SUM(employed) AS employed_count
        FROM ml_training_rows
        WHERE is_active = 1
        GROUP BY graduation_year
        ORDER BY graduation_year DESC
    """).fetchall()
    total = db.execute("SELECT COUNT(*) AS n FROM ml_training_rows WHERE is_active = 1").fetchone()['n']
    return jsonify({
        'years': [{'year': r['graduation_year'], 'count': r['count'], 'employed': r['employed_count']} for r in rows],
        'total': total,
    }), 200


@admin_bp.route('/training-data/by-year/<int:year>', methods=['DELETE'])
@admin_required
def delete_training_data_by_year(year):
    db = get_db()
    cur = db.execute("DELETE FROM ml_training_rows WHERE graduation_year = ?", [year])
    # Remove the matching employment_data entry so the forecast graph
    # immediately reflects the deletion on next page load.
    db.execute("DELETE FROM employment_data WHERE year = ?", [year])
    db.commit()
    return jsonify({
        'message': f'Deleted {cur.rowcount} training rows for {year}. Forecast updated.',
        'deleted': cur.rowcount,
        'forecast_updated': True,
    }), 200


# ── Bulk Alumni Import ──────────────────────────────────────────────────────

@admin_bp.route('/users/bulk-import', methods=['POST'])
@admin_required
def bulk_import_users():
    import bcrypt as _bcrypt
    import pandas as pd
    import io

    file = request.files.get('file')
    if not file or not file.filename:
        return jsonify({'error': 'No file provided'}), 400

    filename = file.filename.lower()
    try:
        if filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(file.read()))
        elif filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(file.read()))
        else:
            return jsonify({'error': 'Only CSV and Excel (.xlsx/.xls) files are supported'}), 400
    except Exception as e:
        return jsonify({'error': f'Could not parse file: {e}'}), 400

    # Normalize column names
    df.columns = [str(c).strip().lower().replace(' ', '_') for c in df.columns]

    def _find_col(candidates):
        for c in candidates:
            if c in df.columns:
                return c
        return None

    email_col = _find_col(['email', 'email_address', 'e-mail'])
    if not email_col:
        return jsonify({'error': "No 'email' column found in the file"}), 400

    name_col    = _find_col(['name', 'full_name', 'fullname', 'student_name'])
    course_col  = _find_col(['program', 'course', 'degree'])
    year_col    = _find_col(['graduation_year', 'jr_grad', 'grad_year', 'year_graduated', 'year'])
    age_col     = _find_col(['age'])
    grade_col   = _find_col(['cgpa', 'avg_grade', 'gpa', 'general_average'])
    prof_col    = _find_col(['prof_grade', 'avg_prof_grade', 'professional_grade'])
    elec_col    = _find_col(['elec_grade', 'avg_elec_grade', 'elective_grade'])
    board_col   = _find_col(['board_passer', 'board_exam_passer', 'board'])

    db = get_db()
    created, skipped, failed = [], [], []

    for _, row in df.iterrows():
        email = str(row.get(email_col, '') or '').strip().lower()
        if not email or '@' not in email:
            skipped.append({'email': email or '(blank)', 'reason': 'Invalid or missing email'})
            continue

        existing = db.execute('SELECT id FROM users WHERE LOWER(email) = ?', [email]).fetchone()
        if existing:
            skipped.append({'email': email, 'reason': 'Already registered'})
            continue

        # Parse name — handles "LAST, FIRST MIDDLE" and "FIRST LAST" formats
        first_name, last_name = 'Alumni', ''
        if name_col and row.get(name_col):
            raw = str(row[name_col]).strip()
            if ',' in raw:
                parts = raw.split(',', 1)
                last_name  = parts[0].strip().title()
                fn_parts   = parts[1].strip().split()
                first_name = fn_parts[0].title() if fn_parts else 'Alumni'
            else:
                parts = raw.split()
                first_name = parts[0].title() if parts else 'Alumni'
                last_name  = ' '.join(parts[1:]).title() if len(parts) > 1 else ''

        # Optional academic fields
        def _safe(col, cast, default):
            try:
                v = row.get(col) if col else None
                return cast(v) if v is not None and str(v).strip() not in ('', 'nan', 'NaN') else default
            except Exception:
                return default

        course          = str(row.get(course_col, '') or '').strip() if course_col else ''
        graduation_year = _safe(year_col, int, 2023)
        age             = _safe(age_col, int, 22)
        avg_grade       = _safe(grade_col, float, 0.0)
        avg_prof_grade  = _safe(prof_col, float, 0.0)
        avg_elec_grade  = _safe(elec_col, float, 0.0)
        board_passer    = 1 if board_col and str(row.get(board_col, '') or '').strip().lower() in ('1', 'true', 'yes', 'y') else 0

        # Generate random 10-char password
        password = ''.join(random.choices(string.ascii_letters + string.digits, k=10))
        pw_hash  = _bcrypt.hashpw(password.encode(), _bcrypt.gensalt()).decode()

        try:
            db.execute("""
                INSERT INTO users
                  (first_name, last_name, email, password_hash, role,
                   course, graduation_year, age, avg_grade, avg_prof_grade,
                   avg_elec_grade, board_passer, account_status)
                VALUES (?,?,?,?,'alumni',?,?,?,?,?,?,?,'Active')
            """, [first_name, last_name, email, pw_hash,
                  course, graduation_year, age, avg_grade,
                  avg_prof_grade, avg_elec_grade, board_passer])
            db.commit()

            email_sent, email_err = _send_welcome_email(email, f"{first_name} {last_name}".strip(), password)
            created.append({
                'email': email,
                'name': f"{first_name} {last_name}".strip(),
                'email_sent': email_sent,
                'email_error': email_err,
            })
        except Exception as e:
            failed.append({'email': email, 'reason': str(e)})

    return jsonify({
        'message': f"Import complete: {len(created)} created, {len(skipped)} skipped, {len(failed)} failed",
        'created': created,
        'skipped': skipped,
        'failed': failed,
    }), 200
