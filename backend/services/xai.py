"""
SHAP-based XAI service.
Compatible with shap >= 0.46 (pandas 3 / numpy 2).
"""
import numpy as np
import pandas as pd
import shap
from typing import Any, Dict, List, Optional


def compute_shap_explanations(model_result: Dict[str, Any]) -> Dict[str, Any]:
    model        = model_result.get("model")
    X_test       = model_result.get("X_test")
    X_train      = model_result.get("X_train")
    feature_names: List[str] = model_result.get("feature_names", [])
    model_type   = model_result.get("model_type", "classification")

    if model is None or X_test is None:
        raise ValueError("Model or test data not available.")

    # Sample to keep computation fast
    sample_size = min(200, len(X_test))
    bg_size     = min(100, len(X_train))

    X_sample = (X_test.iloc[:sample_size] if hasattr(X_test, "iloc") else X_test[:sample_size])
    X_bg     = (X_train.iloc[:bg_size]    if hasattr(X_train, "iloc") else X_train[:bg_size])

    try:
        explainer = shap.TreeExplainer(model, X_bg)
        raw = explainer.shap_values(X_sample)

        # Normalise to 2-D array: (n_samples, n_features)
        if isinstance(raw, list):
            # multi-class or binary from older shap
            if len(raw) == 2:
                shap_vals = np.array(raw[1])          # positive class
            else:
                shap_vals = np.abs(np.array(raw)).mean(axis=0)
        else:
            shap_vals = np.array(raw)

        if shap_vals.ndim == 3:                       # (classes, samples, features)
            shap_vals = np.abs(shap_vals).mean(axis=0)

        # ── Global importance ──────────────────────────────────────────────
        mean_abs = np.abs(shap_vals).mean(axis=0)     # shape (n_features,)
        global_importance = {
            feat: round(float(v), 6)
            for feat, v in sorted(
                zip(feature_names, mean_abs), key=lambda x: x[1], reverse=True
            )
        }

        # ── Summary data (top 10 features) ────────────────────────────────
        top_features = list(global_importance.keys())[:10]
        summary_data: List[Dict] = []
        for feat in top_features:
            idx = list(feature_names).index(feat)
            if idx >= shap_vals.shape[1]:
                continue
            feat_shap = shap_vals[:, idx].tolist()
            if hasattr(X_sample, "iloc"):
                feat_vals = X_sample.iloc[:, idx].tolist()
            else:
                feat_vals = X_sample[:, idx].tolist()
            summary_data.append({
                "feature":        feat,
                "shap_values":    [round(v, 6) for v in feat_shap[:50]],
                "feature_values": [_sf(v) for v in feat_vals[:50]],
                "mean_abs_shap":  global_importance[feat],
            })

        # ── Individual explanation (first instance) ────────────────────────
        individual: List[Dict] = []
        if len(shap_vals) > 0:
            for feat, val in zip(feature_names, shap_vals[0]):
                individual.append({
                    "feature":    feat,
                    "shap_value": round(float(val), 6),
                    "direction":  "positive" if val >= 0 else "negative",
                })
            individual.sort(key=lambda x: abs(x["shap_value"]), reverse=True)

        # ── Plotly charts ──────────────────────────────────────────────────
        top_global = list(global_importance.items())[:15]
        max_val    = top_global[0][1] if top_global else 1.0

        shap_bar = {
            "id":    "shap_global_importance",
            "type":  "bar",
            "title": "SHAP Global Feature Importance",
            "data": [{
                "type": "bar",
                "x":    [v for _, v in top_global],
                "y":    [f for f, _ in top_global],
                "orientation": "h",
                "marker": {
                    "color": [
                        f"rgba(99,102,241,{max(0.25, v / max_val):.2f})"
                        for _, v in top_global
                    ]
                },
                "name": "Mean |SHAP|",
            }],
            "layout": {
                "title":  "Global SHAP Feature Importance",
                "xaxis":  {"title": "Mean |SHAP Value|"},
                "yaxis":  {"autorange": "reversed"},
                "template":      "plotly_dark",
                "paper_bgcolor": "rgba(0,0,0,0)",
                "plot_bgcolor":  "rgba(0,0,0,0)",
                "font":          {"color": "#e2e8f0"},
                "height": 420,
                "margin": {"t": 50, "r": 20, "b": 60, "l": 160},
            },
        }

        wf_data = individual[:12]
        waterfall = {
            "id":    "shap_waterfall",
            "type":  "bar",
            "title": "SHAP Waterfall – Instance #1",
            "data": [{
                "type": "bar",
                "x":    [d["feature"]    for d in wf_data],
                "y":    [d["shap_value"] for d in wf_data],
                "marker": {
                    "color": [
                        "#10b981" if d["shap_value"] >= 0 else "#ef4444"
                        for d in wf_data
                    ]
                },
                "name": "SHAP Contribution",
            }],
            "layout": {
                "title":  "SHAP Feature Contributions (Single Prediction)",
                "xaxis":  {"title": "Feature", "tickangle": -30},
                "yaxis":  {"title": "SHAP Value"},
                "template":      "plotly_dark",
                "paper_bgcolor": "rgba(0,0,0,0)",
                "plot_bgcolor":  "rgba(0,0,0,0)",
                "font":          {"color": "#e2e8f0"},
            },
        }

        return {
            "global_importance":      global_importance,
            "summary_data":           summary_data,
            "individual_explanation": individual[:15],
            "charts":                 [shap_bar, waterfall],
            "n_samples_explained":    sample_size,
            "model_type":             model_type,
        }

    except Exception as exc:
        # Graceful fallback — return model's built-in feature importance
        feature_importance: Dict[str, float] = model_result.get("feature_importance", {})
        top_fi = list(feature_importance.items())[:15]
        fallback_chart = {
            "id":    "feature_importance_fallback",
            "type":  "bar",
            "title": "Feature Importance (Fallback)",
            "data": [{
                "type": "bar",
                "x":    [v for _, v in top_fi],
                "y":    [f for f, _ in top_fi],
                "orientation": "h",
                "marker": {"color": "#6366f1"},
                "name": "Importance",
            }],
            "layout": {
                "title":  "Feature Importance (SHAP unavailable)",
                "xaxis":  {"title": "Importance Score"},
                "yaxis":  {"autorange": "reversed"},
                "template":      "plotly_dark",
                "paper_bgcolor": "rgba(0,0,0,0)",
                "plot_bgcolor":  "rgba(0,0,0,0)",
                "font":          {"color": "#e2e8f0"},
                "height": 400,
                "margin": {"l": 150},
            },
        }
        return {
            "global_importance":      feature_importance,
            "summary_data":           [],
            "individual_explanation": [],
            "charts":                 [fallback_chart],
            "n_samples_explained":    0,
            "model_type":             model_type,
            "warning":                f"SHAP failed ({exc}). Showing model feature importance.",
        }


def _sf(val: Any) -> Optional[float]:
    try:
        f = float(val)
        return None if (np.isnan(f) or np.isinf(f)) else round(f, 4)
    except Exception:
        return None
