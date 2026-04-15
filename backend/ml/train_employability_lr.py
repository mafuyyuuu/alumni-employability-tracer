from datetime import datetime, timezone
import os
import warnings

import joblib
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

try:
    from ml.training_data import (
        load_training_dataframe,
        validate_training_dataframe,
        build_feature_matrix,
    )
except ModuleNotFoundError:
    from training_data import (
        load_training_dataframe,
        validate_training_dataframe,
        build_feature_matrix,
    )

warnings.filterwarnings("ignore")

base_dir = os.path.dirname(os.path.abspath(__file__))
models_dir = os.path.join(base_dir, 'saved_models')


def train_linear_employability(database_path: str | None = None) -> dict:
    print("--- Starting ML Pipeline: Linear Regression Employability (DB Source) ---")
    df = load_training_dataframe(database_path)
    validate_training_dataframe(df)
    X, y, defaults = build_feature_matrix(df)

    stratify = y if y.value_counts().min() >= 2 else None
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=stratify
    )

    lr_model = LinearRegression()
    lr_model.fit(X_train, y_train)

    raw_preds = lr_model.predict(X_test)
    clipped = [min(1.0, max(0.0, float(v))) for v in raw_preds]
    class_preds = [1 if v >= 0.5 else 0 for v in clipped]

    accuracy = (sum(int(pred == actual) for pred, actual in zip(class_preds, y_test)) / len(y_test)) * 100
    mae = float(mean_absolute_error(y_test, clipped))
    r2 = float(r2_score(y_test, clipped))
    print(f"✅ Training complete. Accuracy: {accuracy:.2f}%")

    os.makedirs(models_dir, exist_ok=True)
    feature_names = X.columns.tolist()
    metadata = {
        'source': 'database',
        'row_count': int(len(df)),
        'feature_count': len(feature_names),
        'class_distribution': {int(k): int(v) for k, v in y.value_counts().to_dict().items()},
        'accuracy': round(float(accuracy), 2),
        'mae': round(mae, 4),
        'r2': round(r2, 4),
        'trained_at_utc': datetime.now(timezone.utc).isoformat(),
    }

    joblib.dump(lr_model, os.path.join(models_dir, 'employability_lr_model.joblib'))
    joblib.dump(feature_names, os.path.join(models_dir, 'lr_features.joblib'))
    joblib.dump(defaults, os.path.join(models_dir, 'lr_defaults.joblib'))
    joblib.dump(metadata, os.path.join(models_dir, 'lr_metadata.joblib'))
    print(f"💾 Saved model artifacts to: {models_dir}")
    return metadata


if __name__ == "__main__":
    try:
        train_linear_employability()
    except ValueError as exc:
        print(f"❌ {exc}")
        raise SystemExit(1)
