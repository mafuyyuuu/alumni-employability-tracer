"""Linear regression forecasting utilities."""
import warnings
import numpy as np

warnings.filterwarnings("ignore")


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
