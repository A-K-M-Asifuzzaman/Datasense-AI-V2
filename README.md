# DataSense AI v2.0
**Startup-Grade Explainable Data Quality & AutoML Platform**

A production-ready full-stack web application covering the full data science lifecycle —
quality scoring, smart cleaning, advanced EDA, multi-model AutoML leaderboard, SHAP
explainability, Isolation Forest anomaly detection, deep statistical profiling, feature
engineering suggestions, and PDF report export.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, custom animation system |
| Charts | Plotly.js — zoomable, interactive, hover tooltips |
| HTTP | Axios with request/response interceptors |
| Backend | FastAPI, Uvicorn |
| Data | Pandas 3, NumPy 2, SciPy |
| ML | Scikit-learn, XGBoost, LightGBM |
| XAI | SHAP TreeExplainer |
| Anomaly | Isolation Forest + IQR + Z-Score |
| Reports | FPDF2 (PDF), JSON |

---

## Project Structure

```
datasense-ai/
├── backend/
│   ├── main.py                     # FastAPI app, CORS, global error handler
│   ├── requirements.txt
│   ├── routes/
│   │   ├── upload.py               # POST /api/upload
│   │   ├── quality.py              # GET  /api/quality/{id}
│   │   ├── cleaning.py             # POST /api/clean
│   │   ├── eda.py                  # GET  /api/eda/{id}
│   │   ├── insights.py             # GET  /api/insights/{id}
│   │   ├── ml.py                   # POST /api/train
│   │   ├── xai.py                  # GET  /api/xai/{id}
│   │   ├── automl.py               # POST /api/automl/train
│   │   ├── anomaly.py              # GET  /api/anomaly/{id}
│   │   ├── profiling.py            # GET  /api/profile/{id}
│   │   ├── features.py             # GET  /api/features/{id}
│   │   └── download.py             # GET  /api/download/{id}/csv|report|pdf
│   └── services/
│       ├── data_quality.py         # 4-dimension quality scorer
│       ├── cleaning.py             # Missing / duplicate / outlier cleaning
│       ├── eda.py                  # 7 Plotly chart types
│       ├── insights.py             # Auto-generated text insights
│       ├── ml_model.py             # Single-model RandomForest
│       ├── xai.py                  # SHAP TreeExplainer
│       ├── automl.py               # Multi-model parallel leaderboard
│       ├── anomaly.py              # Isolation Forest + IQR anomaly detection
│       ├── profiling.py            # Deep stats with Shapiro-Wilk normality
│       ├── feature_eng.py          # Feature engineering suggestions + code
│       └── report_pdf.py           # FPDF2 multi-page branded PDF
│
└── frontend/
    ├── src/
    │   ├── App.jsx                 # Router + global context
    │   ├── index.css               # Tailwind + full animation system
    │   ├── services/api.js         # Axios layer for all 15 endpoints
    │   ├── components/
    │   │   ├── Sidebar.jsx         # Animated sidebar with PDF download
    │   │   ├── PlotlyChart.jsx     # Dynamic Plotly wrapper
    │   │   ├── ScoreGauge.jsx      # SVG gauge + count-up animation
    │   │   ├── DataTable.jsx       # Styled preview table
    │   │   ├── LoadingSpinner.jsx  # Orbital spinner + bouncing dots
    │   │   ├── EmptyState.jsx      # Empty state with glow
    │   │   └── PageHeader.jsx
    │   └── pages/
    │       ├── UploadPage.jsx      # Drag-drop + pipeline steps
    │       ├── QualityPage.jsx     # Gauge dashboard + column stats
    │       ├── CleaningPage.jsx    # Strategy panel + animated log
    │       ├── EDAPage.jsx         # Single/Grid chart views + insights
    │       ├── MLPage.jsx          # Single model + SHAP XAI
    │       ├── AutoMLPage.jsx      # Multi-model leaderboard
    │       ├── AnomalyPage.jsx     # Anomaly detection results
    │       ├── ProfilingPage.jsx   # Deep column profiler
    │       └── FeaturesPage.jsx    # Feature engineering + code snippets
    ├── package.json
    ├── vite.config.js
    └── tailwind.config.js
```

---

## Quick Start

### Backend

```bash
cd datasense-ai/backend

python -m venv venv
source venv/bin/activate         # Windows: venv\Scripts\activate

pip install -r requirements.txt

uvicorn main:app --reload --port 8000
```

API:  http://localhost:8000  
Docs: http://localhost:8000/docs

### Frontend

```bash
cd datasense-ai/frontend

npm install
npm run dev
```

App: http://localhost:5173

### Docker

