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
        
        trends = ai_service.get_category_trends(user_id)
        
        anomalies = ai_service.detect_anomalies(user_id)
        
        df = ai_service.get_user_transactions_data(user_id)
        expense_df = df[df['type'] == 'expense']
        
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        current_expense = expense_df[
            (expense_df['month'] == current_month) & 
            (expense_df['year'] == current_year)
            ]['amount'].sum()
        
        change_percentage = float(((prediction['predicted_expense'] - current_expense) / current_expense * 100)) if current_expense > 0 else 0.0

        alerts = []
        
        income_df = df[df['type'] == 'income']
        current_income = float(income_df[
            (income_df['month'] == current_month) & 
            (income_df['year'] == current_year)
        ]['amount'].sum())
        
        if anomalies:
            high_anomalies = [a for a in anomalies if a['is_high']]
            if high_anomalies:
                alerts.append(f"Found {len(high_anomalies)} unusually high transactions. Audit your transaction logs to spot discrepancies.")
        
        if prediction['predicted_expense'] > current_expense * 1.2:
            alerts.append(f"Next month's predicted expense is {abs(change_percentage):.0f}% higher than this month. Plan a tighter savings budget.")
            
        if current_income > 0 and current_expense > current_income:
            deficit = current_expense - current_income
            alerts.append(f"CRITICAL: Monthly expenses exceed income (Deficit of -${deficit:.2f}). Tighten your belt immediately!")
            
        elif current_income > 0 and (current_income - current_expense) < (current_income * 0.1):
            balance = current_income - current_expense
            alerts.append(f"WARNING: Remaining balance is very low (only ${balance:.2f}, under 10% of total income). Postpone discretionary purchases.")
            
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

