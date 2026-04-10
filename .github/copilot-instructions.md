# Copilot Instructions for Alumni Employability Tracer

## Quick Start

**Backend (Flask API)**
```bash
cd backend
pip install -r requirements.txt
python app.py                    # Runs at http://localhost:5000
python seed.py                   # Optional: re-seed database
```

**Frontend (React + Vite)**
```bash
cd frontend
npm install
npm run dev                       # Dev server at http://localhost:5173
npm run build                     # Production build
npm run lint                      # ESLint check
```

## Architecture

### Full-Stack Overview
- **Backend**: Flask + SQLite with JWT authentication, organized into blueprints by feature (auth, alumni, jobs, companies, etc.)
- **Frontend**: React + React Router with Tailwind CSS, using Vite for fast dev builds
- **Proxy**: Vite dev server proxies `/api/*` requests to `http://localhost:5000` (configured in `vite.config.js`)
- **ML**: Separate module for employability prediction and employment rate forecasting using scikit-learn, joblib, and statsmodels

### Backend Structure
- **`routes/`**: Flask blueprints for each domain (auth, alumni, jobs, companies, admin, feedback, notifications)
- **`services/`**: Business logic, including `job_fetcher.py` for job aggregation
- **`ml/`**: Machine learning models:
  - `predictor.py`: EmployabilityPredictor class for predicting job fit and employment likelihood
  - `train_lr.py`: Logistic Regression model training
  - `train_rf.py`: Random Forest model training
  - `arima_model.py`: ARIMA forecasting for employment rates
  - `saved_models/`: Persisted trained models (joblib format)
- **`database.py`**: SQLite schema definition and DB connection management
- **`config.py`**: Environment-based configuration (SECRET_KEY, JWT settings, DATABASE path, UPLOAD_FOLDER)

### Frontend Structure
- **`pages/`**: Main page components (Login, AlumniDashboard, AdminDashboard, etc.)
  - `alumni/`: Alumni dashboard, job browsing, saved jobs, notifications, profile, feedback
  - `admin/`: Admin dashboard, forecasting, model uploads, user/company/job management
- **`components/`**: Reusable components (BubbleCanvas, LiquidChrome, LiquidEther for 3D visualizations)
- **`context/AuthContext.jsx`**: Global auth state and token management
- **`services/api.js`**: Axios instance for API calls (base URL: `/api`)

### Database (SQLite)
- **Tables**: users, companies, jobs, notifications, feedback, employment_data, etc.
- **Credentials stored as bcrypt hashes** in users table
- **JWT for session management** (stateless, token stored in localStorage on frontend)

## Key Conventions

### Python (Backend)
- **Flask blueprints**: One blueprint per domain, registered in `app.py` with url_prefix (e.g., `/api/auth`)
- **JWT protection**: Use `@jwt_required()` decorator on protected routes
- **Database access**: All DB operations go through `database.py` functions; use `g` object for per-request DB connection
- **Error handling**: Return JSON with appropriate HTTP status (400, 401, 404, 500)
- **Configuration**: All secrets/paths via `config.py` (reads from `.env` via `python-dotenv`)

### JavaScript/React (Frontend)
- **Component naming**: PascalCase for components (e.g., `AlumniDashboard.jsx`)
- **Styling**: Tailwind CSS classes; avoid inline styles except for dynamic values
- **API calls**: Use the axios instance from `services/api.js` with `/api` base path
- **Routing**: React Router v7 with nested routes under `/alumni/*` and `/admin/*`
- **Auth**: AuthContext provides `user`, `login()`, `logout()`, and `isAuthenticated` - wrap protected pages with context check
- **State**: Use React hooks (useState, useContext, useEffect); no Redux setup

## Common Tasks

### Running Both Servers (Development)
1. Terminal 1: `cd backend && python app.py`
2. Terminal 2: `cd frontend && npm run dev`
3. Access at `http://localhost:5173`

### Database
- **Initialize/reset**: Delete `plp_alumni.db` and run `python app.py` (auto-creates schema and seeds default data)
- **Manual seed**: `python seed.py` (safe to re-run; upserts by email)
- **Schema**: See `database.py` for CREATE TABLE statements

### ML Models
- **Training**: `python ml/train_lr.py` or `python ml/train_rf.py` (saves to `ml/saved_models/`)
- **Prediction**: `EmployabilityPredictor` class in `ml/predictor.py` loads models via joblib
- **Forecasting**: ARIMA models in `ml/arima_model.py` for employment rate trends

### Linting
- **Frontend**: `npm run lint` (ESLint with React hooks and refresh plugins)
- **Backend**: No linter configured; follow PEP 8 conventions

### Production Build
- **Frontend**: `npm run build` outputs to `dist/`
- **Backend**: Set `debug=False`, use production WSGI server (e.g., Gunicorn), ensure `.env` has production secrets

## Debugging Tips

- **CORS issues**: Check `app.py` CORS config; allows `http://localhost:5173` in dev
- **JWT failures**: Verify token in LocalStorage (browser DevTools → Application tab) and check expiry (`JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)`)
- **API calls fail**: Check `vite.config.js` proxy config points to `http://localhost:5000`
- **ML model missing**: Ensure `ml/saved_models/` contains trained models before running predictions
- **Database locked**: Close other connections; SQLite allows one writer at a time

## Environment Variables

Backend `.env` file (optional; defaults used if missing):
```
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
DATABASE=plp_alumni.db
UPLOAD_FOLDER=uploads
```

## MCP Servers (Optional for Enhanced Development)

These Model Context Protocol servers extend Copilot's capabilities:

### Playwright (E2E Testing)
Useful for writing and debugging end-to-end tests for the React frontend:
```bash
npm install --save-dev @playwright/test
npx playwright install
```
Example: Test login flow, job browsing, saved jobs, admin features.

### Python Tools (ML Development)
For analyzing, training, and debugging ML models:
- Pandas DataFrames for exploratory analysis
- Scikit-learn model evaluation and hyperparameter tuning
- Statsmodels ARIMA diagnostics and forecasting
- Joblib model serialization debugging

## Tech Stack Summary

**Backend**: Flask 3.1.3, Flask-JWT-Extended 4.7.1, SQLite, scikit-learn 1.8.0, statsmodels 0.14.6, pandas 3.0.2, joblib 1.5.3, bcrypt 5.0.0, python-dotenv 1.2.2

**Frontend**: React 19.2.0, React Router 7.13.1, Vite 7.3.1, Tailwind CSS 3.4.19, Recharts 3.7.0, Three.js 0.183.1, Axios 1.13.6