```bash
docker-compose up --build
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/health` | Health check |
| POST | `/api/upload` | Upload CSV, returns session_id |
| GET  | `/api/quality/{id}` | 4-dimension quality report |
| GET  | `/api/quality/{id}/suggestions` | Cleaning suggestions |
| POST | `/api/clean` | Apply cleaning |
| GET  | `/api/eda/{id}` | 7 Plotly chart payloads |
| GET  | `/api/insights/{id}` | Auto-generated insights |
| POST | `/api/train` | Single RandomForest model |
| GET  | `/api/xai/{id}` | SHAP global + individual |
| POST | `/api/automl/train` | Multi-model leaderboard |
| GET  | `/api/automl/result/{id}` | Cached leaderboard |
| GET  | `/api/anomaly/{id}` | Isolation Forest + IQR |
| GET  | `/api/profile/{id}` | Deep statistical profile |
| GET  | `/api/features/{id}` | Feature engineering suggestions |
| GET  | `/api/download/{id}/csv` | Cleaned CSV |
| GET  | `/api/download/{id}/report` | Full JSON report |
| GET  | `/api/download/{id}/pdf` | Branded PDF report |

---

## Features

### 1. CSV Upload
Drag-and-drop or click. Auto-detects column types. Preview first 10 rows.
Supports up to 100 MB / 100 K rows.

### 2. Data Quality Engine
Weighted score (0–100) across four dimensions:

| Dimension | Weight | Measures |
|---|---|---|
| Completeness | 35% | Missing value ratio |
| Uniqueness | 25% | Duplicate row detection |
| Outlier Score | 25% | IQR-based outlier count |
| Validity | 15% | Data type consistency |

### 3. Smart Cleaning
Auto/Mean/Median/Mode/Drop strategies per column. IQR or Z-Score
outlier clipping. Animated step-by-step cleaning log. Download cleaned CSV.

### 4. Advanced EDA (Plotly)
Seven interactive chart types: histograms, box plots, correlation heatmap,
scatter (auto-selects highest-correlated pair), missing values bar,
categorical distribution bars, data type pie. Single focus + Grid toggle.

### 5. Automated Insights
Skewness, strong correlations (|r|>0.8), class imbalance, near-zero variance,
high cardinality, constant columns, dataset summary.

### 6. AutoML Leaderboard
Trains up to 10 models in parallel using ThreadPoolExecutor:

- Random Forest, Extra Trees, Gradient Boosting
- XGBoost, LightGBM
- Logistic Regression / Ridge / Lasso
- Decision Tree, KNN

Returns ranked leaderboard with score, F1/R2, training time.
Best model auto-saved for SHAP XAI.

### 7. SHAP Explainability
TreeExplainer on best model. Global importance bar chart. Waterfall chart
for first prediction. Individual feature contribution bars (green/red).
Graceful fallback to model feature importance.

### 8. Anomaly Detection
Isolation Forest (global row-level) + IQR (per column). Returns anomaly
scores, flagged row indices, column breakdown with bounds, sample rows.

### 9. Deep Statistical Profiling
Per-column: mean/std/IQR/skewness/kurtosis/entropy, outlier count,
Shapiro-Wilk normality test (p-value), top-5 values, zero/negative counts.
Correlation matrix + high-correlation pair list (|r|>0.7).

### 10. Feature Engineering Suggestions
Analyzes all columns and suggests transformations with ready-to-paste
Python code snippets:

- Log/Sqrt transform for skewed numeric columns
- Quartile binning for high-cardinality numerics
- Z-score normalization
- Interaction features (col1 * col2) for correlated pairs
- Ratio features
- One-Hot / Target / Hash / Binary encoding per categorical cardinality
- Datetime feature extraction (year/month/weekday)

### 11. PDF Report Export
Multi-page branded PDF (FPDF2):
- Cover page with overall score
- Quality dimension score bars
- Column statistics table
- Automated insights list
- AutoML leaderboard table
- Best model metrics + feature importance bars
- Anomaly detection summary
- About page

---

## Edge Cases Handled

| Scenario | Behaviour |
|---|---|
| Empty CSV | HTTP 400 |
| Non-CSV file | HTTP 400 |
| File > 100 MB | Rejected at upload |
| > 100 K rows | Auto-truncated |
| All-missing column | Handled in quality + cleaning |
| Constant column | Flagged in insights, excluded from ML |
| Non-numeric target | Auto label-encoded |
| < 10 rows | Training rejected |
| Invalid target column | HTTP 400 with column list |
| SHAP failure | Falls back to model feature importance |
| CORS on 500 errors | Global exception handler injects headers |
| Numpy types in JSON | Recursive sanitizer on all responses |
| Pandas 3 inplace ops | All rewritten as assignment |
| Unicode in PDF | _safe() wrapper replacing non-latin-1 chars |
| XGBoost not installed | Graceful fallback (excluded from leaderboard) |

---

## Configuration

### Frontend `.env`

```
VITE_API_URL=http://localhost:8000
```

### Production Notes

- Session data is in-memory. Replace `DATA_STORE` in `routes/upload.py` with Redis for multi-worker deployments.
- SHAP samples max 200 rows for performance. Adjust in `services/xai.py`.
- AutoML uses `max_workers=4`. Increase for more CPU cores.
- PDF report generates synchronously. Move to background task (FastAPI `BackgroundTasks`) for large datasets.

---

## License

MIT
