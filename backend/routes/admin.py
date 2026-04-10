import os
import hashlib
from datetime import datetime
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db
from ml.arima_model import run_arima_forecast, parse_order
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
from ml.train_lr import train_logistic_regression
from functools import wraps

admin_bp = Blueprint('admin', __name__)


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
            hard_skills
        FROM users
        WHERE id = ? AND role = 'alumni'
    """, [user_id]).fetchone()
    if not row:
        return None
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


def _normalize_grade(value):
    return _clamp(_to_float(value) / 100.0)


def _normalize_age(value):
    age = _to_float(value, 22.0)
    # Expected alumni age range for scaling.
    return _clamp((age - 18.0) / 27.0)


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
        elif key == 'gender':
            # Keep gender neutral by default to avoid bias when data is absent/ambiguous.
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
    if chart_data:
        rates = [r['overall_rate'] for r in emp_rows]
        forecast = run_arima_forecast(rates, horizon=1)
        next_year = str(emp_rows[-1]['year'] + 1)
        chart_data.append({
            'year': next_year,
            'rate': forecast['forecast_values'][0],
            'forecast': True,
        })

    return jsonify({
        'metrics': {
            'total_alumni': total_alumni,
            'employment_rate': employment_rate,
            'employment_rate_change': 4.6,
            'graduate_success': 97.5,
            'margin_of_error': 1.1,
        },
        'employment_data': chart_data,
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
    all_users = [{
        'id': r['id'],
        'name': f"{r['first_name']} {r['last_name']}",
        'email': r['email'],
        'course': r['course'],
        'year': r['graduation_year'],
        'status': r['account_status'],
        'employed': bool(r['employed']),
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
    result = run_arima_forecast(rates, horizon=3, order=None)
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
        'model_used': result.get('model_used', 'ARIMA (p=2, d=1, q=2)'),
    }), 200


@admin_bp.route('/forecasting/run', methods=['POST'])
@admin_required
def run_forecasting():
    data = request.get_json()
    horizon = int(data.get('horizon', 3))
    model_str = data.get('model', 'ARIMA (2,1,2)')
    order = parse_order(model_str)

    db = get_db()
    emp_rows = db.execute(
        "SELECT year, overall_rate FROM employment_data ORDER BY year"
    ).fetchall()

    rates = [r['overall_rate'] for r in emp_rows]
    years = [r['year'] for r in emp_rows]

    result = run_arima_forecast(rates, horizon=horizon, order=order)

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
    requested_model = payload.get('model', 'rf')

    if features is None and user_id is not None:
        features = _alumni_features_from_db(db, user_id)
        if not features:
            return jsonify({'error': 'Alumni user not found'}), 404

    if not isinstance(features, dict):
        return jsonify({'error': 'Provide a features object or user_id'}), 400

    settings = _read_prediction_settings(db)
    use_voter_weights = settings['use_voter_weights']

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
    lr_metadata = train_logistic_regression(database_path=db_path)
    ml_predictor._load_models()
    return jsonify({
        'message': 'Models retrained successfully',
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
        lr_metadata = train_logistic_regression(database_path=db_path)
        ml_predictor._load_models()
        response['message'] = 'Dataset imported and models retrained'
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

    # Run ARIMA to get latest metrics
    emp_rows = db.execute(
        "SELECT overall_rate FROM employment_data ORDER BY year"
    ).fetchall()
    rates = [r['overall_rate'] for r in emp_rows]
    forecast_result = run_arima_forecast(rates, horizon=1)
    metrics = forecast_result['metrics']

    return jsonify({
        'reports': report_list,
        'metrics': {
            'mae': str(metrics['mae']),
            'rmse': str(metrics['rmse']),
            'mape': f"{metrics['mape']}%",
            'r2': str(metrics['r2']),
        },
    }), 200


@admin_bp.route('/predict-report/generate', methods=['POST'])
@admin_required
def generate_report():
    data = request.get_json()
    report_type = data.get('type', data.get('report_type', 'PDF'))
    year_range = data.get('year_range', '2019\u20132024')
    model_name = data.get('model', 'ARIMA (2,1,2)')

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
    fm = run_arima_forecast(rates, horizon=1)['metrics']

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
            'mape': f"{fm['mape']}%",
            'r2': str(fm['r2']),
        },
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

@admin_bp.route('/upload', methods=['POST'])
@admin_required
def upload_model():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    model_name = request.form.get('name', file.filename)
    apply_to_training = _is_truthy(request.form.get('apply_to_training'), default=False)
    retrain_after_import = _is_truthy(request.form.get('retrain_after_import'), default=True)

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

    if apply_to_training and not is_csv:
        return jsonify({'error': 'Training import is only supported for CSV files.'}), 400

    records = 0
    if is_csv:
        import csv
        try:
            with open(file_path, newline='', encoding='utf-8-sig') as f:
                records = max(sum(1 for _ in csv.reader(f)) - 1, 0)
        except (OSError, UnicodeDecodeError, csv.Error) as exc:
            return jsonify({'error': f'Unable to parse CSV rows: {exc}'}), 400

    db = get_db()
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

    if apply_to_training and is_csv:
        db_path = current_app.config.get('DATABASE', os.getenv('DATABASE', 'plp_alumni.db'))
        try:
            import_result = import_training_csv(
                database_path=db_path,
                csv_path=file_path,
                source_name=safe_name,
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
            lr_metadata = train_logistic_regression(database_path=db_path)
            ml_predictor._load_models()
            trained_models = {
                'rf': rf_metadata,
                'lr': lr_metadata,
            }
            training_policy = 'uploaded_csv_imported_and_retrained'

    upload_row = db.execute(
        "SELECT * FROM model_uploads WHERE id = ?",
        [cur.lastrowid],
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
        response['message'] = 'File uploaded, imported to training, and models retrained'

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
