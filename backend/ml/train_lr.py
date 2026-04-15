"""Logistic regression training + linear regression forecasting utilities."""
import os
import warnings
from datetime import datetime, timezone

import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split

try:
    from ml.training_data import (
        build_feature_matrix,
        load_training_dataframe,
        validate_training_dataframe,
    )
except ModuleNotFoundError:
    from training_data import (
        build_feature_matrix,
        load_training_dataframe,
        validate_training_dataframe,
    )

warnings.filterwarnings("ignore")
base_dir = os.path.dirname(os.path.abspath(__file__))
models_dir = os.path.join(base_dir, 'saved_models')


def train_logistic_regression(database_path: str | None = None) -> dict:
    print("--- Training Logistic Regression (DB Source) ---")
    df = load_training_dataframe(database_path)
    validate_training_dataframe(df)
    X, y, defaults = build_feature_matrix(df)

    stratify = y if y.value_counts().min() >= 2 else None
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=stratify
    )

    lr_model = LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42)
    lr_model.fit(X_train, y_train)

    predictions = lr_model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions) * 100
    print(f"✅ Logistic Regression complete. Accuracy: {accuracy:.2f}%")

    os.makedirs(models_dir, exist_ok=True)
    feature_names = X.columns.tolist()
    metadata = {
        'source': 'database',
        'row_count': int(len(df)),
        'feature_count': len(feature_names),
        'class_distribution': {int(k): int(v) for k, v in y.value_counts().to_dict().items()},
        'accuracy': round(float(accuracy), 2),
        'trained_at_utc': datetime.now(timezone.utc).isoformat(),
    }

    joblib.dump(lr_model, os.path.join(models_dir, 'employability_lr_model.joblib'))
    joblib.dump(X.columns.tolist(), os.path.join(models_dir, 'lr_features.joblib'))
    joblib.dump(defaults, os.path.join(models_dir, 'lr_defaults.joblib'))
    joblib.dump(metadata, os.path.join(models_dir, 'lr_metadata.joblib'))
    print("💾 Saved logistic model artifacts.")
    return metadata


def run_lr_forecast(rates, horizon=3):
    """Forecast future employment rates using sklearn LinearRegression."""
    def na_metrics():
        return {'mae': 'N/A', 'rmse': 'N/A', 'mape': 'N/A', 'r2': 'N/A'}

    normalized_rates = []
    try:
        from sklearn.linear_model import LinearRegression
        from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

        normalized_rates = [] if rates is None else [float(rate) for rate in rates]
        horizon = max(int(horizon or 1), 1)

        if len(normalized_rates) < 2:
            last = normalized_rates[-1] if normalized_rates else 70.0
            return {
                'forecast_values': [round(last + 3.0 * (i + 1), 1) for i in range(horizon)],
                'metrics': na_metrics(),
                'model_used': 'Linear Regression',
            }

        X = np.array(range(len(normalized_rates))).reshape(-1, 1)
        y = np.array(normalized_rates, dtype=float)

        model = LinearRegression()
        model.fit(X, y)
        y_pred = model.predict(X)

        mae = float(mean_absolute_error(y, y_pred))
        rmse = float(np.sqrt(mean_squared_error(y, y_pred)))
        with np.errstate(divide='ignore', invalid='ignore'):
            mape_arr = np.abs((y - y_pred) / y) * 100
            mape = float(np.nanmean(mape_arr))
        r2 = float(r2_score(y, y_pred))

        future_X = np.array(range(len(normalized_rates), len(normalized_rates) + horizon)).reshape(-1, 1)
        forecast_values = [round(float(v), 1) for v in model.predict(future_X)]

        return {
            'forecast_values': forecast_values,
            'metrics': {
                'mae': round(mae, 2),
                'rmse': round(rmse, 2),
                'mape': round(mape, 1),
                'r2': round(r2, 2),
            },
            'model_used': 'Linear Regression',
        }

    except (ImportError, ValueError, TypeError):
        horizon = max(int(horizon or 1), 1)
        if len(normalized_rates) >= 2:
            trend = np.polyfit(range(len(normalized_rates)), normalized_rates, 1)
            x_hist = np.array(range(len(normalized_rates)))
            y_hist = np.array(normalized_rates, dtype=float)
            y_pred = np.polyval(trend, x_hist)
            forecast_values = [
                round(float(np.polyval(trend, len(normalized_rates) + i)), 1)
                for i in range(horizon)
            ]
            mae = float(np.mean(np.abs(y_hist - y_pred)))
            rmse = float(np.sqrt(np.mean((y_hist - y_pred) ** 2)))
            with np.errstate(divide='ignore', invalid='ignore'):
                mape_arr = np.abs((y_hist - y_pred) / y_hist) * 100
                mape = float(np.nanmean(mape_arr))
            ss_res = float(np.sum((y_hist - y_pred) ** 2))
            ss_tot = float(np.sum((y_hist - np.mean(y_hist)) ** 2))
            r2 = float(1 - (ss_res / ss_tot)) if ss_tot > 0 else 1.0
            metrics = {
                'mae': round(mae, 2),
                'rmse': round(rmse, 2),
                'mape': round(mape, 1),
                'r2': round(r2, 2),
            }
        else:
            last = normalized_rates[-1] if normalized_rates else 70.0
            forecast_values = [round(last + 3.0 * (i + 1), 1) for i in range(horizon)]
            metrics = na_metrics()

        return {
            'forecast_values': forecast_values,
            'metrics': metrics,
            'model_used': 'Linear Regression',
        }


if __name__ == "__main__":
    try:
        train_logistic_regression()
    except ValueError as exc:
        print(f"❌ {exc}")
        raise SystemExit(1)
