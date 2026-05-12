"""
AutoML service - pandas 3.x compatible, no inplace chained assignment.
"""
import pandas as pd
import numpy as np
from typing import Any, Dict, Tuple
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    accuracy_score, f1_score, classification_report,
    mean_squared_error, r2_score, mean_absolute_error,
)


def detect_task_type(df: pd.DataFrame, target_col: str) -> str:
    target = df[target_col].dropna()
    n_unique = target.nunique()
    if target.dtype == object:
        return "classification"
    if pd.api.types.is_integer_dtype(target) and n_unique < 15:
        return "classification"
    if n_unique < 10:
        return "classification"
    return "regression"


def prepare_features(df: pd.DataFrame, target_col: str) -> Tuple[pd.DataFrame, pd.Series]:
    df = df.copy()

    # Drop columns with >50 % missing
    df = df.loc[:, df.isnull().mean() < 0.5]

    if target_col not in df.columns:
        raise ValueError(f"Target column '{target_col}' not found.")

    y = df[target_col].copy()
    X = df.drop(columns=[target_col])

    # Remove constant columns
    X = X.loc[:, X.nunique() > 1]

    # Encode categoricals
    for col in X.select_dtypes(include="object").columns:
        le = LabelEncoder()
        X = X.assign(**{col: le.fit_transform(X[col].astype(str))})

    # Fill remaining missing values (no chained inplace)
    fill_values = {}
    for col in X.columns:
        if X[col].isnull().any():
            if pd.api.types.is_numeric_dtype(X[col]):
                fill_values[col] = X[col].median()
            else:
                fill_values[col] = 0
    if fill_values:
        X = X.fillna(fill_values)

    return X, y


def train_model(
    df: pd.DataFrame,
    target_col: str,
    model_type: str = "auto",
    test_size: float = 0.2,
) -> Dict[str, Any]:

    if model_type == "auto":
        model_type = detect_task_type(df, target_col)

    X, y = prepare_features(df, target_col)

    if len(X) < 10:
        raise ValueError("Not enough data to train. Minimum 10 rows required.")

    # Encode target for classification
    le_target = None
    class_names = None
    if model_type == "classification":
        if y.dtype == object or not pd.api.types.is_numeric_dtype(y):
            le_target = LabelEncoder()
            y = pd.Series(le_target.fit_transform(y.astype(str)), index=y.index)
            class_names = le_target.classes_.tolist()
        else:
            class_names = [str(c) for c in sorted(y.unique())]

    # Drop rows where target is null
    valid_idx = y.dropna().index
    X = X.loc[valid_idx]
    y = y.loc[valid_idx]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=42
    )

    if model_type == "classification":
        model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        accuracy = round(float(accuracy_score(y_test, y_pred)), 4)
        f1 = round(float(f1_score(y_test, y_pred, average="weighted", zero_division=0)), 4)
        metrics: Dict[str, Any] = {"accuracy": accuracy, "f1_score": f1}
        try:
            raw_report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
            clean_report: Dict[str, Any] = {}
            for k, v in raw_report.items():
                if isinstance(v, dict):
                    clean_report[k] = {kk: round(float(vv), 4) for kk, vv in v.items()}
                else:
                    clean_report[k] = round(float(v), 4)
            metrics["classification_report"] = clean_report
        except Exception:
            pass
    else:
        model = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        metrics = {
            "rmse": round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4),
            "mae": round(float(mean_absolute_error(y_test, y_pred)), 4),
            "r2_score": round(float(r2_score(y_test, y_pred)), 4),
        }

    # Feature importance (sorted)
    feature_importance = {
        feat: round(float(imp), 6)
        for feat, imp in sorted(
            zip(X.columns, model.feature_importances_),
            key=lambda x: x[1],
            reverse=True,
        )
    }

    return {
        "model_type": model_type,
        "target_column": target_col,
        "features": X.columns.tolist(),
        "n_features": int(len(X.columns)),
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "metrics": metrics,
        "feature_importance": feature_importance,
        "class_names": class_names,
        # Non-serialisable — used only for XAI, stripped before JSON response
        "model": model,
        "X_test": X_test,
        "y_test": y_test,
        "X_train": X_train,
        "feature_names": X.columns.tolist(),
    }
