"""
PDF Report Generator using FPDF2 (unicode-safe, Latin-1 only chars).
"""
from fpdf import FPDF
from fpdf.enums import XPos, YPos
import io, datetime
from typing import Any, Dict, List, Optional

BRAND   = (99, 102, 241)
SUCCESS = (16, 185, 129)
WARNING = (245, 158, 11)
DANGER  = (239, 68, 68)
TEXT    = (226, 232, 240)
MUTED   = (100, 116, 139)
DARK    = (17, 20, 32)


def _safe(text: str) -> str:
    """Replace non-latin-1 characters to keep fpdf2 happy."""
    replacements = {
        "\u2014": "-", "\u2013": "-", "\u2019": "'", "\u2018": "'",
        "\u201c": '"', "\u201d": '"', "\u00d7": "x", "\u2190": "<-",
        "\u2192": "->", "\u2194": "<->", "\u2260": "!=", "\u2265": ">=",
        "\u2264": "<=", "\u00b1": "+/-", "\u221a": "sqrt",
        "\u03b1": "alpha", "\u03b2": "beta", "\u03c3": "sigma",
    }
    result = str(text)
    for src, dst in replacements.items():
        result = result.replace(src, dst)
    return result.encode("latin-1", errors="replace").decode("latin-1")


class DataSenseReport(FPDF):
    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=22)
        self.set_margins(18, 20, 18)

    def header(self):
        self.set_fill_color(*DARK)
        self.rect(0, 0, 210, 16, "F")
        self.set_xy(12, 4)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*BRAND)
        self.cell(0, 8, _safe("DataSense AI  -  Data Quality & AutoML Report"),
                  new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    def footer(self):
        self.set_y(-14)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*MUTED)
        now = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        self.cell(0, 6, _safe(f"Page {self.page_no()}  |  Generated {now}  |  DataSense AI v2.0"),
                  align="C")

    def h1(self, text: str):
        self.ln(5)
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(*BRAND)
        self.cell(0, 9, _safe(text), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_draw_color(*BRAND)
        self.set_line_width(0.4)
        self.line(self.l_margin, self.get_y(), 210 - self.r_margin, self.get_y())
        self.ln(4)

    def h2(self, text: str):
        self.ln(3)
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(*TEXT)
        self.cell(0, 7, _safe(text), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(2)

    def body(self, text: str):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*TEXT)
        self.multi_cell(0, 6, _safe(text))
        self.ln(2)

    def kv(self, key: str, value: str, color=None):
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*MUTED)
        self.cell(58, 7, _safe(key + ":"), new_x=XPos.RIGHT, new_y=YPos.LAST)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*(color or TEXT))
        self.cell(0, 7, _safe(str(value)), new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    def score_bar(self, label: str, score: float):
        color = SUCCESS if score >= 80 else (WARNING if score >= 60 else DANGER)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*TEXT)
        self.cell(58, 7, _safe(label))
        x = self.get_x(); y = self.get_y() + 1.5
        self.set_fill_color(30, 35, 52)
        self.rect(x, y, 88, 4, "F")
        self.set_fill_color(*color)
        self.rect(x, y, 88 * (min(score, 100) / 100), 4, "F")
        self.set_xy(x + 91, self.get_y())
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*color)
        self.cell(18, 7, f"{score:.1f}%", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    def info_box(self, title: str, rows: List):
        self.set_fill_color(*DARK)
        self.set_draw_color(40, 46, 70)
        self.set_line_width(0.25)
        box_h = 8 + len(rows) * 7
        self.rect(self.l_margin, self.get_y(), 210 - self.l_margin - self.r_margin, box_h, "FD")
        self.set_x(self.l_margin + 4)
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*BRAND)
        self.cell(0, 6, _safe(title), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_x(self.l_margin + 4)
        for k, v in rows:
            self.kv("  " + k, v)
        self.ln(4)

    def table_header(self, cols: List):
        self.set_font("Helvetica", "B", 8)
        self.set_fill_color(*DARK)
        self.set_text_color(*MUTED)
        for label, w in cols:
            self.cell(w, 6, _safe(label), border=1, fill=True)
        self.ln()

    def table_row(self, cells: List, highlight=False):
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*(SUCCESS if highlight else TEXT))
        for val, w in cells:
            self.cell(w, 6, _safe(str(val)[:20]), border=1)
        self.ln()


