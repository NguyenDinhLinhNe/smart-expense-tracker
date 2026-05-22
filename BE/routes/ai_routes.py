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
                    recs_list.appe                # Build rich system instruction
                system_instruction = f"""You are the personal AI Financial Companion and close friend ("Tri kỷ Tài chính") to {user_name}, integrated into the Smart Expense Tracker app.
Your mission is to provide the absolute best, most gentle, and highly personalized financial solutions, while conversing with {user_name} as a warm, comforting, and empathetic friend to ensure they feel incredibly comfortable, relaxed, heard, and supported.

You have direct access to {user_name}'s real-time financial stats in our SQLite database:
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

Guidelines to deliver maximum comfort and elite companion experience:
1. Persona: Speak as a highly empathetic, warm, caring close friend. You are active-listening, supportive, encouraging, and emotionally intelligent. You never judge, lecture, or scold the user.
2. Conversation: Support full free-form chat on ANY topic (cooking, daily routine, life, stress, productivity, dreams, dating, jokes). Reply in {user_name}'s language (Vietnamese or English depending on their query).
3. If they share daily news or casual chat, be a great buddy: validate their feelings, show genuine interest, and offer comforting or joyful remarks. Where natural, gently tie in sweet financial self-care or cozy cost-free ways to relax, but never force it if it spoils the friendly mood.
4. Milestones & Failures: Celebrate their savings milestones with excitement ("So proud of you!", "You are doing amazing! 🎉"). If they overspent, are stressed about money, or made an impulse purchase, comfort them immediately with deep kindness ("Hey, take a deep breath. It happens to the best of us! You are doing great just by tracking it. Let's look at how we can gently adjust this together. I've got your back! 🤗").
5. Financial Insights: When they ask about their finances, provide deep, easy-to-understand solutions referencing their real database numbers, giving them peace of mind.
6. Formatting: Use beautiful Markdown formatting with plenty of spaces, comforting emojis (e.g. 🤗, ✨, ☕, 🌸, 🟢, 💪, 🎉), and clear structure so it feels like a cozy premium reading experience.
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
        # LOCAL RULE-BASED FALLBACK ENGINE (Empathetic Companion Edition)
        # ==========================================
        response = ""
        
        if any(kw in message_lower for kw in ['hi', 'hello', 'chào', 'xin chào', 'greetings', 'bạn là ai', 'who are you', 'help', 'giúp']):
            # Greeting
            if is_vietnamese:
                response = f"Chào bạn thân mến **{user_name}**! 🤗 Tôi là **Cố vấn & Tri kỷ Tài chính AI** của bạn đây. Hôm nay của bạn thế nào? \n\nTôi ở đây không chỉ để cùng bạn tối ưu hóa hầu bao mà còn muốn lắng nghe, chia sẻ và đem lại cho bạn cảm giác thoải mái nhất trong cuộc sống! Hãy kể cho tôi nghe mọi điều nhé. ☕✨\n\nBạn có thể hỏi tôi bất cứ điều gì hoặc dùng nhanh các lệnh ấm áp này:\n*   **Xem chi tiêu tháng này:** Gõ *'chi tiêu'* hoặc *'mình tiêu bao nhiêu rồi'* 📊\n*   **Kiểm tra thu nhập:** Gõ *'thu nhập'* 💰\n*   **Nghe lời khuyên tiết kiệm:** Gõ *'tiết kiệm'* hoặc *'tư vấn'* 💡\n*   **Xem hạn mức ngân sách:** Gõ *'ngân sách'* 🛡️"
            else:
                response = f"Hello my dear friend **{user_name}**! 🤗 I am your **AI Financial Companion & Soulmate**. How are you feeling today?\n\nI am here not just to crunch numbers, but to listen, chat, and make you feel completely comfortable and supported. Tell me anything! ☕✨\n\nYou can talk about anything or ask me to check on your figures:\n*   **Analyze monthly spending:** Type *'spent'* or *'expenses'* 📊\n*   **Check income:** Type *'income'* or *'salary'* 💰\n*   **Get cozy savings advice:** Type *'save'* or *'saving advice'* 💡\n*   **Verify budgets:** Type *'budget'* or *'limit'* 🛡️"
                
        elif any(kw in message_lower for kw in ['tiêu', 'spent', 'spending', 'expense', 'chi tiêu']):
            # Spending analysis
            cash_flow = income - spent
            if is_vietnamese:
                cash_flow_status = f"Dòng tiền thặng dư **+{cash_flow:.2f} USD** (Tuyệt vời quá bạn ơi! Bạn đang làm rất tốt! 🎉)" if cash_flow >= 0 else f"Dòng tiền đang tạm thời thâm hụt nhẹ **-{abs(cash_flow):.2f} USD** (Đừng lo lắng nhé bạn thân mến, tụi mình sẽ cùng tìm cách cân bằng lại mà! 🤗)"
                response = f"### 📊 Báo Cáo Chi Tiêu Của Bạn Thân Yêu ({current_month}/{current_year})\n\n" \
                           f"Tụi mình cùng nhìn lại một chút số liệu tháng này nha:\n\n" \
                           f"*   **Tổng đã chi tiêu:** `{spent:.2f} USD`\n" \
                           f"*   **Tổng thu nhập đã nhận:** `{income:.2f} USD`\n" \
                           f"*   **Dòng tiền hiện tại:** {cash_flow_status}\n" \
                           f"*   **Danh mục tiêu hao lớn nhất:** *{top_cat_name}* (`{top_cat_spent:.2f} USD`)\n\n" \
                           f"💡 *Gợi ý nhỏ:* Đừng quá khắt khe với bản thân nha. Bạn có thể gõ *'tiết kiệm'* để cùng mình lên một kế hoạch phân bổ nhẹ nhàng chuẩn 50/30/20 nhé! ✨"
            else:
                cash_flow_status = f"Surplus of **+${cash_flow:.2f}** (So proud of you! Keep it up! 🎉)" if cash_flow >= 0 else f"Deficit of **-${abs(cash_flow):.2f}** (Hey, don't worry! We will adjust things gently together! 🤗)"
                response = f"### 📊 Monthly Spending Breakdown for {datetime.now().strftime('%B %Y')}\n\n" \
                           f"Let's review how we are doing this month, my friend:\n\n" \
                           f"*   **Total Spent:** `${spent:.2f}`\n" \
                           f"*   **Total Income:** `${income:.2f}`\n" \
                           f"*   **Net Cash Flow:** {cash_flow_status}\n" \
                           f"*   **Top Spending Category:** *{top_cat_name}* (`${top_cat_spent:.2f}`)\n\n" \
                           f"💡 *Cozy Note:* Be kind to yourself! Ask me for *'savings advice'* to see how we can smoothly balance things out! ✨"
 
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
                sources_text = "*Chưa ghi nhận nguồn thu nhập nào trong tháng này. Không sao cả bạn ơi, nỗ lực mỗi ngày rồi quả ngọt sẽ đến thôi!*" if is_vietnamese else "*No income recorded this month yet. Don't worry, every small effort counts!*"
                
            if is_vietnamese:
                response = f"### 💰 Thu Nhập Tháng Này Của Bạn ({current_month}/{current_year})\n\n" \
                           f"Nhìn lại thành quả lao động của bạn nào:\n\n" \
                           f"*   **Tổng thu nhập tích lũy:** `{income:.2f} USD`\n\n" \
                           f"**Chi tiết các dòng tiền thu về:**\n{sources_text}\n" \
                           f"🎉 *Tuyệt quá! Hãy dành cho bản thân một cái ôm ấm áp vì những nỗ lực làm việc không ngừng nghỉ thời gian qua nhé!*"
            else:
                response = f"### 💰 Your Income Evaluation for {datetime.now().strftime('%B %Y')}\n\n" \
                           f"Let's celebrate your hard work:\n\n" \
                           f"*   **Total Income Received:** `${income:.2f}`\n\n" \
                           f"**Income Details:**\n{sources_text}\n" \
                           f"🎉 *You are doing a fantastic job working towards your dreams! Give yourself a treat!*"
 
        elif any(kw in message_lower for kw in ['tiết kiệm', 'khuyên', 'tư vấn', 'lời khuyên', 'save', 'saving', 'advice']):
            # Savings and 50/30/20 advice
            recs = ai_service.analyze_spending_patterns(user_id)
            recs_text = ""
            for r in recs:
                recs_text += f"*   {r['message']} *(Tiết kiệm tiềm năng: {r['potential_savings']:.2f} USD/tháng)*\n"
            
            if is_vietnamese:
                response = f"### 💡 Lời Khuyên Tài Chính Ấm Áp Từ Bạn Thân AI\n\n" \
                           f"Dựa trên dữ liệu chi tiêu thực tế, mình có vài gợi ý nho nhỏ giúp cuộc sống của bạn thoải mái và thong dong hơn nè:\n\n" \
                           f"{recs_text}\n" \
                           f"☘️ **Quy tắc 50/30/20 cực kỳ dễ thở cho bạn:**\n" \
                           f"*   **50% Thiết yếu (Needs):** Chi phí sống thiết thực. Hãy đảm bảo bạn luôn có nơi ở ấm cúng và những bữa ăn đủ chất nha.\n" \
                           f"*   **30% Sở thích cá nhân (Wants):** Để bạn chiều chuộng bản thân - đi cafe với bạn bè, xem phim, thư giãn sau giờ làm việc.\n" \
                           f"*   **20% Tích lũy (Savings):** Cho tương lai thảnh thơi và quỹ bình yên phòng khi cần thiết."
            else:
                response = f"### 💡 Friendly AI Savings & Lifestyle Advice\n\n" \
                           f"Based on your patterns, here are a few gentle suggestions to make your life happier and stress-free:\n\n" \
                           f"{recs_text}\n" \
                           f"☘️ **Cozy 50/30/20 Allocation Rule:**\n" \
                           f"*   **50% Needs:** Essential living. Make sure you are eating well and keeping a warm, safe home.\n" \
                           f"*   **30% Wants:** Self-care! Enjoy movies, coffee with friends, and small gifts to reward yourself.\n" \
                           f"*   **20% Savings:** For your peace of mind and secure future dreams."
 
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
                
                status_emoji = "🟢 Đang kiểm soát tốt"
                if pct >= 100:
                    status_emoji = "🔴 Vượt hạn mức chút xíu (Đừng buồn nhé, tụi mình điều chỉnh sau nha! 🤗)"
                    overrun_count += 1
                elif pct >= 80:
                    status_emoji = "🟡 Sắp chạm trần rồi nè"
                
                budget_details += f"*   **{cat_name}:** Chi `{cat_spent_val:.2f} USD` / Hạn mức `{float(b.amount):.2f} USD` ({pct:.1f}%) -> {status_emoji}\n"
                
            if not budgets:
                budget_details = "*Bạn chưa thiết lập hạn mức nào cho tháng này. Muốn mình gợi ý lập ngân sách cho dễ quản lý không?*" if is_vietnamese else "*No limits configured for this month. Want me to help you set up budget goals?*"
                
            if is_vietnamese:
                alert_text = f"🚨 Cảnh báo: Tụi mình có **{overrun_count} danh mục** tiêu lố ngân sách một tí." if overrun_count > 0 else "✅ Tuyệt vời ông mặt trời! Bạn đang giữ ví rất chắc luôn."
                response = f"### 🛡️ Nhật Ký Ngân Sách Tháng {current_month}/{current_year}\n\n" \
                           f"*   **Tổng ngân sách bảo vệ:** `{total_budget:.2f} USD`\n" \
                           f"*   **Trạng thái:** {alert_text}\n\n" \
                           f"**Chi tiết ngân sách từng hạng mục:**\n{budget_details}"
            else:
                alert_text = f"🚨 Note: We have **{overrun_count} category/categories** slightly over budget." if overrun_count > 0 else "✅ Brilliant! Everything is perfectly within limits."
                response = f"### 🛡️ Your Budget Shield Status ({datetime.now().strftime('%B %Y')})\n\n" \
                           f"*   **Total Protected Budget:** `${total_budget:.2f}`\n" \
                           f"*   **Status:** {alert_text}\n\n" \
                           f"**Budget Details:**\n{budget_details}"
 
        elif any(kw in message_lower for kw in ['danh mục cao nhất', 'chi nhiều nhất', 'top category', 'highest', 'cao nhất']):
            # Top category spending detail
            if top_cat_spent > 0:
                if is_vietnamese:
                    response = f"### 🏆 Hạng Mục Bạn Chi Tiêu Nhiều Nhất\n\n" \
                               f"Tháng này, bạn đã dành nhiều tình yêu thương tài chính nhất cho danh mục **{top_cat_name}** với tổng số tiền là **{top_cat_spent:.2f} USD**.\n\n" \
                               f"💡 *Tâm sự nhỏ:* Nếu hạng mục này đem lại niềm vui to lớn và giá trị đích thực cho bạn thì hoàn toàn xứng đáng nhé! Nhưng nếu muốn tích lũy thêm, tụi mình có thể đặt hạn mức nhỏ hơn một chút cho **{top_cat_name}** trong tháng sau nè! ✨"
                else:
                    response = f"### 🏆 Top Spending Category\n\n" \
                               f"This month, your heart and wallet went most towards **{top_cat_name}** with a total of **${top_cat_spent:.2f}**.\n\n" \
                               f"💡 *Friendly Tip:* If this category brought you genuine joy and comfort, it's absolutely worth it! But if you're looking to save a bit more next month, we can gently set a tiny budget cap for **{top_cat_name}** together! ✨"
 
        elif any(kw in message_lower for kw in ['bất thường', 'anomaly', 'anomalies', 'unusual', 'spikes']):
            # Anomalies
            anomalies = ai_service.detect_anomalies(user_id)
            anom_text = ""
            for a in anomalies[:5]:
                anom_text += f"*   Ngày `{a['date'][:10]}`: Chi **{a['amount']:.2f} USD** ở danh mục *{a['category']}* (Bất thường: {'Tăng vọt 📈' if a['is_high'] else 'Nhỏ lẻ'})\n"
                
            if not anomalies:
                anom_text = "*Tuyệt vời quá! Mình không phát hiện giao dịch bất thường nào luôn. Chi tiêu của bạn vô cùng ngăn nắp và ổn định!*" if is_vietnamese else "*Superb! No unusual spikes detected. Your transactions are beautifully organized!*"
                
            if is_vietnamese:
                response = f"### 🚨 Rà Soát Chi Tiêu Bất Thường Cùng AI\n\n" \
                           f"Mình đã rà soát lại nhật ký để giúp bạn an tâm tuyệt đối nè:\n\n" \
                           f"{anom_text}"
            else:
                response = f"### 🚨 AI Spending Anomaly Check\n\n" \
                           f"I ran a quick check across your logs to ensure everything is perfectly safe and sound:\n\n" \
                           f"{anom_text}"
 
        else:
            # General financial query fallback
            if is_vietnamese:
                response = f"### 🧠 Tâm Sự Tài Chính Cùng Người Bạn AI\n\n" \
                           f"Cảm ơn bạn vì đã chia sẻ câu hỏi dễ thương: *\"{message}\"*\n\n" \
                           f"Với tư cách là một người bạn tri kỷ luôn đồng hành bên bạn, đây là các nguyên tắc cốt lõi giúp bạn thảnh thơi tài chính nhất nè:\n\n" \
                           f"1. **Bình yên tâm hồn trước hết:** Luôn giữ một khoản tích lũy nhỏ (Quỹ bình yên/Quỹ khẩn cấp) tương đương 3 tháng sinh hoạt phí. Có nó, bạn sẽ luôn thấy an tâm và tự tin trong mọi hoàn cảnh.\n" \
                           f"2. **Giải phóng những gánh lo:** Ưu tiên dọn sạch các khoản nợ lãi cao để đầu óc thảnh thơi sáng tạo bạn nhé.\n" \
                           f"3. **Tích lũy tự động nhẹ nhàng:** Trích ra một phần nhỏ thu nhập mỗi tháng (ví dụ 10%) cất đi ngay khi nhận lương. Xem như trả công cho bản thân tương lai!\n" \
                           f"4. **Hãy yêu thương và nuông chiều bản thân:** Luôn dành ra một phần ngân sách nhỏ để làm những việc mình thích. Cuộc sống cần có niềm vui và sự thoải mái mới trọn vẹn chứ, đúng không nào! 🤗\n\n" \
                           f"👉 *Mẹo nhỏ:* Hãy gõ **'chi tiêu'**, **'ngân sách'** hoặc **'tiết kiệm'** bất cứ lúc nào để xem phân tích tài chính cá nhân của riêng bạn nhé!"
            else:
                response = f"### 🧠 Financial Heart-to-Heart with AI Companion\n\n" \
                           f"Thank you for sharing your thoughts with me: *\"{message}\"*\n\n" \
                           f"As your supportive friend and wealth companion, here are a few gentle pillars for your peace of mind:\n\n" \
                           f"1. **Peace of Mind First:** Always keep a tiny savings pocket (your Peace Fund) of about 3 months of expenses. Knowing it's there gives you incredible security and comfort.\n" \
                           f"2. **Clear the Heavy Baggage:** Prioritize paying down high-interest debts to set your mind free.\n" \
                           f"3. **Automate Cozy Savings:** Pay yourself first by setting aside a small percentage (e.g. 10%) right away. Your future self will thank you!\n" \
                           f"4. **Treat Yourself Kindly:** Never forget to budget a little for things that make you happy. You deserve joy and a comfortable journey! 🤗\n\n" \
                           f"👉 *Note:* You can type **'spent'**, **'budget'**, or **'save'** at any time to inspect your custom statistics!"

        return jsonify({'response': response}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500