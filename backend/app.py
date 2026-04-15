import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

load_dotenv()

from config import Config
from database import init_db, close_db
from routes.auth import auth_bp
from routes.alumni import alumni_bp
from routes.jobs import jobs_bp
from routes.companies import companies_bp
from routes.notifications import notifs_bp
from routes.feedback import feedback_bp
from routes.admin import admin_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # CORS — allow the Vite dev server
    CORS(app, resources={r"/api/*": {"origins": [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]}}, supports_credentials=True)

    JWTManager(app)

    # Teardown DB connection per request
    app.teardown_appcontext(close_db)

    # Register blueprints
    app.register_blueprint(auth_bp,      url_prefix='/api/auth')
    app.register_blueprint(alumni_bp,    url_prefix='/api/alumni')
    app.register_blueprint(jobs_bp,      url_prefix='/api/jobs')
    app.register_blueprint(companies_bp, url_prefix='/api/companies')
    app.register_blueprint(notifs_bp,    url_prefix='/api/notifications')
    app.register_blueprint(feedback_bp,  url_prefix='/api/feedback')
    app.register_blueprint(admin_bp,     url_prefix='/api/admin')

    @app.route('/api/health')
    def health():
        return {'status': 'ok', 'message': 'PLP Alumni API is running'}, 200

    # Ensure upload folder exists
    os.makedirs(app.config.get('UPLOAD_FOLDER', 'uploads'), exist_ok=True)

    return app


if __name__ == '__main__':
    app = create_app()

    # Auto-init and seed on first run
    init_db()
    try:
        from seed import seed
        seed()
    except Exception as e:
        print(f"Seed skipped: {e}")

    print("PLP Alumni API running at http://localhost:5001")
    app.run(debug=True, port=5001, host='0.0.0.0')
