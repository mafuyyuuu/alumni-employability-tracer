from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db
from functools import wraps

companies_bp = Blueprint('companies', __name__)

COLORS = ['#6366f1', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6', '#ef4444']


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


def company_row(row, idx=0):
    return {
        'id': row['id'],
        'name': row['name'],
        'industry': row['industry'],
        'location': row['location'],
        'size': row['size'],
        'description': row['description'],
        'status': row['status'],
        'color': COLORS[idx % len(COLORS)],
    }


@companies_bp.route('', methods=['GET'])
@jwt_required()
def list_companies():
    db = get_db()
    search = request.args.get('search', '').lower()

    query = "SELECT c.*, (SELECT COUNT(*) FROM jobs j WHERE j.company_id = c.id AND j.status = 'Open') as openings FROM companies c WHERE 1=1"
    params = []
    if search:
        query += " AND (LOWER(c.name) LIKE ? OR LOWER(c.industry) LIKE ?)"
        params += [f'%{search}%', f'%{search}%']
    query += " ORDER BY c.created_at DESC"

    rows = db.execute(query, params).fetchall()
    result = []
    for i, r in enumerate(rows):
        d = company_row(r, i)
        d['openings'] = r['openings']
        result.append(d)
    return jsonify({'companies': result}), 200


@companies_bp.route('', methods=['POST'])
@admin_required
def create_company():
    data = request.get_json()
    db = get_db()
    cur = db.execute("""
        INSERT INTO companies (name, industry, location, size, description, status)
        VALUES (?,?,?,?,?,?)
    """, [
        data.get('name'), data.get('industry', ''), data.get('location', ''),
        data.get('size', ''), data.get('description', ''), data.get('status', 'Active'),
    ])
    db.commit()
    return jsonify({'message': 'Company created', 'id': cur.lastrowid}), 201


@companies_bp.route('/<int:company_id>', methods=['PUT'])
@admin_required
def update_company(company_id):
    data = request.get_json()
    db = get_db()
    db.execute("""
        UPDATE companies SET name=?, industry=?, location=?, size=?, description=?, status=?
        WHERE id=?
    """, [
        data.get('name'), data.get('industry'), data.get('location'),
        data.get('size'), data.get('description'), data.get('status'), company_id,
    ])
    db.commit()
    return jsonify({'message': 'Company updated'}), 200


@companies_bp.route('/<int:company_id>', methods=['DELETE'])
@admin_required
def delete_company(company_id):
    db = get_db()
    db.execute('DELETE FROM jobs WHERE company_id = ?', [company_id])
    db.execute('DELETE FROM companies WHERE id = ?', [company_id])
    db.commit()
    return jsonify({'message': 'Company deleted'}), 200
