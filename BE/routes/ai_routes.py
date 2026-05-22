from flask import request, jsonify, Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity
from ml.ai_service import AIService
from datetime import datetime

ai_bp = Blueprint('ai', __name__)
ai_service = AIService()

@ai_bp.route('/predict', methods=['GET'])
@jwt_required()
def get_predictions():
    try:
        user_id = get_jwt_identity()
        
        # Get prediction for next month
        prediction = ai_service.predict_next_month_expense(user_id)
        
        if not prediction:
            return jsonify({'error': 'Insufficient data for prediction'}), 400
        
        # Get category trends
        trends = ai_service.get_category_trends(user_id)
        
        # Get anomalies
        anomalies = ai_service.detect_anomalies(user_id)
        
        # Calculate change percentage
        df = ai_service.get_user_transactions_data(user_id)
        expense_df = df[df['type'] == 'expense']
        
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        current_expense = expense_df[
            (expense_df['month'] == current_month) & 
            (expense_df['year'] == current_year)
        ]['amount'].sum()
        
        change_percentage = float(((prediction['predicted_expense'] - current_expense) / current_expense * 100)) if current_expense > 0 else 0.0

        
        # Prepare alerts
        alerts = []
        
        income_df = df[df['type'] == 'income']
        current_income = float(income_df[
            (income_df['month'] == current_month) & 
            (income_df['year'] == current_year)
        ]['amount'].sum())
        
        # 1. Chi tiêu bất thường (anomalies)
        if anomalies:
            high_anomalies = [a for a in anomalies if a['is_high']]
            if high_anomalies:
                alerts.append(f"Found {len(high_anomalies)} unusually high transactions. Audit your transaction logs to spot discrepancies.")
        
        # 2. Dự báo chi tiêu tháng tới tăng vọt
        if prediction['predicted_expense'] > current_expense * 1.2:
            alerts.append(f"Next month's predicted expense is {abs(change_percentage):.0f}% higher than this month. Plan a tighter savings budget.")
            
        # 3. Cảnh báo thâm hụt tài chính (Negative Cash Flow)
        if current_income > 0 and current_expense > current_income:
            deficit = current_expense - current_income
            alerts.append(f"CRITICAL: Monthly expenses exceed income (Deficit of -${deficit:.2f}). Tighten your belt immediately!")
            
        # 4. Cảnh báo số dư thấp (Low Balance Warning)
        elif current_income > 0 and (current_income - current_expense) < (current_income * 0.1):
            balance = current_income - current_expense
            alerts.append(f"WARNING: Remaining balance is very low (only ${balance:.2f}, under 10% of total income). Postpone discretionary purchases.")
            
        # 5. Cảnh báo chi vượt ngân sách (Budget Overrun alerts)
        from models.models import Budget, Category
        budgets = Budget.query.filter_by(user_id=user_id, month=current_month, year=current_year).all()
        for budget in budgets:
            cat_id = budget.category_id
            cat_budget_amount = float(budget.amount)
            
            cat_expense_amount = float(expense_df[
                (expense_df['month'] == current_month) & 
                (expense_df['year'] == current_year) & 
                (expense_df['category_id'] == cat_id)
            ]['amount'].sum())
            
            if cat_budget_amount > 0 and cat_expense_amount > cat_budget_amount:
                category = Category.query.get(int(cat_id))
                category_name = category.name if category else f"Category #{cat_id}"
                overrun = cat_expense_amount - cat_budget_amount
                alerts.append(f"BUDGET BREACHED: Category '{category_name}' has exceeded its budget by ${overrun:.2f} (Spent ${cat_expense_amount:.2f} / Limit ${cat_budget_amount:.2f}).")
        
        return jsonify({
            'predicted_expense': prediction['predicted_expense'],
            'change_percentage': change_percentage,
            'top_category': prediction.get('top_category'),
            'top_category_amount': prediction.get('top_category_amount', 0),
            'category_comparison': trends,
            'anomalies': anomalies[:5],
            'alerts': alerts
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/recommendations', methods=['GET'])
@jwt_required()
def get_recommendations():
    try:
        user_id = get_jwt_identity()
        
        recommendations = ai_service.analyze_spending_patterns(user_id)
        
        return jsonify({
            'recommendations': recommendations
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ai_bp.route('/insights', methods=['GET'])
@jwt_required()
def get_insights():
    try:
        user_id = get_jwt_identity()
        
        trends = ai_service.get_category_trends(user_id)
        anomalies = ai_service.detect_anomalies(user_id)
        
        # Generate insights
        insights = {
            'total_categories': len(trends),
            'fastest_growing': max(trends, key=lambda x: x['change']) if trends else None,
            'fastest_declining': min(trends, key=lambda x: x['change']) if trends else None,
            'anomaly_count': len(anomalies),
            'top_spending_category': max(trends, key=lambda x: x['current']) if trends else None
        }
        
        return jsonify(insights), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500