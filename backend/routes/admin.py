import os
from datetime import datetime
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db
from ml.arima_model import run_arima_forecast, parse_order
from ml.train_lr import run_lr_forecast
from ml.predictor import predict_employability
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
        forecast = run_lr_forecast(rates, horizon=1)
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
    result = run_lr_forecast(rates, horizon=3)
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
    }), 200


@admin_bp.route('/forecasting/run', methods=['POST'])
@admin_required
def run_forecasting():
    data = request.get_json()
    horizon = int(data.get('horizon', 3))
    model_str = data.get('model', 'Linear Regression')
    order = parse_order(model_str)

    db = get_db()
    emp_rows = db.execute(
        "SELECT year, overall_rate FROM employment_data ORDER BY year"
    ).fetchall()

    rates = [r['overall_rate'] for r in emp_rows]
    years = [r['year'] for r in emp_rows]

    if model_str.strip().lower() == 'linear regression':
        result = run_lr_forecast(rates, horizon=horizon)
    else:
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

    # Run Linear Regression to get latest metrics
    emp_rows = db.execute(
        "SELECT overall_rate FROM employment_data ORDER BY year"
    ).fetchall()
    rates = [r['overall_rate'] for r in emp_rows]
    forecast_result = run_lr_forecast(rates, horizon=1)
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
    if model_name.strip().lower() == 'linear regression':
        fm = run_lr_forecast(rates, horizon=1)['metrics']
    else:
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
    rows = db.execute(
        "SELECT * FROM voter_config ORDER BY id"
    ).fetchall()

    fields = [{
        'id': r['id'],
        'name': r['field_name'],
        'key': r['field_key'],
        'enabled': bool(r['enabled']),
        'weight': r['weight'],
    } for r in rows]

    return jsonify({'config': fields}), 200


@admin_bp.route('/voter-config', methods=['PUT'])
@admin_required
def update_voter_config():
    data = request.get_json()
    fields = data.get('config', data.get('fields', []))
    db = get_db()

    for field in fields:
        db.execute("""
            UPDATE voter_config SET enabled = ?, weight = ? WHERE field_key = ?
        """, [int(field.get('enabled', True)), field.get('weight', 0), field['key']])

    db.commit()
    return jsonify({'message': 'Voter configuration saved'}), 200


# ── Upload Model ───────────────────────────────────────────────────────────

@admin_bp.route('/upload', methods=['POST'])
@admin_required
def upload_model():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    model_name = request.form.get('name', file.filename)

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    upload_folder = current_app.config.get('UPLOAD_FOLDER', 'uploads')
    os.makedirs(upload_folder, exist_ok=True)

    safe_name = file.filename.replace(' ', '_')
    file_path = os.path.join(upload_folder, safe_name)
    file.save(file_path)
    file_size = os.path.getsize(file_path)

    # Count rows if CSV
    records = 0
    if safe_name.endswith('.csv'):
        try:
            import csv
            with open(file_path, newline='', encoding='utf-8-sig') as f:
                records = sum(1 for _ in csv.reader(f)) - 1
        except Exception:
            records = 0

    db = get_db()
    cur = db.execute("""
        INSERT INTO model_uploads (name, original_filename, file_size, records, status)
        VALUES (?,?,?,?,?)
    """, [model_name, safe_name, file_size, records, 'Active'])
    db.commit()

    return jsonify({
        'message': 'File uploaded successfully',
        'id': cur.lastrowid,
        'name': model_name,
        'filename': safe_name,
        'size': file_size,
        'records': records,
    }), 201


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
    } for r in rows]

    return jsonify({'uploads': uploads}), 200
