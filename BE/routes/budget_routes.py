from flask import request, jsonify, Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.models import db, Budget, Category, Transaction
from sqlalchemy import func
from datetime import datetime
import calendar
from datetime import date
from models.models import User

budget_bp = Blueprint('budgets', __name__)

@budget_bp.route('', methods=['GET'])
@jwt_required()
def get_budgets():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 401
        
        month = request.args.get('month', datetime.now().month, type=int)
        year = request.args.get('year', datetime.now().year, type=int)
        
        budgets = Budget.query.filter_by(
            user_id=user_id,
            month=month,
            year=year
        ).all()
        
        # Calculate spent amount for each budget
        result = []
        for budget in budgets:

            # Inside get_budgets:
            days_in_month = calendar.monthrange(year, month)[1]
            start_date = date(year, month, 1)
            end_date = date(year, month, days_in_month)

            spent = db.session.query(func.sum(Transaction.amount)).filter(
                Transaction.user_id == user_id,
                Transaction.category_id == budget.category_id,
                Transaction.type == 'expense',
                Transaction.date >= start_date,
                Transaction.date <= end_date
            ).scalar() or 0
            
            result.append({
                **budget.to_dict(),
                'spent': float(spent),
                'remaining': float(budget.amount) - float(spent),
                'percentage': (float(spent) / float(budget.amount)) * 100 if budget.amount > 0 else 0
            })
        
        return jsonify({'budgets': result}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@budget_bp.route('', methods=['POST'])
@jwt_required()
def create_budget():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        required = ['category_id', 'amount', 'month', 'year']
        for field in required:
            if field not in data:
                return jsonify({'error': f'Missing {field}'}), 400
        
        # Check if budget exists for this category/month
        existing = Budget.query.filter_by(
            user_id=user_id,
            category_id=data['category_id'],
            month=data['month'],
            year=data['year']
        ).first()
        
        if existing:
            existing.amount = data['amount']
            db.session.commit()
            return jsonify({
                'message': 'Budget updated successfully',
                'budget': existing.to_dict()
            }), 200
        
        budget = Budget(
            user_id=user_id,
            category_id=data['category_id'],
            amount=data['amount'],
            month=data['month'],
            year=data['year']
        )
        
        db.session.add(budget)
        db.session.commit()
        
        return jsonify({
            'message': 'Budget created successfully',
            'budget': budget.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@budget_bp.route('/<int:budget_id>', methods=['PUT'])
@jwt_required()
def update_budget(budget_id):
    try:
        user_id = get_jwt_identity()
        budget = Budget.query.filter_by(id=budget_id, user_id=user_id).first()
        
        if not budget:
            return jsonify({'error': 'Budget not found'}), 404
        
        data = request.get_json()
        
        if 'amount' in data:
            budget.amount = data['amount']
        
        db.session.commit()
        
        return jsonify({
            'message': 'Budget updated successfully',
            'budget': budget.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@budget_bp.route('/<int:budget_id>', methods=['DELETE'])
@jwt_required()
def delete_budget(budget_id):
    try:
        user_id = get_jwt_identity()
        budget = Budget.query.filter_by(id=budget_id, user_id=user_id).first()
        
        if not budget:
            return jsonify({'error': 'Budget not found'}), 404
        
        db.session.delete(budget)
        db.session.commit()
        
        return jsonify({'message': 'Budget deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500