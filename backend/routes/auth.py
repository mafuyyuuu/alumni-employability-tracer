from flask import Blueprint, jsonify, request
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import bcrypt
from database import get_db

auth_bp = Blueprint('auth', __name__)


def _check_password(plain, hashed):
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _user_to_dict(row):
    return {
        'id': row['id'],
        'first_name': row['first_name'],
        'middle_name': row['middle_name'],
        'last_name': row['last_name'],
        'email': row['email'],
        'role': row['role'],
        'course': row['course'],
        'graduation_year': row['graduation_year'],
        'employed': bool(row['employed']),
        'account_status': row['account_status'],
    }


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    db = get_db()
    user = db.execute(
        'SELECT * FROM users WHERE LOWER(email) = ?', [email]
    ).fetchone()

    if not user or not _check_password(password, user['password_hash']):
        return jsonify({'error': 'Invalid email or password'}), 401

    if user['account_status'] == 'Inactive':
        return jsonify({'error': 'Account is inactive. Contact admin.'}), 403

    token = create_access_token(identity=str(user['id']))
    return jsonify({'token': token, 'user': _user_to_dict(user)}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE id = ?', [user_id]).fetchone()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    return jsonify({'user': _user_to_dict(user)}), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    # JWT is stateless; client should discard the token
    return jsonify({'message': 'Logged out'}), 200
