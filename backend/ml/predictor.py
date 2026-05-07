import os
import warnings

import joblib
import pandas as pd

# Suppress harmless pandas warnings for a cleaner terminal.
warnings.filterwarnings("ignore")

NUMERIC_INPUT_FIELDS = [
    'age',
    'graduation_year',
    'avg_grade',
    'avg_prof_grade',
    'avg_elec_grade',
    'ojt_grade',
    'soft_skills',
    'hard_skills',
]

INPUT_ALIASES = {
    'degree': 'course',
    'course': 'course',
    'age': 'age',
    'graduationYear': 'graduation_year',
    'graduation_year': 'graduation_year',
    'year_graduated': 'graduation_year',
    'avgGrade': 'avg_grade',
    'avg_grade': 'avg_grade',
    'avgProfGrade': 'avg_prof_grade',
    'avg_prof_grade': 'avg_prof_grade',
    'avgElecGrade': 'avg_elec_grade',
    'avg_elec_grade': 'avg_elec_grade',
    'ojtGrade': 'ojt_grade',
    'ojt_grade': 'ojt_grade',
    'softSkills': 'soft_skills',
    'soft_skills': 'soft_skills',
    'hardSkills': 'hard_skills',
    'hard_skills': 'hard_skills',
}

MODEL_KEYS = ('rf', 'lr')


