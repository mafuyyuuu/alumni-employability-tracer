# Alumni Employability Tracer - Project Documentation

## Project Purpose
The **Alumni Employability Tracer** is a comprehensive platform designed for **Pamantasan ng Lungsod ng Pasig (PLP)** to monitor, analyze, and predict the employment outcomes of its graduates. It bridges the gap between academic performance and career success through data-driven insights.

## Core Functions
- **Employability Prediction:** Uses Random Forest and Linear Regression to assess individual employability based on academic, demographic, and skill-based features.
- **Bulk Forecasting:** Integrated "Predict Cohort" tool within the **Users** tab allows admins to upload datasets of upcoming graduates for mass employability analysis.
- **Trend Forecasting:** Employs ARIMA and Linear Regression to project future employment rates at both the university and program levels.
- **Factor Analysis:** Identifies the key drivers (e.g., GPA, OJT Performance, Soft Skills) that influence hiring success.
- **Career Services:** Provides alumni with job browsing, saved jobs, and feedback mechanisms.
* **Admin Analytics:** Offers a centralized dashboard for tracking institutional success metrics, managing machine learning models, and monitoring data health.

## Technology Stack
- **Backend:** Flask (Python), SQLite (Database), Scikit-Learn (ML), Statsmodels (Forecasting).
- **Frontend:** React (Vite), Tailwind CSS, Recharts (Visualization), Framer Motion (Animations).
- **Machine Learning:**
  - **Random Forest (RF):** Primary model for classification and feature importance.
  - **Linear Regression (LR):** Used for both classification (probability) and time-series forecasting.
  - **ARIMA:** Specialized for historical trend forecasting.

## Machine Learning & The "Age" Factor
The system previously identified **Age** as a factor, but investigation showed it to be noise (zero correlation). It has been **removed** from the models to prioritize academic and professional drivers like GWA, OJT Performance, and Board Exam success.

## Factors with 0% Impact
If a factor (e.g., Board Passer) shows **0% Impact** in the configuration:
1. **Zero Variance:** This occurs when all records in the current training set have the same value for that field (e.g., all are marked as 0).
2. **Resolution:** As soon as a dataset with varied data (both 1s and 0s) is uploaded and retrained, the model will identify its true predictive weight.

---

## UI/UX & Factors Configuration
- **Visualization:** The vertical bar graph is the most effective way to display the Top 10 Factors because it accommodates long feature labels and allows for easy ranking comparison.
- **Optimization:** The chart spans the full width of the container, with interactive tooltips explaining the weight and impact level of each driver.

---

## Development Guidelines
- **Surgical Updates:** When modifying ML routes, ensure both RF and LR fallbacks are maintained.
- **Styling:** Adhere to the established Tailwind CSS patterns and the PLP-themed color palette (`#0f2d1a` / `#163d22`).
- **Data Integrity:** Always validate training data for class balance (Employed vs. Unemployed) using the **Data Health** dashboard.
