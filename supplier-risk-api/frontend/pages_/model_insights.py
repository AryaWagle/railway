"""Model insights: training metrics, feature importance, confusion matrix."""
from __future__ import annotations

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from frontend import api_client
from frontend.theme import (
    ANTD_COLORS,
    kpi_card,
    kpi_grid,
    style_plotly,
)
from backend.app.features import FEATURE_LABELS


@st.cache_data(ttl=300)
def _metrics() -> dict:
    return api_client.metrics()


def render() -> None:
    m = _metrics()

    kpi_grid([
        kpi_card("ROC AUC", f"{m['roc_auc']:.3f}", suffix="", delta="Higher = better", delta_dir="up", accent=ANTD_COLORS["primary"]),
        kpi_card("Accuracy", f"{m['accuracy']*100:.1f}", suffix="%", delta=f"on {m['n_test']} test rows", delta_dir="flat", accent=ANTD_COLORS["success"]),
        kpi_card("Precision", f"{m['precision']*100:.1f}", suffix="%", delta="of flagged were true", delta_dir="flat", accent=ANTD_COLORS["info"]),
        kpi_card("Recall", f"{m['recall']*100:.1f}", suffix="%", delta="of distress caught", delta_dir="flat", accent=ANTD_COLORS["warning"]),
        kpi_card("F1", f"{m['f1']*100:.1f}", suffix="%", delta="balanced metric", delta_dir="flat", accent=ANTD_COLORS["purple"]),
        kpi_card("Train rows", f"{m['n_train']:,}", suffix="", delta=f"{m['positive_rate_train']*100:.1f}% positive", delta_dir="flat", accent=ANTD_COLORS["geekblue"]),
    ])

    col1, col2 = st.columns([1.4, 1])

    with col1:
        st.markdown('<div class="section-card"><h3>Feature importance</h3>', unsafe_allow_html=True)
        fi = pd.DataFrame(m["feature_importances"])
        fi["label"] = fi["feature"].map(FEATURE_LABELS).fillna(fi["feature"])
        fi = fi.sort_values("importance", ascending=True).tail(15)
        fig = go.Figure(go.Bar(
            x=fi["importance"], y=fi["label"], orientation="h",
            marker_color=ANTD_COLORS["primary"],
            text=[f"{v:.3f}" for v in fi["importance"]],
            textposition="outside",
        ))
        fig.update_xaxes(title="Importance")
        st.plotly_chart(style_plotly(fig, height=480), use_container_width=True, config={"displayModeBar": False})
        st.markdown("</div>", unsafe_allow_html=True)

    with col2:
        st.markdown('<div class="section-card"><h3>Confusion matrix</h3>', unsafe_allow_html=True)
        cm = m["confusion_matrix"]
        labels = ["Healthy", "Distressed"]
        heat = go.Figure(go.Heatmap(
            z=cm, x=labels, y=labels,
            colorscale=[[0, "#ffffff"], [1, ANTD_COLORS["primary"]]],
            text=[[str(v) for v in row] for row in cm],
            texttemplate="%{text}", textfont=dict(size=22, color=ANTD_COLORS["text"]),
            showscale=False,
        ))
        heat.update_xaxes(title="Predicted")
        heat.update_yaxes(title="Actual", autorange="reversed")
        st.plotly_chart(style_plotly(heat, height=320), use_container_width=True, config={"displayModeBar": False})
        st.markdown(
            f"""
            <div style='font-size:13px; color:var(--hud-muted);'>
                <b>Train/test split:</b> {m['n_train']} / {m['n_test']} rows<br>
                <b>Positive rate:</b> train {m['positive_rate_train']*100:.1f}% · test {m['positive_rate_test']*100:.1f}%<br>
                <b>Trained at:</b> {m['trained_at'][:19]} UTC
            </div>
            """,
            unsafe_allow_html=True,
        )
        st.markdown("</div>", unsafe_allow_html=True)

    st.markdown('<div class="section-card"><h3>Test-set risk score percentiles</h3>', unsafe_allow_html=True)
    sd = m["score_distribution"]
    bars = pd.DataFrame({
        "stat": ["Mean", "p25", "Median (p50)", "p75", "p95"],
        "value": [sd["mean"], sd["p25"], sd["p50"], sd["p75"], sd["p95"]],
    })
    fig = go.Figure(go.Bar(
        x=bars["stat"], y=bars["value"],
        marker_color=[ANTD_COLORS["primary"], ANTD_COLORS["success"], ANTD_COLORS["info"],
                      ANTD_COLORS["warning"], ANTD_COLORS["danger"]],
        text=[f"{v:.1f}" for v in bars["value"]], textposition="outside",
    ))
    fig.update_yaxes(title="Risk score (0-100)")
    st.plotly_chart(style_plotly(fig, height=300), use_container_width=True, config={"displayModeBar": False})
    st.markdown("</div>", unsafe_allow_html=True)

    st.markdown(
        """
        <div class='section-card'>
        <h3>About the model</h3>
        <ul style='color:var(--hud-text); font-size:14px; line-height:1.7;'>
          <li><b>Algorithm:</b> Random Forest (300 trees, depth 12, balanced class weights) inside a sklearn Pipeline with StandardScaler.</li>
          <li><b>Output:</b> calibrated distress probability mapped to a 0-100 risk score and four tiers: Low (&lt;25), Moderate (25-50), High (50-75), Critical (&ge;75).</li>
          <li><b>Explanations:</b> top contributing factors are computed as <code>importance &times; signed deviation from the dataset mean</code>, sorted by magnitude.</li>
          <li><b>Training data:</b> synthetic suppliers with operational, financial, and engagement features; reproducible (seed = 7).</li>
          <li><b>Endpoints:</b> <code>POST /score</code>, <code>POST /score/batch</code>, <code>GET /suppliers</code>, <code>GET /suppliers/{{id}}</code>, <code>GET /metrics</code>, <code>GET /health</code>.</li>
        </ul>
        </div>
        """,
        unsafe_allow_html=True,
    )
