import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'plp-alumni-secret-key-2025')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'plp-jwt-secret-2025')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    DATABASE = os.getenv('DATABASE', 'plp_alumni.db')
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads')
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50 MB
