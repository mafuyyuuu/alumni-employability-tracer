# Alumni Employability Tracer

A comprehensive platform designed for **Pamantasan ng Lungsod ng Pasig (PLP)** to monitor, analyze, and predict the employment outcomes of its graduates. This system bridges the gap between academic performance and career success through data-driven insights.

## 🚀 Key Features

- **Employability Prediction:** Uses Random Forest and Linear Regression to assess individual employability based on academic, demographic, and skill-based features.
- **Bulk Forecasting:** Integrated "Predict Cohort" tool for admins to mass-analyze upcoming graduates.
- **Trend Forecasting:** Employs ARIMA and Linear Regression to project future employment rates at university and program levels.
- **Factor Analysis:** Interactive visualizations to identify key drivers (GPA, OJT Performance, etc.) influencing hiring success.
- **Career Services:** Job browsing with external PH job integration (Adzuna, LinkedIn, JobStreet), saved jobs, and feedback mechanisms.
- **Admin Analytics:** Centralized dashboard for institutional success metrics and ML model management.

## 🛠️ Tech Stack

### Backend
- **Framework:** Flask (Python 3.10+)
- **Database:** SQLite
- **Machine Learning:** Scikit-Learn (Random Forest, Linear Regression), Statsmodels (ARIMA)
- **Data Processing:** Pandas, NumPy
- **Authentication:** Flask-JWT-Extended

### Frontend
- **Framework:** React 19 (Vite)
- **Styling:** Tailwind CSS
- **Visualizations:** Recharts
- **Interactive Visuals:** OGL, Three.js (Liquid effects)
- **API Client:** Axios

## 📦 Prerequisites

- Python 3.10 or higher
- Node.js 18 or higher
- npm or yarn

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-repo/alumni-employability-tracer.git
cd alumni-employability-tracer
```

### 2. Backend Setup
```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:
```env
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
DATABASE=plp_alumni.db
UPLOAD_FOLDER=uploads
```

Run the backend:
```bash
python app.py
```
The server will start at `http://localhost:5001`. On first run, it will automatically initialize the database and seed it with initial data.

### 3. Machine Learning Training
To use the employability prediction features, you must first import the datasets and train the models:
```bash
cd backend
python train_all.py
```
This script will:
1.  Import all `PLP_*_Employability_Dataset.xlsx` files from the root directory into the database.
2.  Train the **Random Forest** classification model.
3.  Train the **Linear Regression** employability model.
4.  Save the model artifacts to `backend/ml/saved_models/`.

### 4. Frontend Setup
```bash
cd ../frontend
npm install
```

Run the frontend:
```bash
npm run dev
```
The application will be available at `http://localhost:5173`.

## 📂 Project Structure

- `/backend`: Flask API, database schemas, and ML model training scripts.
  - `/ml`: Contains training logic for Random Forest, Linear Regression, and ARIMA.
  - `/routes`: API endpoints for Admin, Alumni, Jobs, and Auth.
- `/frontend`: React source code, components, and assets.
  - `/src/components`: UI components including interactive background effects.
  - `/src/pages`: Main application views for different user roles.
- `/wireframe`: Project design mockups and screenshots.

## 🧠 Machine Learning & Data
The system uses academic and professional drivers to predict employability.
- **Primary Models:** Random Forest (Classification), Linear Regression (Probability).
- **Time Series:** ARIMA for historical employment trend projections.
- **Training Data:** Includes GWA, OJT Performance, Board Exam scores, and Skill assessments.
- **Factor Config:** Admins can adjust the weights of different factors to fine-tune the model's behavior.

## 📄 License
This project was developed for **Pamantasan ng Lungsod ng Pasig (PLP)**. All rights reserved.
