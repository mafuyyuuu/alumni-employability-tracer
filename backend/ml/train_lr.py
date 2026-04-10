from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
import joblib
import os
import warnings
from datetime import datetime, timezone

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


if __name__ == "__main__":
    try:
        train_logistic_regression()
    except ValueError as exc:
        print(f"❌ {exc}")
        raise SystemExit(1)
