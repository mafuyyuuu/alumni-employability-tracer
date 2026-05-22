from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
import joblib
import os
import warnings
from datetime import datetime, timezone
from typing import Optional

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

# Suppress warnings for a clean terminal output
warnings.filterwarnings("ignore")

base_dir = os.path.dirname(os.path.abspath(__file__))
models_dir = os.path.join(base_dir, 'saved_models')


def train_random_forest(database_path: Optional[str] = None) -> dict:
    print("--- Starting ML Pipeline: Random Forest (DB Source) ---")
    df = load_training_dataframe(database_path)
    validate_training_dataframe(df)
    X, y, defaults = build_feature_matrix(df)

    stratify = y if y.value_counts().min() >= 2 else None
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=stratify
    )

    rf_model = RandomForestClassifier(
        n_estimators=500,
        max_depth=20,
        min_samples_split=5,
        random_state=42,
        class_weight='balanced',
        n_jobs=-1
    )
    rf_model.fit(X_train, y_train)

    predictions = rf_model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions) * 100
    print(f"✅ Training complete. Accuracy: {accuracy:.2f}%")

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

    joblib.dump(rf_model, os.path.join(models_dir, 'employability_rf_model.joblib'))
    joblib.dump(feature_names, os.path.join(models_dir, 'rf_features.joblib'))
    joblib.dump(defaults, os.path.join(models_dir, 'rf_defaults.joblib'))
    joblib.dump(metadata, os.path.join(models_dir, 'rf_metadata.joblib'))
    print(f"💾 Saved model artifacts to: {models_dir}")
    return metadata


if __name__ == "__main__":
    try:
        train_random_forest()
    except ValueError as exc:
        print(f"❌ {exc}")
        raise SystemExit(1)
