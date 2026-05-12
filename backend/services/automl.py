"""
Multi-Model AutoML Service
Trains 8 models in parallel, returns ranked leaderboard.
"""
import time, traceback
import numpy as np
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional, Tuple

from sklearn.ensemble import (
    RandomForestClassifier, RandomForestRegressor,
    ExtraTreesClassifier, ExtraTreesRegressor,
    GradientBoostingClassifier, GradientBoostingRegressor,
)
from sklearn.linear_model import LogisticRegression, Ridge, Lasso
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    accuracy_score, f1_score,
    mean_squared_error, r2_score, mean_absolute_error,
)

try:
    from xgboost import XGBClassifier, XGBRegressor
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

try:
    from lightgbm import LGBMClassifier, LGBMRegressor
    HAS_LGB = True
except ImportError:
    HAS_LGB = False


CLASSIFIERS = {
    "Random Forest":      lambda: RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1),
    "Extra Trees":        lambda: ExtraTreesClassifier(n_estimators=100, random_state=42, n_jobs=-1),
    "Gradient Boosting":  lambda: GradientBoostingClassifier(n_estimators=100, random_state=42),
    "Decision Tree":      lambda: DecisionTreeClassifier(random_state=42, max_depth=10),
    "KNN":                lambda: KNeighborsClassifier(n_neighbors=5, n_jobs=-1),
    "Logistic Regression":lambda: LogisticRegression(max_iter=500, random_state=42, n_jobs=-1),
}
REGRESSORS = {
    "Random Forest":      lambda: RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1),
    "Extra Trees":        lambda: ExtraTreesRegressor(n_estimators=100, random_state=42, n_jobs=-1),
    "Gradient Boosting":  lambda: GradientBoostingRegressor(n_estimators=100, random_state=42),
    "Decision Tree":      lambda: DecisionTreeRegressor(random_state=42, max_depth=10),
    "KNN":                lambda: KNeighborsRegressor(n_neighbors=5, n_jobs=-1),
    "Ridge":              lambda: Ridge(random_state=42),
    "Lasso":              lambda: Lasso(random_state=42, max_iter=2000),
}

if HAS_XGB:
    CLASSIFIERS["XGBoost"] = lambda: XGBClassifier(n_estimators=100, random_state=42, verbosity=0, use_label_encoder=False, eval_metric="logloss")
    REGRESSORS["XGBoost"]  = lambda: XGBRegressor(n_estimators=100, random_state=42, verbosity=0)
if HAS_LGB:
    CLASSIFIERS["LightGBM"] = lambda: LGBMClassifier(n_estimators=100, random_state=42, verbose=-1)
    REGRESSORS["LightGBM"]  = lambda: LGBMRegressor(n_estimators=100, random_state=42, verbose=-1)


def detect_task(df: pd.DataFrame, target: str) -> str:
    s = df[target].dropna()
    if s.dtype == object or s.nunique() < 15:
        return "classification"
    return "regression"


def prepare(df: pd.DataFrame, target: str):
    df = df.copy()
    df = df.loc[:, df.isnull().mean() < 0.5]
    if target not in df.columns:
        raise ValueError(f"Target '{target}' not found.")
    y = df[target].copy()
    X = df.drop(columns=[target])
    X = X.loc[:, X.nunique() > 1]
    for col in X.select_dtypes(include="object").columns:
        le = LabelEncoder()
        X = X.assign(**{col: le.fit_transform(X[col].astype(str))})
    fill = {c: X[c].median() if pd.api.types.is_numeric_dtype(X[c]) else 0
            for c in X.columns if X[c].isnull().any()}
    if fill: X = X.fillna(fill)
    return X, y


def _train_one(name: str, builder, X_train, X_test, y_train, y_test, task: str) -> Dict[str, Any]:
    t0 = time.time()
    try:
        model = builder()
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        elapsed = round(time.time() - t0, 3)

        if task == "classification":
            acc = round(float(accuracy_score(y_test, y_pred)), 4)
            f1  = round(float(f1_score(y_test, y_pred, average="weighted", zero_division=0)), 4)
            score = acc
            metrics = {"accuracy": acc, "f1_score": f1}
        else:
            rmse = round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 4)
            mae  = round(float(mean_absolute_error(y_test, y_pred)), 4)
            r2   = round(float(r2_score(y_test, y_pred)), 4)
            score = r2
            metrics = {"rmse": rmse, "mae": mae, "r2_score": r2}

        fi = {}
        if hasattr(model, "feature_importances_"):
            fi = {f: round(float(v), 6) for f, v in
                  sorted(zip(X_train.columns, model.feature_importances_), key=lambda x: x[1], reverse=True)}

        return {
            "name": name, "status": "success", "score": score,
            "metrics": metrics, "feature_importance": fi,
            "train_time_sec": elapsed, "model_object": model,
        }
    except Exception as e:
        return {"name": name, "status": "failed", "error": str(e), "score": -999,
                "metrics": {}, "feature_importance": {}, "train_time_sec": 0, "model_object": None}


def run_automl(df: pd.DataFrame, target: str, task: str = "auto", test_size: float = 0.2) -> Dict[str, Any]:
    if task == "auto":
        task = detect_task(df, target)

    X, y = prepare(df, target)

    le_target = None
    class_names = None
    if task == "classification":
        if y.dtype == object or not pd.api.types.is_numeric_dtype(y):
            le_target = LabelEncoder()
            y = pd.Series(le_target.fit_transform(y.astype(str)), index=y.index)
            class_names = le_target.classes_.tolist()
        else:
            class_names = [str(c) for c in sorted(y.unique())]

    valid = y.dropna().index
    X, y = X.loc[valid], y.loc[valid]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=test_size, random_state=42)

    builders = CLASSIFIERS if task == "classification" else REGRESSORS

    results = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {
            pool.submit(_train_one, name, builder, X_train, X_test, y_train, y_test, task): name
            for name, builder in builders.items()
        }
        for future in as_completed(futures):
            results.append(future.result())

    results.sort(key=lambda r: r["score"], reverse=True)

    best = next((r for r in results if r["status"] == "success"), None)
    leaderboard = []
    for rank, r in enumerate(results, 1):
        row = {
            "rank": rank,
            "model": r["name"],
            "status": r["status"],
            "score": round(r["score"], 4),
            "metrics": r["metrics"],
            "train_time_sec": r["train_time_sec"],
            "is_best": r["name"] == (best["name"] if best else ""),
        }
        if r.get("error"):
            row["error"] = r["error"]
        leaderboard.append(row)

    best_model_result = None
    if best:
        best_model_result = {
            "model_type": task,
            "target_column": target,
            "best_model": best["name"],
            "features": X.columns.tolist(),
            "n_features": int(len(X.columns)),
            "n_train": int(len(X_train)),
            "n_test": int(len(X_test)),
            "metrics": best["metrics"],
            "feature_importance": best["feature_importance"],
            "class_names": class_names,
            # non-serialisable – for XAI/predict
            "model": best["model_object"],
            "X_test": X_test,
            "y_test": y_test,
            "X_train": X_train,
            "feature_names": X.columns.tolist(),
        }

    return {
        "task": task,
        "target": target,
        "leaderboard": leaderboard,
        "best_model": best["name"] if best else None,
        "n_models_trained": len([r for r in results if r["status"] == "success"]),
        "n_models_failed":  len([r for r in results if r["status"] == "failed"]),
        "features": X.columns.tolist(),
        "n_train": int(len(X_train)),
        "n_test":  int(len(X_test)),
        "best_model_result": best_model_result,
    }