def generate_pdf_report(
    session_id: str,
    filename: str,
    quality: Dict[str, Any],
    insights: list,
    model_result: Optional[Dict] = None,
    automl_result: Optional[Dict] = None,
    anomaly_result: Optional[Dict] = None,
) -> bytes:
    pdf = DataSenseReport()

    # ── Cover ──────────────────────────────────────────────────────────────
    pdf.add_page()
    pdf.set_y(40)
    pdf.set_font("Helvetica", "B", 30)
    pdf.set_text_color(*BRAND)
    pdf.cell(0, 14, "DataSense AI", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_font("Helvetica", "", 13)
    pdf.set_text_color(*MUTED)
    pdf.cell(0, 8, "Explainable Data Quality & AutoML Report", align="C",
             new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(6)
    pdf.set_draw_color(*BRAND)
    pdf.set_line_width(0.6)
    pdf.line(45, pdf.get_y(), 165, pdf.get_y())
    pdf.ln(10)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*TEXT)
    for line in [f"File: {filename}", f"Session: {session_id[:8].upper()}",
                 f"Generated: {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}"]:
        pdf.cell(0, 7, _safe(line), align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(14)
    score = float(quality.get("overall_score", 0))
    color = SUCCESS if score >= 80 else (WARNING if score >= 60 else DANGER)
    pdf.set_font("Helvetica", "B", 52)
    pdf.set_text_color(*color)
    pdf.cell(0, 26, f"{score:.0f}/100", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(*MUTED)
    pdf.cell(0, 7, "Overall Data Quality Score", align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    grade = "Excellent" if score >= 80 else ("Fair" if score >= 60 else "Poor")
    pdf.set_font("Helvetica", "B", 13)
    pdf.set_text_color(*color)
    pdf.cell(0, 8, grade, align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    # ── Quality ────────────────────────────────────────────────────────────
    pdf.add_page()
    pdf.h1("Data Quality Analysis")
    pdf.h2("Dimension Scores")
    for label, key in [("Completeness", "completeness"), ("Uniqueness", "uniqueness"),
                       ("Outlier Score", "outlier_score"), ("Validity", "validity")]:
        pdf.score_bar(label, float(quality.get(key, 0)))
    pdf.ln(4)
    pdf.h2("Dataset Summary")
    pdf.info_box("Key Metrics", [
        ("Total Rows",      f"{quality.get('total_rows', 0):,}"),
        ("Total Columns",   str(quality.get("total_columns", 0))),
        ("Missing Cells",   f"{quality.get('total_missing', 0):,}"),
        ("Duplicate Rows",  f"{quality.get('total_duplicates', 0):,}"),
        ("Outlier Values",  f"{quality.get('total_outliers', 0):,}"),
    ])
    col_stats = quality.get("column_stats", {})
    if col_stats:
        pdf.h2("Column Statistics (first 20)")
        pdf.table_header([("Column",48),("Type",22),("Missing%",24),("Unique",22),("Outliers",24),("Mean/Top",34)])
        for col, s in list(col_stats.items())[:20]:
            val = s.get("mean") or s.get("top_value") or "-"
            pdf.table_row([
                (col[:16], 48), (str(s.get("dtype",""))[:9], 22),
                (f"{s.get('missing_pct',0):.1f}%", 24),
                (str(s.get("unique_count","-"))[:8], 22),
                (str(s.get("outlier_count","-"))[:8], 24),
                (str(val)[:12], 34),
            ])

    # ── Insights ───────────────────────────────────────────────────────────
    pdf.add_page()
    pdf.h1("Automated Insights")
    severity_labels = {"high":"[HIGH]","medium":"[MED]","low":"[LOW]","info":"[INFO]"}
    severity_colors = {"high": DANGER, "medium": WARNING, "low": BRAND, "info": MUTED}
    real_insights = [i for i in insights if i.get("type") != "summary"]
    for ins in real_insights[:18]:
        sev = ins.get("severity", "info")
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(*severity_colors.get(sev, MUTED))
        pdf.cell(16, 6, severity_labels.get(sev, "[?]"))
        pdf.set_text_color(*TEXT)
        pdf.cell(0, 6, _safe(ins.get("title", "")[:75]),
                 new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(*MUTED)
        pdf.multi_cell(0, 5, _safe("    " + ins.get("description", "")[:200]))
        pdf.ln(1)

    # ── AutoML ─────────────────────────────────────────────────────────────
    if automl_result:
        pdf.add_page()
        pdf.h1("AutoML Leaderboard")
        pdf.body(
            f"Task: {automl_result.get('task','').title()} | "
            f"Best: {automl_result.get('best_model','-')} | "
            f"Models trained: {automl_result.get('n_models_trained',0)} | "
            f"Train samples: {automl_result.get('n_train',0):,}"
        )
        leaderboard = automl_result.get("leaderboard", [])
        if leaderboard:
            metric_key = "accuracy" if automl_result.get("task") == "classification" else "r2_score"
            pdf.table_header([("Rank",14),("Model",55),("Score",22),("F1/R2",22),("Time(s)",25),("Status",36)])
            for row in leaderboard:
                met = row.get("metrics", {})
                f1_r2 = met.get("f1_score", met.get("r2_score", "-"))
                pdf.table_row([
                    (f"#{row['rank']}", 14),
                    (("* " if row.get("is_best") else "  ") + row.get("model","")[:20], 55),
                    (str(row.get("score",""))[:8], 22),
                    (str(f1_r2)[:8], 22),
                    (str(row.get("train_time_sec",""))[:6], 25),
                    (str(row.get("status",""))[:12], 36),
                ], highlight=row.get("is_best", False))

    # ── Model metrics ──────────────────────────────────────────────────────
    if model_result:
        if not automl_result:
            pdf.add_page()
            pdf.h1("Machine Learning Results")
        else:
            pdf.ln(8)
            pdf.h2("Best Model Details")
        pdf.info_box(f"Model: {model_result.get('best_model', model_result.get('model_type',''))}", [
            (k.upper(), str(v)) for k, v in model_result.get("metrics", {}).items()
            if not isinstance(v, dict)
        ][:8])
        fi = model_result.get("feature_importance", {})
        if fi:
            pdf.h2("Top Feature Importances")
            for feat, imp in list(fi.items())[:10]:
                pdf.score_bar(feat[:28], float(imp) * 100)

    # ── Anomaly ────────────────────────────────────────────────────────────
    if anomaly_result and not anomaly_result.get("error"):
        pdf.add_page()
        pdf.h1("Anomaly Detection")
        pdf.info_box("Summary", [
            ("Isolation Forest anomalies",
             f"{anomaly_result.get('iso_forest_anomalies',0):,} "
             f"({anomaly_result.get('iso_forest_anomaly_pct',0):.1f}%)"),
            ("IQR anomaly rows",
             f"{anomaly_result.get('iqr_anomaly_rows',0):,} "
             f"({anomaly_result.get('iqr_anomaly_row_pct',0):.1f}%)"),
            ("Total rows analyzed", f"{anomaly_result.get('total_rows',0):,}"),
        ])
        col_anom = anomaly_result.get("column_anomaly_summary", [])
        if col_anom:
            pdf.h2("Column Breakdown (IQR)")
            for c in col_anom[:12]:
                pdf.kv(c["column"], f"{c['count']} outliers ({c['pct']}%)")

    # ── Closing ────────────────────────────────────────────────────────────
    pdf.add_page()
    pdf.h1("About DataSense AI")
    pdf.body(
        "DataSense AI is a production-grade Explainable Data Quality and AutoML Platform. "
        "It delivers end-to-end intelligent data analysis including CSV ingestion, "
        "quality scoring across four dimensions, smart cleaning with IQR and Z-Score outlier "
        "handling, advanced EDA with seven Plotly chart types, multi-model AutoML leaderboard "
        "with XGBoost and LightGBM, SHAP-powered explainability, Isolation Forest anomaly "
        "detection, deep statistical profiling with Shapiro-Wilk normality tests, "
        "feature engineering suggestions, and PDF report generation."
    )
    pdf.ln(4)
    pdf.kv("Platform",  "DataSense AI v2.0")
    pdf.kv("Report ID", session_id[:8].upper())
    pdf.kv("Filename",  filename)
    pdf.kv("Generated", datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"))

    return bytes(pdf.output())
