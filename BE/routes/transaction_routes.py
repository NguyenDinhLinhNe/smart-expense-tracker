from flask import Blueprint
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.models import db, Transaction, Category
from datetime import datetime, timedelta
from models.models import User

transaction_bp = Blueprint('transactions', __name__)

@transaction_bp.route('', methods=['GET'])
@jwt_required()
def get_transactions():
    try:
        user_id = get_jwt_identity()

        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 401
        
        # Get query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        category_id = request.args.get('category_id')
        type_filter = request.args.get('type')
        
        query = Transaction.query.filter_by(user_id=user_id)
        
        if start_date:
            query = query.filter(Transaction.date >= start_date)
        if end_date:
            query = query.filter(Transaction.date <= end_date)
        if category_id:
            query = query.filter_by(category_id=category_id)
        if type_filter:
            query = query.filter_by(type=type_filter)
        
        transactions = query.order_by(Transaction.date.desc()).all()
        
        return jsonify({
            'transactions': [t.to_dict() for t in transactions],
            'total': len(transactions)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@transaction_bp.route('', methods=['POST'])
@jwt_required()
def create_transaction():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # Validate
        required = ['amount', 'type', 'category_id', 'date']
        for field in required:
            if field not in data:
                return jsonify({'error': f'Missing {field}'}), 400
        
        # Check category belongs to user
        category = Category.query.filter(
                (Category.id == data['category_id']) &
                ((Category.user_id == user_id) | (Category.user_id.is_(None)))
            ).first()
        
        if not category:
            return jsonify({'error': 'Invalid category'}), 400
        
        transaction = Transaction(
            user_id=user_id,
            category_id=data['category_id'],
            amount=data['amount'],
            type=data['type'],
            note=data.get('note', ''),
            date=datetime.strptime(data['date'], '%Y-%m-%d')
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        return jsonify({
            'message': 'Transaction created',
            'transaction': transaction.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@transaction_bp.route('/<int:transaction_id>', methods=['PUT'])
@jwt_required()
def update_transaction(transaction_id):
    try:
        user_id = get_jwt_identity()
        transaction = Transaction.query.filter_by(
            id=transaction_id,
            user_id=user_id
        ).first()
        
        if not transaction:
            return jsonify({'error': 'Transaction not found'}), 404
        
        data = request.get_json()
        
        if 'amount' in data:
            transaction.amount = data['amount']
        if 'type' in data:
            transaction.type = data['type']
        if 'category_id' in data:
            transaction.category_id = data['category_id']
        if 'note' in data:
            transaction.note = data['note']
        if 'date' in data:
            transaction.date = datetime.strptime(data['date'], '%Y-%m-%d')
        
        db.session.commit()
        
        return jsonify({
            'message': 'Transaction updated',
            'transaction': transaction.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@transaction_bp.route('/<int:transaction_id>', methods=['DELETE'])
@jwt_required()
def delete_transaction(transaction_id):
    try:
        user_id = get_jwt_identity()
        transaction = Transaction.query.filter_by(
            id=transaction_id,
            user_id=user_id
        ).first()
        
        if not transaction:
            return jsonify({'error': 'Transaction not found'}), 404
        
        db.session.delete(transaction)
        db.session.commit()
        
        return jsonify({'message': 'Transaction deleted'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500