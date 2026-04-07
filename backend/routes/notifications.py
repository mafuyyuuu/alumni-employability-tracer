from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from database import get_db

notifs_bp = Blueprint('notifications', __name__)


@notifs_bp.route('', methods=['GET'])
@jwt_required()
def list_notifications():
    user_id = get_jwt_identity()
    db = get_db()
    rows = db.execute("""
        SELECT * FROM notifications WHERE user_id = ?
        ORDER BY created_at DESC
    """, [user_id]).fetchall()

    notifs = [{
        'id': r['id'],
        'title': r['title'],
        'message': r['message'],
        'is_read': bool(r['is_read']),
        'created_at': r['created_at'],
    } for r in rows]

    unread_count = sum(1 for n in notifs if not n['is_read'])
    return jsonify({'notifications': notifs, 'unread_count': unread_count}), 200


@notifs_bp.route('/<int:notif_id>/read', methods=['PUT'])
@jwt_required()
def mark_read(notif_id):
    user_id = get_jwt_identity()
    db = get_db()
    db.execute(
        'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
        [notif_id, user_id]
    )
    db.commit()
    return jsonify({'message': 'Marked as read'}), 200


@notifs_bp.route('/read-all', methods=['PUT'])
@jwt_required()
def mark_all_read():
    user_id = get_jwt_identity()
    db = get_db()
    db.execute(
        'UPDATE notifications SET is_read = 1 WHERE user_id = ?', [user_id]
    )
    db.commit()
    return jsonify({'message': 'All marked as read'}), 200
