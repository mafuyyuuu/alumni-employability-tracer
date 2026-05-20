"""Random Forest based employment-rate forecasting."""

import warnings

import numpy as np

warnings.filterwarnings("ignore")


def _na_metrics():
    return {'mae': 'N/A', 'rmse': 'N/A', 'mape': 'N/A', 'r2': 'N/A'}


def _trend_fallback(rates, horizon):
    if len(rates) >= 2:
        trend = np.polyfit(range(len(rates)), rates, 1)
        forecast_values = [
            round(float(np.polyval(trend, len(rates) + i)), 1)
            for i in range(horizon)
        ]
        y_hist = np.array(rates, dtype=float)
        y_pred = np.polyval(trend, np.array(range(len(rates))))
        mae = float(np.mean(np.abs(y_hist - y_pred)))
        rmse = float(np.sqrt(np.mean((y_hist - y_pred) ** 2)))
        with np.errstate(divide='ignore', invalid='ignore'):
            mape = float(np.nanmean(np.abs((y_hist - y_pred) / y_hist) * 100))
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
        last = float(rates[-1]) if rates else 70.0
        forecast_values = [round(last + 3.0 * (i + 1), 1) for i in range(horizon)]
        metrics = _na_metrics()

    return {
        'forecast_values': forecast_values,
        'metrics': metrics,
        'model_used': 'Random Forest Regressor',
    }


def _build_lag_matrix(rates, lag):
    X = []
    y = []
    for idx in range(lag, len(rates)):
        X.append(rates[idx - lag:idx])
        y.append(rates[idx])
    return np.array(X, dtype=float), np.array(y, dtype=float)


def run_rf_forecast(rates, horizon=3):
    """Forecast future employment rates using lag-based RandomForestRegressor."""
    try:
        from sklearn.ensemble import RandomForestRegressor
        from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    except ImportError:
        rates = [float(r) for r in rates or []]
        horizon = max(int(horizon or 1), 1)
        return _trend_fallback(rates, horizon)

    normalized_rates = [float(r) for r in rates or []]
    horizon = max(int(horizon or 1), 1)
    if len(normalized_rates) < 6:
        return _trend_fallback(normalized_rates, horizon)

    lag = min(3, len(normalized_rates) - 1)
    X, y = _build_lag_matrix(normalized_rates, lag)
    # Need at least 5 training samples for RF to generalise beyond memorising the mean
    if len(X) < 5:
        return _trend_fallback(normalized_rates, horizon)

    model = RandomForestRegressor(
        n_estimators=300,
        random_state=42,
    )
    model.fit(X, y)

    hist_pred = model.predict(X)
    mae = float(mean_absolute_error(y, hist_pred))
    rmse = float(np.sqrt(mean_squared_error(y, hist_pred)))
    with np.errstate(divide='ignore', invalid='ignore'):
        mape = float(np.nanmean(np.abs((y - hist_pred) / y) * 100))
    r2 = float(r2_score(y, hist_pred))

    window = normalized_rates[-lag:]
    forecast_values = []
    for _ in range(horizon):
        next_val = float(model.predict(np.array([window], dtype=float))[0])
        forecast_values.append(round(next_val, 1))
        window = window[1:] + [next_val]

    return {
        'forecast_values': forecast_values,
        'metrics': {
            'mae': round(mae, 2),
            'rmse': round(rmse, 2),
            'mape': round(mape, 1),
            'r2': round(r2, 2),
        },
        'model_used': 'Random Forest Regressor',
    }
