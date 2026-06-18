import os
import warnings
from datetime import datetime, timezone
from typing import Optional

import joblib
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

try:
    from xgboost import XGBClassifier
    _XGB_AVAILABLE = True
except ImportError:
    _XGB_AVAILABLE = False

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


def _best_model(X_train, y_train, X_test, y_test):
    """Train RF and GBM, return the one with higher cross-validation score."""
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

    candidates = {
        'GradientBoosting': GradientBoostingClassifier(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1,
            min_samples_split=4,
            min_samples_leaf=2,
            subsample=0.85,
            random_state=42,
        ),
        'RandomForest': RandomForestClassifier(
            n_estimators=150,
            max_depth=12,
            min_samples_split=4,
            min_samples_leaf=2,
            max_features='sqrt',
            class_weight='balanced',
            random_state=42,
            n_jobs=1,
        ),
    }
    if _XGB_AVAILABLE:
        candidates['XGBoost'] = XGBClassifier(
            n_estimators=150,
            max_depth=4,
            learning_rate=0.1,
            subsample=0.85,
            colsample_bytree=0.8,
            scale_pos_weight=1,
            random_state=42,
            n_jobs=1,
            eval_metric='logloss',
            verbosity=0,
        )

    best_name = None
    best_cv_score = -1
    best_model_obj = None

    for name, clf in candidates.items():
        cv_scores = cross_val_score(clf, X_train, y_train, cv=cv, scoring='accuracy', n_jobs=1)
        mean_cv = cv_scores.mean()
        print(f"  {name}: CV accuracy = {mean_cv*100:.2f}% (+/- {cv_scores.std()*100:.2f}%)")
        if mean_cv > best_cv_score:
            best_cv_score = mean_cv
            best_name = name
            best_model_obj = clf

    print(f"  Selected: {best_name}")
    best_model_obj.fit(X_train, y_train)
    return best_model_obj, best_name, best_cv_score


def train_random_forest(database_path: Optional[str] = None) -> dict:
    print("--- Starting ML Pipeline: RF/GBM Auto-Select (DB Source) ---")
    df = load_training_dataframe(database_path)
    validate_training_dataframe(df)
    X, y, defaults = build_feature_matrix(df)

    stratify = y if y.value_counts().min() >= 2 else None
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=stratify
    )

    model, model_name, cv_score = _best_model(X_train, y_train, X_test, y_test)

    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions) * 100
    print(f"[OK] Test accuracy: {accuracy:.2f}% | CV accuracy: {cv_score*100:.2f}%")
    print(classification_report(y_test, predictions, target_names=['Unemployed', 'Employed']))

    os.makedirs(models_dir, exist_ok=True)
    feature_names = X.columns.tolist()
    metadata = {
        'source': 'database',
        'row_count': int(len(df)),
        'feature_count': len(feature_names),
        'class_distribution': {int(k): int(v) for k, v in y.value_counts().to_dict().items()},
        'accuracy': round(float(accuracy), 2),
        'cv_accuracy': round(float(cv_score * 100), 2),
        'model_type': model_name,
        'trained_at_utc': datetime.now(timezone.utc).isoformat(),
    }

    joblib.dump(model, os.path.join(models_dir, 'employability_rf_model.joblib'))
    joblib.dump(feature_names, os.path.join(models_dir, 'rf_features.joblib'))
    joblib.dump(defaults, os.path.join(models_dir, 'rf_defaults.joblib'))
    joblib.dump(metadata, os.path.join(models_dir, 'rf_metadata.joblib'))
    print(f"[SAVED] Model artifacts saved to: {models_dir}")
    return metadata


if __name__ == "__main__":
    try:
        train_random_forest()
    except ValueError as exc:
        print(f"[ERROR] {exc}")
        raise SystemExit(1)