class EmployabilityPredictor:
    def __init__(self):
        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.models_dir = os.path.join(base_dir, 'saved_models')
        self.paths = {
            'rf_model': os.path.join(self.models_dir, 'employability_rf_model.joblib'),
            'rf_features': os.path.join(self.models_dir, 'rf_features.joblib'),
            'rf_defaults': os.path.join(self.models_dir, 'rf_defaults.joblib'),
            'rf_metadata': os.path.join(self.models_dir, 'rf_metadata.joblib'),
            'lr_model': os.path.join(self.models_dir, 'employability_lr_model.joblib'),
            'lr_features': os.path.join(self.models_dir, 'lr_features.joblib'),
            'lr_defaults': os.path.join(self.models_dir, 'lr_defaults.joblib'),
            'lr_metadata': os.path.join(self.models_dir, 'lr_metadata.joblib'),
        }

        self.models = {}
        self.features = {}
        self.defaults = {}
        self.metadata = {}
        self._load_models()

    @staticmethod
    def _to_float(value, default=0.0):
        try:
            return float(value)
        except (TypeError, ValueError):
            return float(default)

    def _normalize_input(self, input_data: dict) -> dict:
        normalized = {}
        for raw_key, value in (input_data or {}).items():
            key = INPUT_ALIASES.get(raw_key, raw_key)
            normalized[key] = value
        if 'course' in normalized and normalized['course'] is not None:
            normalized['course'] = str(normalized['course']).strip().upper()
        return normalized

    def _load_model_bundle(self, model_key: str) -> bool:
        model_path = self.paths[f'{model_key}_model']
        features_path = self.paths[f'{model_key}_features']
        defaults_path = self.paths[f'{model_key}_defaults']
        metadata_path = self.paths[f'{model_key}_metadata']

        if not (os.path.exists(model_path) and os.path.exists(features_path)):
            self.models[model_key] = None
            self.features[model_key] = None
            self.defaults[model_key] = {}
            self.metadata[model_key] = {}
            return False

        self.models[model_key] = joblib.load(model_path)
        self.features[model_key] = joblib.load(features_path)
        self.defaults[model_key] = (
            joblib.load(defaults_path) if os.path.exists(defaults_path) else {}
        )
        self.metadata[model_key] = (
            joblib.load(metadata_path) if os.path.exists(metadata_path) else {}
        )
        return True

    def _load_models(self):
        loaded_any = False
        for model_key in MODEL_KEYS:
            loaded_any = self._load_model_bundle(model_key) or loaded_any

        if loaded_any:
            loaded_names = [k.upper() for k in MODEL_KEYS if self.models.get(k) is not None]
            print(f"[OK] ML models loaded into predictor: {', '.join(loaded_names)}")
        else:
            print("[WARNING] Models not found. Please run the training script first.")

    def _resolve_model(self, requested_model: str = 'rf'):
        requested = (requested_model or 'rf').strip().lower()
        if requested not in MODEL_KEYS:
            requested = 'rf'

        if self.models.get(requested) is not None:
            return requested, None

        for fallback in MODEL_KEYS:
            if self.models.get(fallback) is not None:
                return fallback, f"Requested model '{requested}' unavailable. Using '{fallback}'."

        return None, "Machine learning models are currently offline."

    def _build_feature_row(self, input_data: dict, expected_features, defaults: dict):
        row = pd.DataFrame(columns=expected_features)
        row.loc[0] = 0.0
        data = self._normalize_input(input_data)

        for field in NUMERIC_INPUT_FIELDS:
            if field in expected_features:
                fallback = defaults.get(field, 0.0)
                row.at[0, field] = self._to_float(data.get(field, fallback), fallback)

        course = str(data.get('course', defaults.get('course', ''))).strip().upper()
        if course:
            encoded_col = f'course_{course}'
            if encoded_col in expected_features:
                row.at[0, encoded_col] = 1.0

        for key, value in data.items():
            if key in expected_features and key not in NUMERIC_INPUT_FIELDS:
                row.at[0, key] = self._to_float(value, row.at[0, key])

        return row

    def predict_details(self, input_data: dict, model: str = 'rf') -> dict:
        model_key, model_note_or_error = self._resolve_model(model)
        if not model_key:
            return {'error': model_note_or_error}

        model_obj = self.models.get(model_key)
        expected_features = self.features.get(model_key)
        defaults = self.defaults.get(model_key, {})
        if model_obj is None or not expected_features:
            return {'error': 'Selected model is not available.'}

        input_df = self._build_feature_row(input_data, expected_features, defaults)
        raw_prediction = float(model_obj.predict(input_df)[0])
        prediction = int(raw_prediction >= 0.5) if model_key == 'lr' else int(raw_prediction)

        probability_employed = None
        if hasattr(model_obj, 'predict_proba'):
            probs = model_obj.predict_proba(input_df)
            if probs is not None and len(probs.shape) == 2 and probs.shape[1] >= 2:
                probability_employed = float(probs[0][1])
        elif model_key == 'lr':
            probability_employed = max(0.0, min(1.0, raw_prediction))

        result = {
            'label': 'Employed' if prediction == 1 else 'Unemployed',
            'prediction': prediction,
            'probability_employed': round(probability_employed, 4)
            if probability_employed is not None
            else None,
            'model_used': model_key,
            'requested_model': (model or 'rf').strip().lower(),
        }
        if model_note_or_error:
            result['model_note'] = model_note_or_error
        return result

    def predict(self, input_data: dict, model: str = 'rf') -> str:
        details = self.predict_details(input_data, model=model)
        if details.get('error'):
            return f"Error: {details['error']}"
        return details['label']

    def feature_importance(self, model: str = 'rf') -> dict:
        model_key = (model or 'rf').strip().lower()
        if model_key not in MODEL_KEYS:
            model_key = 'rf'

        model_obj = self.models.get(model_key)
        expected_features = self.features.get(model_key)
        if model_obj is None or not expected_features:
            return {'error': f"Model '{model_key}' is not loaded."}
        if not hasattr(model_obj, 'feature_importances_'):
            return {'error': f"Model '{model_key}' does not expose feature importances."}

        raw = model_obj.feature_importances_
        mapping = {
            feature: float(raw[idx])
            for idx, feature in enumerate(expected_features)
        }
        sorted_items = sorted(mapping.items(), key=lambda kv: kv[1], reverse=True)
        return {
            'model': model_key,
            'feature_importance': mapping,
            'top_features': [{'feature': k, 'importance': round(v, 6)} for k, v in sorted_items[:10]],
        }

    def status(self) -> dict:
        rf_meta = self.metadata.get('rf', {})
        models_status = {}
        for key in MODEL_KEYS:
            meta = self.metadata.get(key, {})
            models_status[key] = {
                'loaded': bool(self.models.get(key) is not None and self.features.get(key)),
                'feature_count': len(self.features.get(key) or []),
                'model_path': self.paths[f'{key}_model'],
                'trained_at_utc': meta.get('trained_at_utc'),
                'training_source': meta.get('source'),
                'row_count': meta.get('row_count'),
            }

        available_models = [k for k in MODEL_KEYS if models_status[k]['loaded']]
        primary_model = 'rf' if 'rf' in available_models else (available_models[0] if available_models else 'rf')
        primary_meta = self.metadata.get(primary_model, {}) if available_models else rf_meta

        # Keep top-level compatibility fields for existing UI (primary model).
        return {
            'loaded': bool(available_models),
            'feature_count': models_status[primary_model]['feature_count'],
            'model_path': models_status[primary_model]['model_path'],
            'trained_at_utc': primary_meta.get('trained_at_utc'),
            'training_source': primary_meta.get('source'),
            'row_count': primary_meta.get('row_count'),
            'primary_model': primary_model,
            'available_models': available_models,
            'models': models_status,
        }


# Create a single global instance for route handlers.
ml_predictor = EmployabilityPredictor()


def predict_employability(input_data: dict, model: str = 'rf') -> str:
    """Compatibility wrapper used by backend routes."""
    return ml_predictor.predict(input_data or {}, model=model)


def predict_employability_details(input_data: dict, model: str = 'rf') -> dict:
    return ml_predictor.predict_details(input_data or {}, model=model)


def predictor_status() -> dict:
    return ml_predictor.status()


def predictor_feature_importance(model: str = 'rf') -> dict:
    return ml_predictor.feature_importance(model=model)