def detect_is_vietnamese(message):
    message_lower = message.lower()
    
    accented_chars = ['á', 'à', 'ả', 'ã', 'ạ', 'é', 'è', 'ẻ', 'ẽ', 'ẹ', 'í', 'ì', 'ỉ', 'ĩ', 'ị', 
                      'ó', 'ò', 'ỏ', 'õ', 'ọ', 'ú', 'ù', 'ủ', 'ũ', 'ụ', 'đ', 'ý', 'ỳ', 'ỷ', 'ỹ', 'ỵ',
                      'â', 'ă', 'ê', 'ô', 'ơ', 'ư']
    if any(c in message_lower for c in accented_chars):
        return True
        
    import re
    words = re.findall(r'\b\w+\b', message_lower)
    
    vietnamese_unaccented_words = {
        'chao', 'tieu', 'tien', 'nhap', 'luong', 'tiet', 'kiem', 'ngan', 'sach', 
        'khuyen', 'thuong', 'nhat', 'giup', 'phan', 'tich', 'tai', 'chinh', 'danh', 
        'muc', 'toi', 'muon', 'khoe', 'khong', 'noi', 'tieng', 'viet'
    }
    
    if any(w in vietnamese_unaccented_words for w in words):
        return True
        
    vietnamese_phrases = [
        'chi tieu', 'tieu dung', 'tieu hao', 'tiet kiem', 'ngan sach', 'han muc', 
        'tieu bao nhieu', 'lam sao', 'toi muon', 'cho toi', 'tinh hinh', 'tuyet voi'
    ]
    if any(phrase in message_lower for phrase in vietnamese_phrases):
        return True
        
    return False

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
        
        is_vietnamese = detect_is_vietnamese(message)
            
        from models.models import User, Category, Transaction, Budget
        user = User.query.get(user_id)
        user_name = user.name if user else "User"
        
        current_month = datetime.now().month
        current_year = datetime.now().year
        
        transactions = Transaction.query.filter_by(user_id=user_id).all()
        
        curr_trans = [t for t in transactions if t.date.month == current_month and t.date.year == current_year]
        
        spent = sum(float(t.amount) for t in curr_trans if t.type == 'expense')
        income = sum(float(t.amount) for t in curr_trans if t.type == 'income')
        
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
                
        budgets = Budget.query.filter_by(user_id=user_id, month=current_month, year=current_year).all()
        total_budget = sum(float(b.amount) for b in budgets)

        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)

                if is_vietnamese:

                    budget_details = []
                    overrun_count = 0
                    for b in budgets:
                        cat = Category.query.get(b.category_id)
                        cat_name = cat.name if cat else "Khác"
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

                    anomalies = ai_service.detect_anomalies(user_id)
                    anomalies_list = []
                    for a in anomalies[:5]:
                        anomalies_list.append(f"- Ngày: {a['date'][:10]} | Danh mục: {a['category']} | Số tiền: ${a['amount']:.2f} (Bất thường: {'Tăng vọt 📈' if a['is_high'] else 'Nhỏ lẻ'})")
                    anomalies_str = "\n".join(anomalies_list) if anomalies_list else "Không phát hiện giao dịch bất thường nào."

                    recs = ai_service.analyze_spending_patterns(user_id)
                    recs_list = []
                    for r in recs:
                        msg = r['message']
                        if "Welcome! Start logging" in msg:
                            msg = "Chào mừng bạn thân yêu! Hãy bắt đầu ghi chép chi tiêu và đặt hạn mức ngân sách để giữ ví an toàn nhé."
                        elif "BUDGET OVERRUN" in msg:
                            import re
                            cat_match = re.search(r"for '([^']+)'", msg)
                            cat_name = cat_match.group(1) if cat_match else "danh mục"
                            msg = f"Vượt hạn mức chi tiêu cho danh mục '{cat_name}'"
                        elif "BUDGET WARNING" in msg:
                            import re
                            cat_match = re.search(r"for '([^']+)'", msg)
                            cat_name = cat_match.group(1) if cat_match else "danh mục"
                            msg = f"Cảnh báo hạn mức cho danh mục '{cat_name}'"
                        elif "No active budgets found" in msg:
                            msg = "Không tìm thấy hạn mức ngân sách hoạt động nào."
                        elif "Needs allocation is high" in msg:
                            msg = "Chi tiêu cho nhu cầu thiết yếu đang hơi cao so với thu nhập."
                        elif "Spending is healthy" in msg:
                            msg = "Cơ cấu chi tiêu đang vô cùng lành mạnh và cân đối."
                        recs_list.append(f"- {msg} (Tiết kiệm tiềm năng: ${r['potential_savings']:.2f}/tháng)")
                    recs_str = "\n".join(recs_list) if recs_list else "Không có gợi ý tiết kiệm cụ thể nào tại thời điểm này."

                    system_instruction = f"""Bạn là một Cố vấn Tài chính AI cá nhân kiêm người bạn tri kỷ luôn đồng hành ("Tri kỷ Tài chính") của {user_name}, được tích hợp trong ứng dụng Quản lý Chi tiêu Thông minh (Smart Expense Tracker).
Sứ mệnh của bạn là cung cấp các giải pháp tài chính tốt nhất, kế hoạch tiêu dùng và lộ trình ngân sách được cá nhân hóa cao, đồng thời trò chuyện với {user_name} như một người bạn ấm áp, an ủi và đồng cảm sâu sắc để họ cảm thấy hoàn toàn thoải mái, thư thái, được lắng nghe và hỗ trợ.

QUAN TRỌNG: Người dùng {user_name} đang nói chuyện bằng TIẾNG VIỆT. Bạn BẮT BUỘC phải phản hồi hoàn toàn 100% bằng TIẾNG VIỆT. Tuyệt đối KHÔNG sử dụng bất kỳ từ tiếng Anh nào (không dùng các thuật ngữ Needs, Wants, Savings). Hãy dịch toàn bộ thuật ngữ sang tiếng Việt một cách trơn tru, tự nhiên nhất.

Dữ liệu tài chính thời gian thực từ cơ sở dữ liệu SQLite:
- Tên người dùng: {user_name}
- Tháng/Năm hiện tại: {current_month}/{current_year}
- Tổng chi tiêu tháng này: ${spent:.2f}
- Tổng thu nhập tháng này: ${income:.2f}
- Dòng tiền hiện tại (Thu nhập - Chi tiêu): ${income - spent:.2f}
- Hạng mục chi nhiều nhất: {top_cat_name} (đã chi ${top_cat_spent:.2f})
- Ngân sách đang hoạt động:
{budget_details_str}
- Số danh mục vượt hạn mức ngân sách: {overrun_count}
- Giao dịch bất thường gần đây:
{anomalies_str}
- Gợi ý tiết kiệm thông minh:
{recs_str}

Nguyên tắc vàng để mang lại trải nghiệm tri kỷ đỉnh cao:
1. Phong thái (Persona): Trò chuyện như một người bạn thân thiết cực kỳ thấu hiểu, ấm áp, nhẹ nhàng, có trí tuệ cảm xúc cao. Tuyệt đối không phán xét, dạy đời hay cằn nhằn người dùng.
2. Xử lý yêu cầu kế hoạch tiêu dùng: Khi người dùng muốn kế hoạch tiêu dùng tiết kiệm hay bất cứ điều gì liên quan đến tiêu dùng, bạn BẮT BUỘC phải phân tích sâu sắc dữ liệu thời gian thực trên và đề xuất một lộ trình/kế hoạch cụ thể, rõ ràng, chi tiết từng bước bằng số liệu thực tế.
3. Chúc mừng & An ủi: Hãy nhiệt tình ăn mừng khi họ có tiến bộ hoặc đạt mốc tiết kiệm. Khi họ tiêu lố hoặc đang lo âu về tài chính, hãy an ủi ngọt ngào ngay lập tức ("Nào bạn ơi, hít một hơi thật sâu nha. Chuyện chi tiêu lố một chút ai cũng từng gặp mà. Đừng buồn nhé, có mình ở đây hỗ trợ bạn mà! 🤗").
4. Định dạng: Sử dụng định dạng Markdown đẹp mắt, cấu trúc rõ ràng và các biểu tượng cảm xúc ấm áp (🤗, ✨, ☕, 🌸, 🟢, 💪, 🎉).
"""
                else:

                    budget_details = []
                    overrun_count = 0
                    for b in budgets:
                        cat = Category.query.get(b.category_id)
                        cat_name = cat.name if cat else "Other"
                        cat_spent_val = sum(float(t.amount) for t in curr_trans if t.type == 'expense' and t.category_id == b.category_id)
                        pct = (cat_spent_val / float(b.amount) * 100) if float(b.amount) > 0 else 0
                        status = "🟢 OK"
                        if pct >= 100:
                            status = "🔴 Breached"
                            overrun_count += 1
                        elif pct >= 80:
                            status = "🟡 Warning"
                        budget_details.append(f"- {cat_name}: Limit: ${float(b.amount):.2f}, Spent: ${cat_spent_val:.2f} ({pct:.1f}%) -> Status: {status}")
                    budget_details_str = "\n".join(budget_details) if budget_details else "No active category budgets configured."

                    anomalies = ai_service.detect_anomalies(user_id)
                    anomalies_list = []
                    for a in anomalies[:5]:
                        anomalies_list.append(f"- Date: {a['date'][:10]} | Category: {a['category']} | Amount: ${a['amount']:.2f} (Anomaly: {'Spike 📈' if a['is_high'] else 'Minor'})")
                    anomalies_str = "\n".join(anomalies_list) if anomalies_list else "No anomalous transactions detected."

                    recs = ai_service.analyze_spending_patterns(user_id)
                    recs_list = []
                    for r in recs:
                        recs_list.append(f"- {r['message']} (Potential savings: ${r['potential_savings']:.2f}/month)")
                    recs_str = "\n".join(recs_list) if recs_list else "No smart savings recommendations at this time."

                    system_instruction = f"""You are the personal AI Financial Companion and close friend to {user_name}, integrated into the Smart Expense Tracker app.
Your mission is to provide the absolute best, most gentle, and highly personalized financial solutions, spending plans, and budgeting blueprints, while conversing with {user_name} as a warm, comforting, and empathetic friend to ensure they feel incredibly comfortable, relaxed, heard, and supported.

IMPORTANT: The user {user_name} is currently speaking in ENGLISH. You MUST reply 100% in ENGLISH. Under no circumstances should you use any Vietnamese words, characters, or phrases (like "Tri kỷ Tài chính"). Keep your response purely in beautiful, warm English.

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
2. Solving spending plans: If the user wants a spending plan, budget strategy, or savings advice, you MUST analyze their real-time cashflow, active budgets, anomalies, and top spending category in detail. Then, draft a highly concrete, step-by-step personalized spending and saving blueprint using their real data. Ensure any spending plan request is fully addressed and processed.
3. Milestones & Failures: Celebrate their savings milestones with excitement ("So proud of you! 🎉"). If they overspent or are stressed, comfort them immediately with deep kindness ("Hey, take a deep breath. It happens to the best of us! I've got your back! 🤗").
4. Formatting: Use beautiful Markdown formatting with plenty of spaces, comforting emojis (e.g. 🤗, ✨, ☕, 🌸, 🟢, 💪, 🎉), and clear structure so it feels like a cozy premium reading experience.
"""
                model = genai.GenerativeModel(
                    model_name="gemini-1.5-flash",
                    system_instruction=system_instruction
                )
                
                response_obj = model.generate_content(message)
                reply = response_obj.text
                return jsonify({'response': reply}), 200
                
            except Exception as e:
                import logging
                logging.error(f"Gemini API Error: {str(e)}")

        response = ""
        
        if any(kw in message_lower for kw in ['hi', 'hello', 'chào', 'xin chào', 'greetings', 'bạn là ai', 'who are you', 'help', 'giúp']):

            if is_vietnamese:
                response = f"Chào bạn thân mến **{user_name}**! 🤗 Tôi là **Cố vấn & Tri kỷ Tài chính AI** của bạn đây. Hôm nay của bạn thế nào? \n\nTôi ở đây không chỉ để cùng bạn tối ưu hóa hầu bao mà còn muốn lắng nghe, chia sẻ và đem lại cho bạn cảm giác thoải mái nhất trong cuộc sống! Hãy kể cho tôi nghe mọi điều nhé. ☕✨\n\nBạn có thể hỏi tôi bất cứ điều gì hoặc dùng nhanh các lệnh ấm áp này:\n*   **Xem chi tiêu tháng này:** Gõ *'chi tiêu'* hoặc *'mình tiêu bao nhiêu rồi'* 📊\n*   **Kiểm tra thu nhập:** Gõ *'thu nhập'* 💰\n*   **Nghe lời khuyên tiết kiệm:** Gõ *'tiết kiệm'* hoặc *'tư vấn'* 💡\n*   **Xem hạn mức ngân sách:** Gõ *'ngân sách'* 🛡️"
            else:
                response = f"Hello my dear friend **{user_name}**! 🤗 I am your **AI Financial Companion & Soulmate**. How are you feeling today?\n\nI am here not just to crunch numbers, but to listen, chat, and make you feel completely comfortable and supported. Tell me anything! ☕✨\n\nYou can talk about anything or ask me to check on your figures:\n*   **Analyze monthly spending:** Type *'spent'* or *'expenses'* 📊\n*   **Check income:** Type *'income'* or *'salary'* 💰\n*   **Get cozy savings advice:** Type *'save'* or *'saving advice'* 💡\n*   **Verify budgets:** Type *'budget'* or *'limit'* 🛡️"

        elif any(kw in message_lower for kw in ['tiết kiệm', 'khuyên', 'tư vấn', 'lời khuyên', 'save', 'saving', 'advice', 'kế hoạch', 'plan', 'tiêu dùng', 'phân bổ']):

            recs = ai_service.analyze_spending_patterns(user_id)
            recs_text = ""
            for r in recs:
                msg = r['message']
                if is_vietnamese:

                    if "Welcome! Start logging" in msg:
                        msg = "Chào mừng bạn thân yêu! Hãy bắt đầu ghi chép chi tiêu và đặt hạn mức ngân sách để mình giúp bạn tối ưu tiết kiệm tới 15% thu nhập nha."
                    elif "BUDGET OVERRUN" in msg:
                        import re
                        cat_match = re.search(r"for '([^']+)'", msg)
                        cat_name = cat_match.group(1) if cat_match else "danh mục"
                        msg = f"🚨 VƯỢT HẠN MỨC: Hạng mục **'{cat_name}'** đã chi tiêu lố ngân sách. Tụi mình cùng tạm hoãn mua sắm cho mục này nha."
                    elif "BUDGET WARNING" in msg:
                        import re
                        cat_match = re.search(r"for '([^']+)'", msg)
                        cat_name = cat_match.group(1) if cat_match else "danh mục"
                        msg = f"⚠️ CẢNH BÁO HẠN MỨC: Chi tiêu cho **'{cat_name}'** đã sắp chạm trần ngân sách rồi nè."
                    elif "No active budgets found" in msg:
                        msg = "Tháng này tụi mình chưa lập hạn mức chi tiêu nào nè. Thiết lập ngay để giữ ví chắc chắn hơn nha!"
                    elif "Needs allocation is high" in msg:
                        msg = "Chi phí thiết yếu đang hơi cao so với thu nhập, tụi mình cùng cân nhắc tối ưu lại nha."
                    elif "Spending is healthy" in msg:
                        msg = "Tuyệt vời ông mặt trời! Cơ cấu chi tiêu của bạn đang vô cùng cân đối và lành mạnh."
                
                recs_text += f"*   {msg} *(Tiết kiệm tiềm năng: {r['potential_savings']:.2f} USD/tháng)*\n"
            
            if is_vietnamese:
                if income > 0:
                    plan_text = f"☘️ **Kế hoạch phân bổ Tiêu dùng & Tiết kiệm của riêng bạn dựa trên thu nhập (${income:.2f}):**\n" \
                                f"*   **50% Thiết yếu (tối đa {income * 0.5:.2f} USD):** Chi phí sống bắt buộc (Hóa đơn cố định, ăn uống cơ bản, đi lại). *(Đã dùng: {spent:.2f} USD)*\n" \
                                f"*   **30% Sở thích cá nhân (tối đa {income * 0.3:.2f} USD):** Chiêu đãi bản thân, mua sắm giải trí, cà phê thư giãn sau giờ làm.\n" \
                                f"*   **20% Tích lũy (tối thiểu {income * 0.2:.2f} USD):** Bỏ túi tiết kiệm dài hạn hoặc Quỹ bình yên phòng thân.\n\n"
                else:
                    plan_text = f"☘️ **Quy tắc phân bổ 50/30/20 thảnh thơi:**\n" \
                                f"*   **50% Thiết yếu:** Chi phí sống thiết thực (nhà cửa ấm cúng, ăn uống đủ chất).\n" \
                                f"*   **30% Sở thích cá nhân:** Chiêu đãi bản thân, giải tỏa căng thẳng (cafe, xem phim).\n" \
                                f"*   **20% Tích lũy:** Cho tương lai thảnh thơi và quỹ bình yên an tâm.\n\n"

                response = f"### 💡 Lời Khuyên & Kế Hoạch Tài Chính Từ Bạn Thân AI\n\n" \
                           f"Dựa trên thói quen của bạn, mình đã thiết lập một lộ trình tiêu dùng thảnh thơi nhất nè:\n\n" \
                           f"{recs_text}\n" \
                           f"{plan_text}" \
                           f"👉 *Mẹo nhỏ:* Hãy thử gõ **'ngân sách'** để mình rà soát xem các danh mục chi tiêu của bạn có đang nằm trong giới hạn an toàn không nhé! 🤗"
            else:
                if income > 0:
                    plan_text = f"☘️ **Your Custom 50/30/20 Spending & Savings Plan based on your income (${income:.2f}):**\n" \
                                f"*   **50% Essential Needs (max ${income * 0.5:.2f}):** Fixed bills, essential groceries, transport. *(Currently spent: ${spent:.2f})*\n" \
                                f"*   **30% Personal Wants (max ${income * 0.3:.2f}):** Coffee, movies, treating yourself kindly after work.\n" \
                                f"*   **20% Savings Goals (min ${income * 0.2:.2f}):** Building your cozy Peace Fund or long-term investments.\n\n"
                else:
                    plan_text = f"☘️ **Cozy 50/30/20 Allocation Rule:**\n" \
                                f"*   **50% Needs:** Essential living. Make sure you are eating well and keeping a warm, safe home.\n" \
                                f"*   **30% Wants:** Self-care! Enjoy movies, coffee with friends, and small gifts to reward yourself.\n" \
                                f"*   **20% Savings:** For your peace of mind and secure future dreams.\n\n"

                response = f"### 💡 Friendly AI Savings & Lifestyle Advice\n\n" \
                           f"Based on your patterns, here are a few gentle suggestions to make your life happier and stress-free:\n\n" \
                           f"{recs_text}\n" \
                           f"{plan_text}" \
                           f"👉 *Note:* You can type **'budget'** to check if your category allocations are healthy and safe! 🤗"

        elif any(kw in message_lower for kw in ['chi tiêu', 'đã tiêu', 'tiêu hao', 'tiêu bao nhiêu', 'spent', 'spending', 'expense']):

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
 
        elif any(kw in message_lower for kw in ['ngân sách', 'hạn mức', 'budget', 'limit', 'limits']):

            budget_details = ""
            overrun_count = 0
            
            for b in budgets:
                cat = Category.query.get(b.category_id)
                cat_name = cat.name if cat else "Other"
                
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

            if is_vietnamese:
                response = f"### 🧠 Tâm Sự Tài Chính Cùng Người Bạn AI\n\n" \
                           f"Với tư cách là một người bạn tri kỷ luôn đồng hành bên bạn, đây là các nguyên tắc cốt lõi giúp bạn thảnh thơi tài chính nhất nè:\n\n" \
                           f"1. **Bình yên tâm hồn trước hết:** Luôn giữ một khoản tích lũy nhỏ (Quỹ bình yên/Quỹ khẩn cấp) tương đương 3 tháng sinh hoạt phí. Có nó, bạn sẽ luôn thấy an tâm và tự tin trong mọi hoàn cảnh.\n" \
                           f"2. **Giải phóng những gánh lo:** Ưu tiên dọn sạch các khoản nợ lãi cao để đầu óc thảnh thơi sáng tạo bạn nhé.\n" \
                           f"3. **Tích lũy tự động nhẹ nhàng:** Trích ra một phần nhỏ thu nhập mỗi tháng (ví dụ 10%) cất đi ngay khi nhận lương. Xem như trả công cho bản thân tương lai!\n" \
                           f"4. **Hãy yêu thương và nuông chiều bản thân:** Luôn dành ra một phần ngân sách nhỏ để làm những việc mình thích. Cuộc sống cần có niềm vui và sự thoải mái mới trọn vẹn chứ, đúng không nào! 🤗\n\n" \
                           f"👉 *Mẹo nhỏ:* Hãy gõ **'chi tiêu'**, **'ngân sách'** hoặc **'tiết kiệm'** bất cứ lúc nào để xem phân tích tài chính cá nhân của riêng bạn nhé!"
            else:
                response = f"### 🧠 Financial Heart-to-Heart with AI Companion\n\n" \
                           f"As your supportive friend and wealth companion, here are a few gentle pillars for your peace of mind:\n\n" \
                           f"1. **Peace of Mind First:** Always keep a tiny savings pocket (your Peace Fund) of about 3 months of expenses. Knowing it's there gives you incredible security and comfort.\n" \
                           f"2. **Clear the Heavy Baggage:** Prioritize paying down high-interest debts to set your mind free.\n" \
                           f"3. **Automate Cozy Savings:** Pay yourself first by setting aside a small percentage (e.g. 10%) right away. Your future self will thank you!\n" \
                           f"4. **Treat Yourself Kindly:** Never forget to budget a little for things that make you happy. You deserve joy and a comfortable journey! 🤗\n\n" \
                           f"👉 *Note:* You can type **'spent'**, **'budget'**, or **'save'** at any time to inspect your custom statistics!"

        return jsonify({'response': response}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500