import os
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
            return jsonify({
                'predicted_expense': 0.0,
                'change_percentage': 0.0,
                'top_category': 'None',
                'top_category_amount': 0.0,
                'category_comparison': [],
                'anomalies': [],
                'alerts': ["Welcome! Please start logging your transactions to unlock AI-powered expense forecasting, anomaly detection, and smart budget advice from your financial assistant."]
            }), 200
        
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

@ai_bp.route('/chat', methods=['POST'])
@jwt_required()
def ai_chat():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or not data.get('message'):
            return jsonify({'error': 'Message is required'}), 400
            
        message = data.get('message').strip()
        message_lower = message.lower()
        
        # Check if the query is in Vietnamese
        is_vietnamese = False
        vietnamese_keywords = [
            'chào', 'tiêu', 'tiền', 'thu nhập', 'lương', 'tiết kiệm', 'ngân sách', 'hạn mức',
            'khuyên', 'bất thường', 'cao nhất', 'giúp', 'tư vấn', 'phân tích', 'tài chính', 'danh mục'
        ]
        if any(kw in message_lower for kw in vietnamese_keywords) or any(c in message for c in ['á', 'à', 'ả', 'ã', 'ạ', 'é', 'è', 'ẻ', 'ẽ', 'ẹ', 'í', 'ì', 'ỉ', 'ĩ', 'ị', 'ó', 'ò', 'ỏ', 'õ', 'ọ', 'ú', 'ù', 'ủ', 'ũ', 'ụ', 'đ']):
            is_vietnamese = True
            
        # Fetch current user details
        from models.models import User, Category, Transaction, Budget
        user = User.query.get(user_id)
        user_name = user.name if user else "User"
        
        # Gather financial data
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        # Get user transactions
        transactions = Transaction.query.filter_by(user_id=user_id).all()
        
        # Current month transactions
        curr_trans = [t for t in transactions if t.date.month == current_month and t.date.year == current_year]
        
        # Spent and Income
        spent = sum(float(t.amount) for t in curr_trans if t.type == 'expense')
        income = sum(float(t.amount) for t in curr_trans if t.type == 'income')
        
        # Top Category spent this month
        cat_spent = {}
        for t in curr_trans:
            if t.type == 'expense':
                cat_spent[t.category_id] = cat_spent.get(t.category_id, 0.0) + float(t.amount)
                
        top_cat_name = "None"
        top_cat_spent = 0.0
        if cat_spent:
            top_cat_id = max(cat_spent, key=cat_spent.get)
            top_cat_spent = cat_spent[top_cat_id]
            category = Category.query.get(top_cat_id)
            if category:
                top_cat_name = category.name
                
        # Budgets
        budgets = Budget.query.filter_by(user_id=user_id, month=current_month, year=current_year).all()
        total_budget = sum(float(b.amount) for b in budgets)

        # Try Gemini conversational AI if configured
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                
                # Format detailed budget status
                budget_details = []
                overrun_count = 0
                for b in budgets:
                    cat = Category.query.get(b.category_id)
                    cat_name = cat.name if cat else "Other"
                    cat_spent_val = sum(float(t.amount) for t in curr_trans if t.type == 'expense' and t.category_id == b.category_id)
                    pct = (cat_spent_val / float(b.amount) * 100) if float(b.amount) > 0 else 0
                    status = "🟢 OK"
                    if pct >= 100:
                        status = "🔴 Vượt hạn mức (Breached)"
                        overrun_count += 1
                    elif pct >= 80:
                        status = "🟡 Cảnh báo sắp chạm trần (Warning)"
                    budget_details.append(f"- {cat_name}: Hạn mức: ${float(b.amount):.2f}, Đã tiêu: ${cat_spent_val:.2f} ({pct:.1f}%) -> Trạng thái: {status}")
                budget_details_str = "\n".join(budget_details) if budget_details else "Chưa thiết lập ngân sách danh mục nào."

                # Get Anomalies
                anomalies = ai_service.detect_anomalies(user_id)
                anomalies_list = []
                for a in anomalies[:5]:
                    anomalies_list.append(f"- Ngày: {a['date'][:10]} | Danh mục: {a['category']} | Số tiền: ${a['amount']:.2f} (Bất thường: {'Tăng vọt 📈' if a['is_high'] else 'Nhỏ lẻ'})")
                anomalies_str = "\n".join(anomalies_list) if anomalies_list else "Không phát hiện giao dịch bất thường nào."

                # Get ML-based recommendations
                recs = ai_service.analyze_spending_patterns(user_id)
                recs_list = []
                for r in recs:
                    recs_list.append(f"- {r['message']} (Tiết kiệm tiềm năng: ${r['potential_savings']:.2f}/tháng)")
                recs_str = "\n".join(recs_list) if recs_list else "Chưa có lời khuyên tiết kiệm cụ thể."

                # Build rich system instruction
                system_instruction = f"""You are the AI Financial Copilot, an intelligent, supportive, and friendly personal wealth advisor integrated into the Smart Expense Tracker app.
Your goal is to provide insightful, accurate, and highly personalized financial advice, and answer any user queries.

You have direct access to the user's real-time financial stats in our SQLite database:
- User Name: {user_name}
- Current Month/Year: {current_month}/{current_year}
- Total Spent This Month: ${spent:.2f}
- Total Income This Month: ${income:.2f}
- Net Cash Flow (Income - Spent): ${income - spent:.2f}
- Top Spending Category: {top_cat_name} (${top_cat_spent:.2f} spent)
- Active Budgets:
{budget_details_str}
- Number of Over-budget categories: {overrun_count}
- Recent Anomalous Transactions:
{anomalies_str}
- Smart Savings Recommendations:
{recs_str}

Guidelines:
1. Speak directly to the user as {user_name}.
2. Support full free-form conversational chat on any topic (replying in the user's language - e.g., English or Vietnamese depending on their query).
3. If they ask about their finances, give deep, clear insights referencing their real numbers.
4. If they ask generic questions (e.g. general chat, cooking, life, productivity), be extremely friendly and helpful, but try to tie it back to good financial habits, self-discipline, or budget preservation where natural.
5. Format all responses using beautiful Markdown. Use bolding, bullet points, headers, lists, and spacing to make it extremely readable and premium.
6. Be highly encouraging and empathetic. Avoid dry mechanical robot responses.
"""
                model = genai.GenerativeModel(
                    model_name="gemini-1.5-flash",
                    system_instruction=system_instruction
                )
                
                # Call Gemini
                response_obj = model.generate_content(message)
                reply = response_obj.text
                return jsonify({'response': reply}), 200
                
            except Exception as e:
                import logging
                logging.error(f"Gemini API Error: {str(e)}")
                # Fail gracefully and let local engine handle the request below

        # ==========================================
        # LOCAL RULE-BASED FALLBACK ENGINE
        # ==========================================
        response = ""
        
        if any(kw in message_lower for kw in ['hi', 'hello', 'chào', 'xin chào', 'greetings', 'bạn là ai', 'who are you', 'help', 'giúp']):
            # Greeting
            if is_vietnamese:
                response = f"Xin chào **{user_name}**! Tôi là **Trợ lý Tài chính AI** của bạn. 🧠🤖\n\nTôi có thể giúp bạn các việc sau:\n*   **Xem chi tiêu tháng này:** Gõ *'chi tiêu'* hoặc *'tôi đã tiêu bao nhiêu'*\n*   **Xem thu nhập:** Gõ *'thu nhập'* hoặc *'lương tháng này'*\n*   **Lời khuyên tiết kiệm:** Gõ *'tiết kiệm'* hoặc *'tư vấn tiết kiệm'*\n*   **Kiểm tra ngân sách:** Gõ *'ngân sách'* hoặc *'hạn mức'*\n*   **Danh mục chi nhiều nhất:** Gõ *'danh mục cao nhất'*\n\nHãy đặt câu hỏi cho tôi nhé!"
            else:
                response = f"Hello **{user_name}**! I am your **AI Financial Assistant**. 🧠🤖\n\nI can assist you with:\n*   **Analyze monthly spending:** Type *'spent'* or *'expenses'*\n*   **Check income:** Type *'income'* or *'salary'*\n*   **Smart savings advice:** Type *'save'* or *'saving advice'*\n*   **Verify budgets:** Type *'budget'* or *'limit'*\n*   **Find highest spending:** Type *'top category'*\n\nHow can I help you today?"
                
        elif any(kw in message_lower for kw in ['tiêu', 'spent', 'spending', 'expense', 'chi tiêu']):
            # Spending analysis
            cash_flow = income - spent
            if is_vietnamese:
                cash_flow_status = f"Dòng tiền thặng dư **+{cash_flow:.2f} USD** (Tốt! 🎉)" if cash_flow >= 0 else f"Dòng tiền thâm hụt **-{abs(cash_flow):.2f} USD** (Cần thắt lưng buộc bụng! ⚠️)"
                response = f"### 📊 Phân Tích Chi Tiêu Tháng {current_month}/{current_year}\n\n" \
                           f"*   **Tổng đã chi tiêu:** `{spent:.2f} USD`\n" \
                           f"*   **Tổng thu nhập:** `{income:.2f} USD`\n" \
                           f"*   **Trạng thái dòng tiền:** {cash_flow_status}\n" \
                           f"*   **Danh mục tiêu nhiều nhất:** *{top_cat_name}* (`{top_cat_spent:.2f} USD`)\n\n" \
                           f"💡 *Lời khuyên:* Bạn có thể gõ *'tiết kiệm'* để xem tư vấn phân bổ dòng tiền theo chuẩn 50/30/20!"
            else:
                cash_flow_status = f"Surplus of **+${cash_flow:.2f}** (Great! 🎉)" if cash_flow >= 0 else f"Deficit of **-${abs(cash_flow):.2f}** (Watch out! ⚠️)"
                response = f"### 📊 Spending Analysis for {datetime.now().strftime('%B %Y')}\n\n" \
                           f"*   **Total Spent:** `${spent:.2f}`\n" \
                           f"*   **Total Income:** `${income:.2f}`\n" \
                           f"*   **Cash Flow Status:** {cash_flow_status}\n" \
                           f"*   **Top Spending Category:** *{top_cat_name}* (`${top_cat_spent:.2f}`)\n\n" \
                           f"💡 *Tip:* Ask me for *'savings advice'* to see how to balance your budget!"

        elif any(kw in message_lower for kw in ['thu nhập', 'lương', 'income', 'salary', 'earned', 'earning']):
            # Income analysis
            income_sources = {}
            for t in curr_trans:
                if t.type == 'income':
                    cat = Category.query.get(t.category_id)
                    cat_name = cat.name if cat else "Other"
                    income_sources[cat_name] = income_sources.get(cat_name, 0.0) + float(t.amount)
            
            sources_text = ""
            if income_sources:
                for k, v in income_sources.items():
                    sources_text += f"*   **{k}:** `{v:.2f} USD`\n"
            else:
                sources_text = "*Chưa ghi nhận nguồn thu nhập nào trong tháng này.*" if is_vietnamese else "*No income recorded this month.*"
                
            if is_vietnamese:
                response = f"### 💰 Thu Nhập Tháng {current_month}/{current_year}\n\n" \
                           f"*   **Tổng thu nhập đã nhận:** `{income:.2f} USD`\n\n" \
                           f"**Chi tiết các nguồn thu:**\n{sources_text}\n" \
                           f"🎉 *Hãy tiếp tục đa dạng hóa các nguồn thu nhập để tích lũy tài sản nhanh hơn!*"
            else:
                response = f"### 💰 Income Analysis for {datetime.now().strftime('%B %Y')}\n\n" \
                           f"*   **Total Registered Income:** `${income:.2f}`\n\n" \
                           f"**Income Breakdown:**\n{sources_text}\n" \
                           f"🎉 *Keep diversifying your income sources to speed up your financial freedom!*"

        elif any(kw in message_lower for kw in ['tiết kiệm', 'khuyên', 'tư vấn', 'lời khuyên', 'save', 'saving', 'advice']):
            # Savings and 50/30/20 advice
            recs = ai_service.analyze_spending_patterns(user_id)
            recs_text = ""
            for r in recs:
                recs_text += f"*   {r['message']} *(Tiết kiệm tiềm năng: {r['potential_savings']:.2f} USD/tháng)*\n"
            
            if is_vietnamese:
                response = f"### 💡 Lời Khuyên Tài Chính & Tiết Kiệm từ AI\n\n" \
                           f"Dựa trên dữ liệu chi tiêu thực tế của bạn, đây là các gợi ý tối ưu tài chính:\n\n" \
                           f"{recs_text}\n" \
                           f"☘️ **Quy tắc phân bổ 50/30/20 tham khảo:**\n" \
                           f"*   **50% Thiết yếu (Needs):** Nhà cửa, ăn uống cơ bản, hóa đơn, đi lại.\n" \
                           f"*   **30% Phong cách sống (Wants):** Giải trí, mua sắm quần áo, cafe, xem phim.\n" \
                           f"*   **20% Tích lũy (Savings):** Tiết kiệm, đầu tư, quỹ khẩn cấp."
            else:
                response = f"### 💡 AI Savings & Financial Advice\n\n" \
                           f"Based on your actual spending data, here are customized recommendations:\n\n" \
                           f"{recs_text}\n" \
                           f"☘️ **50/30/20 Rule Guide:**\n" \
                           f"*   **50% Needs:** Rent, basic groceries, utilities, transportation.\n" \
                           f"*   **30% Wants:** Entertainment, shopping, hobbies, dining out.\n" \
                           f"*   **20% Savings:** Emergency fund, investments, debt payment."

        elif any(kw in message_lower for kw in ['ngân sách', 'hạn mức', 'budget', 'limit', 'limits']):
            # Budget analysis
            budget_details = ""
            overrun_count = 0
            
            for b in budgets:
                cat = Category.query.get(b.category_id)
                cat_name = cat.name if cat else "Other"
                
                # Calculate spent in this category
                cat_spent_val = sum(float(t.amount) for t in curr_trans if t.type == 'expense' and t.category_id == b.category_id)
                pct = (cat_spent_val / float(b.amount) * 100) if float(b.amount) > 0 else 0
                
                status_emoji = "🟢 OK"
                if pct >= 100:
                    status_emoji = "🔴 Vượt hạn mức! (Breached)"
                    overrun_count += 1
                elif pct >= 80:
                    status_emoji = "🟡 Sắp chạm trần (Warning)"
                
                budget_details += f"*   **{cat_name}:** Đã tiêu `{cat_spent_val:.2f} USD` / Hạn mức `{float(b.amount):.2f} USD` ({pct:.1f}%) -> {status_emoji}\n"
                
            if not budgets:
                budget_details = "*Bạn chưa thiết lập ngân sách danh mục nào cho tháng này.*" if is_vietnamese else "*You have not set any category budgets for this month.*"
                
            if is_vietnamese:
                alert_text = f"🚨 Cảnh báo: Bạn có **{overrun_count} danh mục** vượt quá ngân sách!" if overrun_count > 0 else "✅ Tuyệt vời! Bạn đang kiểm soát ngân sách rất tốt."
                response = f"### 🛡️ Trạng Thái Ngân Sách Tháng {current_month}/{current_year}\n\n" \
                           f"*   **Tổng ngân sách phân bổ:** `{total_budget:.2f} USD`\n" \
                           f"*   **Kết quả:** {alert_text}\n\n" \
                           f"**Chi tiết ngân sách từng danh mục:**\n{budget_details}"
            else:
                alert_text = f"🚨 Alert: You have **{overrun_count} category/categories** over budget!" if overrun_count > 0 else "✅ Great job! All categories are well within budget limits."
                response = f"### 🛡️ Budget Status for {datetime.now().strftime('%B %Y')}\n\n" \
                           f"*   **Total Allocated Budget:** `${total_budget:.2f}`\n" \
                           f"*   **Evaluation:** {alert_text}\n\n" \
                           f"**Category Budgets Breakdown:**\n{budget_details}"

        elif any(kw in message_lower for kw in ['danh mục cao nhất', 'chi nhiều nhất', 'top category', 'highest', 'cao nhất']):
            # Top category spending detail
            if top_cat_spent > 0:
                if is_vietnamese:
                    response = f"### 🏆 Danh Mục Chi Tiêu Cao Nhất\n\n" \
                               f"Tháng này, danh mục bạn chi tiêu nhiều nhất là **{top_cat_name}** với tổng số tiền là **{top_cat_spent:.2f} USD**.\n\n" \
                               f"💡 *Tư vấn từ AI:* Hãy xem xét lập hạn mức ngân sách nhỏ hơn cho **{top_cat_name}** trong mục 'Budgets' để tự động theo dõi dòng tiền hiệu quả hơn!"
                else:
                    response = f"### 🏆 Top Spending Category\n\n" \
                               f"This month, your highest spending category is **{top_cat_name}** with a total of **${top_cat_spent:.2f}**.\n\n" \
                               f"💡 *AI Financial Tip:* Consider setting a tighter budget limit for **{top_cat_name}** in your 'Budgets' dashboard to optimize your monthly cash flow!"

        elif any(kw in message_lower for kw in ['bất thường', 'anomaly', 'anomalies', 'unusual', 'spikes']):
            # Anomalies
            anomalies = ai_service.detect_anomalies(user_id)
            anom_text = ""
            for a in anomalies[:5]:
                anom_text += f"*   Ngày `{a['date'][:10]}`: Chi tiêu **{a['amount']:.2f} USD** ở danh mục *{a['category']}* (Bất thường: {'Tăng vọt 📈' if a['is_high'] else 'Nhỏ lẻ'})\n"
                
            if not anomalies:
                anom_text = "*Hệ thống chưa phát hiện bất kỳ giao dịch bất thường nào. Chi tiêu của bạn rất ổn định!*" if is_vietnamese else "*No anomalous transactions detected. Your spending is highly consistent!*"
                
            if is_vietnamese:
                response = f"### 🚨 Kiểm Trả Chi Tiêu Bất Thường (AI Anomaly Check)\n\n" \
                           f"Thuật toán AI (IQR) đã rà soát lịch sử giao dịch và rút ra kết quả:\n\n" \
                           f"{anom_text}"
            else:
                response = f"### 🚨 AI Anomaly Detection Check\n\n" \
                           f"Our AI machine learning algorithm scanned your logs and found:\n\n" \
                           f"{anom_text}"

        else:
            # General financial query fallback
            if is_vietnamese:
                response = f"### 🧠 Trợ Lý Tài Chính AI Tư Vấn\n\n" \
                           f"Cảm ơn câu hỏi của bạn: *\"{message}\"*\n\n" \
                           f"Là trợ lý tài chính cá nhân của bạn, đây là các nguyên tắc cốt lõi giúp bạn đạt được tự do tài chính:\n\n" \
                           f"1. **Thiết lập Quỹ khẩn cấp:** Duy trì tích lũy tương đương 3-6 tháng chi phí sinh hoạt tối thiểu để đề phòng rủi ro.\n" \
                           f"2. **Trả nợ có lãi suất cao:** Ưu tiên thanh toán các khoản vay tín dụng hoặc nợ lãi suất cao trước khi đầu tư.\n" \
                           f"3. **Tự động hóa đầu tư:** Trích ngay 10-20% thu nhập mỗi tháng để mua các tài sản tích lũy an toàn (như quỹ chỉ số, vàng, tiết kiệm kỳ hạn).\n" \
                           f"4. **Kiểm soát chi tiêu Phong cách sống:** Luôn giữ chi tiêu cho mua sắm giải trí dưới 30% tổng thu nhập.\n\n" \
                           f"👉 *Mẹo:* Bạn có thể hỏi tôi trực tiếp về **'chi tiêu'**, **'ngân sách'**, hoặc **'tiết kiệm'** của chính bạn để tôi phân tích số liệu thực tế nhé!"
            else:
                response = f"### 🧠 AI Financial Advisor Consultation\n\n" \
                           f"Thank you for your question: *\"{message}\"*\n\n" \
                           f"As your personal financial advisor, here are the key pillars to build your wealth and financial freedom:\n\n" \
                           f"1. **Emergency Fund First:** Keep 3 to 6 months of living expenses in a highly liquid account.\n" \
                           f"2. **Pay Down High-Interest Debt:** Prioritize credit cards or high-interest loans before starting to invest.\n" \
                           f"3. **Automate Your Savings:** Pay yourself first by routing 10-20% of your paycheck directly into savings or investments.\n" \
                           f"4. **Live Below Your Means:** Review subscriptions regularly and control discretionary shopping.\n\n" \
                           f"👉 *Tip:* You can ask me specific questions about your **'spent'**, **'budget'**, or **'savings'** to analyze your actual database records!"

        return jsonify({'response': response}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500