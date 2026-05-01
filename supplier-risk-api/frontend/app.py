"""Supplier Risk Intelligence — Streamlit dashboard with an Ant Design feel.

Run:
    streamlit run frontend/app.py

Requires the FastAPI backend at $RISK_API_URL (default http://127.0.0.1:8000).
"""
from __future__ import annotations

import sys
from pathlib import Path

import streamlit as st
import streamlit_antd_components as sac

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from frontend import api_client  # noqa: E402
from frontend.pages_ import analytics, model_insights, overview, score_form, suppliers  # noqa: E402
from frontend.theme import inject_css, page_header  # noqa: E402

st.set_page_config(
    page_title="Supplier Risk Intelligence",
    page_icon="S",
    layout="wide",
    initial_sidebar_state="expanded",
)

if "ui_mode" not in st.session_state:
    st.session_state["ui_mode"] = "dark"
inject_css(st.session_state["ui_mode"])


def _sidebar() -> None:
    with st.sidebar:
        theme_pick = sac.segmented(
            items=[sac.SegmentedItem(label="Dark"), sac.SegmentedItem(label="Light")],
            index=0 if st.session_state.get("ui_mode", "dark") == "dark" else 1,
            align="center",
            key="theme_pick",
        )
        next_mode = "dark" if theme_pick == "Dark" else "light"
        if next_mode != st.session_state.get("ui_mode"):
            st.session_state["ui_mode"] = next_mode
            st.rerun()

        st.markdown(
            """
            <div style='display:flex; gap:10px; align-items:center; padding:8px 4px 14px 4px; border-bottom:1px solid var(--hud-border); margin-bottom:10px;'>
              <div style='width:36px; height:36px; background:linear-gradient(135deg,var(--hud-cyan),var(--hud-amber)); border-radius:8px; display:flex; align-items:center; justify-content:center; color:var(--hud-text); font-weight:700;'>S</div>
              <div>
                <div style='font-weight:600; color:var(--hud-text); font-size:15px;'>Supplier Risk</div>
                <div style='font-size:11px; color:var(--hud-muted);'>Intelligence Console</div>
              </div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        st.markdown("<div style='margin-top:12px;'></div>", unsafe_allow_html=True)
        try:
            h = api_client.health()
            status_color = "#52c41a" if h.get("model_loaded") else "#faad14"
            status_text = "Online" if h.get("model_loaded") else "Degraded"
            n_active = h.get("n_active_suppliers", 0)
            st.markdown(
                f"""
                <div style='padding:10px 12px; background:var(--hud-panel-2); border-radius:8px; font-size:12px; border:1px solid var(--hud-border);'>
                    <div style='display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;'>
                        <span style='color:var(--hud-muted);'>API status</span>
                        <span style='display:inline-flex; align-items:center; gap:6px; color:var(--hud-text);'>
                            <span style='width:8px; height:8px; background:{status_color}; border-radius:50%;'></span> {status_text}
                        </span>
                    </div>
                    <div style='display:flex; justify-content:space-between; margin-bottom:4px;'>
                        <span style='color:var(--hud-muted);'>Suppliers</span>
                        <span style='color:var(--hud-text); font-weight:600;'>{n_active:,}</span>
                    </div>
                    <div style='font-size:10px; color:var(--hud-muted); word-break:break-all;'>{api_client.API_BASE}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )
        except Exception as e:
            sac.alert(label="Backend unreachable", description=f"Cannot reach {api_client.API_BASE}.\n{e}",
                      color="red", icon=True, banner=False)

        st.markdown(
            """
            <div style='margin-top:14px; padding:10px 12px; background:var(--hud-panel-2); border:1px solid var(--hud-border); border-radius:8px; font-size:11px; color:var(--hud-muted);'>
                Synthetic data &middot; demo build<br>
                Random Forest &middot; scikit-learn
            </div>
            """,
            unsafe_allow_html=True,
        )


def _tutorial_block() -> None:
    with st.expander("Quick Start Tutorial (Tap to open)", expanded=False):
        st.markdown(
            """
            **How to navigate**
            - Use the **Navigate** dropdown at the top to switch pages.
            - Use **Dark/Light** mode in the sidebar for readability.

            **What each page does**
            - **Overview**: Executive KPIs, risk distribution, performance trends.
            - **Suppliers**: Search, filter, and inspect each supplier with factor-level explanation.
            - **Analytics**: Category/country breakdowns, trends, scatter, correlations, data export.
            - **Score a supplier**: What-if simulator for new scenarios.
            - **Model insights**: Training quality, feature importance, confusion matrix, score percentiles.
            """
        )
        st.markdown(
            """
            **Metric glossary**
            - **Risk score (0-100)**: higher means more distress risk.
            - **Risk tiers**: Low `<25`, Moderate `25-50`, High `50-75`, Critical `>=75`.
            - **Distress probability**: model-estimated chance of distress (`0-1`).
            - **Fulfillment rate**: delivered quantity / ordered quantity.
            - **On-time delivery (OTD)**: deliveries meeting schedule / total deliveries.
            - **Defect rate**: defective units / total units.
            """
        )
        st.markdown(
            """
            **How model explanations are computed**
            - Top factors are ranked by contribution magnitude.
            - Contribution uses: `feature_importance * signed_deviation_from_mean`.
            - Positive contribution increases risk; negative decreases risk.
            """
        )
        st.markdown(
            """
            **How to demo quickly on mobile**
            1. Open **Overview** and call out KPI totals.
            2. Go to **Suppliers**, search by supplier ID, open one detail.
            3. Go to **Score a supplier**, run `At-risk` preset and show top factors.
            4. Go to **Model insights**, highlight ROC AUC and confusion matrix.
            """
        )


def main() -> None:
    page_header(
        "Supplier Risk Intelligence",
        "AI-powered financial-distress scoring for your supplier portfolio",
        emoji="S",
    )

    _sidebar()
    page_labels = ["Overview", "Suppliers", "Analytics", "Score a supplier", "Model insights"]
    default_page = st.session_state.get("page_selected", "Overview")
    nav_pick = st.selectbox(
        "Navigate",
        page_labels,
        index=page_labels.index(default_page) if default_page in page_labels else 0,
        key="top_nav_mobile_safe_select",
    )
    page = nav_pick
    st.session_state["page_selected"] = page
    _tutorial_block()

    try:
        if page == "Overview":
            overview.render()
        elif page == "Suppliers":
            suppliers.render()
        elif page == "Analytics":
            analytics.render()
        elif page == "Score a supplier":
            score_form.render()
        elif page == "Model insights":
            model_insights.render()
        else:
            overview.render()
    except api_client.ApiError as e:
        sac.alert(label="API request failed", description=str(e), color="red", icon=True)
    except Exception as e:  # noqa: BLE001
        sac.alert(
            label="Unexpected error",
            description="A rendering error occurred. Please refresh and retry.",
            color="red",
            icon=True,
        )
        st.caption(f"Error: {type(e).__name__}")


if __name__ == "__main__":
    main()
