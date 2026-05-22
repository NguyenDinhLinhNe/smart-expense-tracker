from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
from models.models import db

app = Flask(__name__)
app.config.from_object(Config)

# Initialize extensions
CORS(app, origins=Config.CORS_ORIGINS)
jwt = JWTManager(app)
db.init_app(app)

# Import routes
from routes.auth_routes import auth_bp
from routes.transaction_routes import transaction_bp
from routes.category_routes import category_bp
from routes.budget_routes import budget_bp
from routes.report_routes import report_bp
from routes.ai_routes import ai_bp

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(transaction_bp, url_prefix='/api/transactions')
app.register_blueprint(category_bp, url_prefix='/api/categories')
app.register_blueprint(budget_bp, url_prefix='/api/budgets')
app.register_blueprint(report_bp, url_prefix='/api/reports')
app.register_blueprint(ai_bp, url_prefix='/api/ai')

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Smart Expense Tracker API'})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("✅ Database tables created!")
    
    app.run(debug=True, port=5000)