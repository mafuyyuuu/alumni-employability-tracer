import os
import warnings
from datetime import datetime, timezone
from typing import Optional

import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

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


def train_linear_employability(database_path: Optional[str] = None) -> dict:
    print("--- Starting ML Pipeline: Logistic Regression (DB Source) ---")
    df = load_training_dataframe(database_path)
    validate_training_dataframe(df)
    X, y, defaults = build_feature_matrix(df)

    stratify = y if y.value_counts().min() >= 2 else None
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=stratify
    )

    # StandardScaler + LogisticRegression pipeline — scaling is critical for LR accuracy
    pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('lr', LogisticRegression(
            C=1.0,
            max_iter=1000,
            class_weight='balanced',
            solver='lbfgs',
            random_state=42,
        )),
    ])

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(pipeline, X_train, y_train, cv=cv, scoring='accuracy', n_jobs=1)
    print(f"  LR CV accuracy: {cv_scores.mean()*100:.2f}% (+/- {cv_scores.std()*100:.2f}%)")

    pipeline.fit(X_train, y_train)

    class_preds = pipeline.predict(X_test)
    accuracy = accuracy_score(y_test, class_preds) * 100
    print(f"[OK] LR Test accuracy: {accuracy:.2f}%")
    print(classification_report(y_test, class_preds, target_names=['Unemployed', 'Employed']))

    os.makedirs(models_dir, exist_ok=True)
    feature_names = X.columns.tolist()
    metadata = {
        'source': 'database',
        'row_count': int(len(df)),
        'feature_count': len(feature_names),
        'class_distribution': {int(k): int(v) for k, v in y.value_counts().to_dict().items()},
        'accuracy': round(float(accuracy), 2),
        'cv_accuracy': round(float(cv_scores.mean() * 100), 2),
        'model_type': 'LogisticRegression+Scaler',
        'trained_at_utc': datetime.now(timezone.utc).isoformat(),
    }

    joblib.dump(pipeline, os.path.join(models_dir, 'employability_lr_model.joblib'))
    joblib.dump(feature_names, os.path.join(models_dir, 'lr_features.joblib'))
    joblib.dump(defaults, os.path.join(models_dir, 'lr_defaults.joblib'))
    joblib.dump(metadata, os.path.join(models_dir, 'lr_metadata.joblib'))
    print(f"[SAVED] LR model artifacts saved to: {models_dir}")
    return metadata


if __name__ == "__main__":
    try:
        train_linear_employability()
    except ValueError as exc:
        print(f"[ERROR] {exc}")
        raise SystemExit(1)
