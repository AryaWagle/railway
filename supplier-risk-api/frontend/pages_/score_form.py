"""'Score a Supplier' page: a what-if form that calls /score."""
from __future__ import annotations

import pandas as pd
import plotly.graph_objects as go
import streamlit as st
import streamlit_antd_components as sac

from frontend import api_client
from frontend.theme import (
    ANTD_COLORS,
    TIER_COLORS,
    gauge,
    risk_badge_html,
    style_plotly,
)


@st.cache_data(ttl=300)
def _categories() -> list[str]:
    return api_client.categories()


PRESETS = {
    "Healthy supplier": {
        "years_in_business": 14, "tier": 1, "on_time_delivery_rate": 0.98,
        "avg_delivery_delay_days": 0.5, "defect_rate": 0.005, "order_volume_monthly": 8000,
        "fulfillment_rate": 0.98, "return_rate": 0.01, "payment_delay_days": 2.0,
        "credit_score": 780, "debt_to_equity": 0.4, "current_ratio": 2.6,
        "revenue_growth_pct": 18.0, "cash_runway_months": 16.0, "complaints_last_90d": 0,
        "contract_renewal_rate": 0.95, "quality_audit_score": 96.0,
    },
    "Average supplier": {
        "years_in_business": 8, "tier": 2, "on_time_delivery_rate": 0.92,
        "avg_delivery_delay_days": 2.5, "defect_rate": 0.02, "order_volume_monthly": 3500,
        "fulfillment_rate": 0.94, "return_rate": 0.03, "payment_delay_days": 7.0,
        "credit_score": 700, "debt_to_equity": 1.0, "current_ratio": 1.6,
        "revenue_growth_pct": 5.0, "cash_runway_months": 8.0, "complaints_last_90d": 2,
        "contract_renewal_rate": 0.85, "quality_audit_score": 84.0,
    },
    "At-risk supplier": {
        "years_in_business": 3, "tier": 3, "on_time_delivery_rate": 0.74,
        "avg_delivery_delay_days": 9.0, "defect_rate": 0.08, "order_volume_monthly": 800,
        "fulfillment_rate": 0.82, "return_rate": 0.09, "payment_delay_days": 28.0,
        "credit_score": 540, "debt_to_equity": 3.5, "current_ratio": 0.8,
        "revenue_growth_pct": -8.0, "cash_runway_months": 2.5, "complaints_last_90d": 14,
        "contract_renewal_rate": 0.55, "quality_audit_score": 58.0,
    },
}


def render() -> None:
    st.markdown("### Score a supplier (what-if)")
    st.caption("Adjust the metrics below and submit to call the live `/score` endpoint. "
               "The model returns a 0–100 risk score, tier, and the top contributing factors.")

    preset = sac.segmented(
        items=[sac.SegmentedItem(label=name) for name in ["Healthy supplier", "Average supplier", "At-risk supplier", "Custom"]],
        align="center",
        index=1,
        key="score_preset",
    )
    if preset != "Custom" and preset in PRESETS:
        if st.session_state.get("score_form_preset") != preset:
            for k, v in PRESETS[preset].items():
                st.session_state[f"sf_{k}"] = v
            st.session_state["score_form_preset"] = preset

    with st.form("score_form"):
        st.markdown("##### Operational")
        c1, c2, c3 = st.columns(3)
        with c1:
            on_time_delivery_rate = st.slider("On-time delivery rate", 0.0, 1.0, st.session_state.get("sf_on_time_delivery_rate", 0.92), 0.01, key="sf_on_time_delivery_rate")
            avg_delivery_delay_days = st.slider("Avg delivery delay (days)", 0.0, 30.0, st.session_state.get("sf_avg_delivery_delay_days", 2.5), 0.5, key="sf_avg_delivery_delay_days")
            fulfillment_rate = st.slider("Fulfillment rate", 0.3, 1.0, st.session_state.get("sf_fulfillment_rate", 0.94), 0.01, key="sf_fulfillment_rate")
        with c2:
            defect_rate = st.slider("Defect rate", 0.0, 0.3, st.session_state.get("sf_defect_rate", 0.02), 0.005, key="sf_defect_rate")
            return_rate = st.slider("Return rate", 0.0, 0.3, st.session_state.get("sf_return_rate", 0.03), 0.005, key="sf_return_rate")
            order_volume_monthly = st.number_input("Monthly order volume", 0, 1_000_000, st.session_state.get("sf_order_volume_monthly", 3500), 100, key="sf_order_volume_monthly")
        with c3:
            tier = st.selectbox("Supplier tier", [1, 2, 3], index=[1, 2, 3].index(st.session_state.get("sf_tier", 2)), key="sf_tier")
            years_in_business = st.slider("Years in business", 1, 60, st.session_state.get("sf_years_in_business", 8), 1, key="sf_years_in_business")
            quality_audit_score = st.slider("Quality audit score", 0.0, 100.0, st.session_state.get("sf_quality_audit_score", 84.0), 1.0, key="sf_quality_audit_score")

        st.markdown("##### Financial")
        c4, c5, c6 = st.columns(3)
        with c4:
            credit_score = st.slider("Credit score", 300, 850, st.session_state.get("sf_credit_score", 700), 5, key="sf_credit_score")
            payment_delay_days = st.slider("Payment delay (days)", 0.0, 90.0, st.session_state.get("sf_payment_delay_days", 7.0), 1.0, key="sf_payment_delay_days")
        with c5:
            debt_to_equity = st.slider("Debt-to-equity", 0.05, 6.0, st.session_state.get("sf_debt_to_equity", 1.0), 0.05, key="sf_debt_to_equity")
            current_ratio = st.slider("Current ratio", 0.2, 5.0, st.session_state.get("sf_current_ratio", 1.6), 0.05, key="sf_current_ratio")
        with c6:
            revenue_growth_pct = st.slider("Revenue growth %", -40.0, 60.0, st.session_state.get("sf_revenue_growth_pct", 5.0), 1.0, key="sf_revenue_growth_pct")
            cash_runway_months = st.slider("Cash runway (months)", 0.5, 36.0, st.session_state.get("sf_cash_runway_months", 8.0), 0.5, key="sf_cash_runway_months")

        st.markdown("##### Engagement")
        c7, c8 = st.columns(2)
        with c7:
            complaints_last_90d = st.slider("Complaints (last 90d)", 0, 50, st.session_state.get("sf_complaints_last_90d", 2), 1, key="sf_complaints_last_90d")
        with c8:
            contract_renewal_rate = st.slider("Contract renewal rate", 0.0, 1.0, st.session_state.get("sf_contract_renewal_rate", 0.85), 0.01, key="sf_contract_renewal_rate")

        submitted = st.form_submit_button("Calculate risk score", type="primary", use_container_width=False)

    if not submitted:
        return

    payload = {
        "years_in_business": float(years_in_business),
        "tier": int(tier),
        "on_time_delivery_rate": float(on_time_delivery_rate),
        "avg_delivery_delay_days": float(avg_delivery_delay_days),
        "defect_rate": float(defect_rate),
        "order_volume_monthly": int(order_volume_monthly),
        "fulfillment_rate": float(fulfillment_rate),
        "return_rate": float(return_rate),
        "payment_delay_days": float(payment_delay_days),
        "credit_score": int(credit_score),
        "debt_to_equity": float(debt_to_equity),
        "current_ratio": float(current_ratio),
        "revenue_growth_pct": float(revenue_growth_pct),
        "cash_runway_months": float(cash_runway_months),
        "complaints_last_90d": int(complaints_last_90d),
        "contract_renewal_rate": float(contract_renewal_rate),
        "quality_audit_score": float(quality_audit_score),
    }

    try:
        result = api_client.score(payload)
    except api_client.ApiError as e:
        sac.alert(label="Scoring failed", description=str(e), color="red", icon=True)
        return

    score = result["risk_score"]
    tier_label = result["risk_tier"]
    tier_color = TIER_COLORS[tier_label]

    sac.result(
        label=f"Risk score: {score:.1f}/100 — {tier_label}",
        description=f"Distress probability {result['distress_probability']*100:.1f}%. Model trained at {result['model_version'][:19]} UTC.",
        status={"Low": "success", "Moderate": "info", "High": "warning", "Critical": "error"}.get(tier_label, "info"),
    )

    col_a, col_b = st.columns([1, 1.3])
    with col_a:
        st.plotly_chart(gauge(score, title="Predicted risk score", height=320), use_container_width=True, config={"displayModeBar": False})
        st.markdown(f"<div style='text-align:center;'>{risk_badge_html(tier_label)}</div>", unsafe_allow_html=True)

    with col_b:
        st.markdown('<div class="section-card"><h3>Top contributing factors</h3>', unsafe_allow_html=True)
        f_df = pd.DataFrame(result["top_factors"])
        if not f_df.empty:
            f_df = f_df.sort_values("contribution")
            colors = [ANTD_COLORS["danger"] if c > 0 else ANTD_COLORS["success"] for c in f_df["contribution"]]
            fig = go.Figure(go.Bar(
                x=f_df["contribution"], y=f_df["label"], orientation="h",
                marker_color=colors,
                text=[f"{c:+.3f}" for c in f_df["contribution"]],
                textposition="outside",
                hovertemplate="%{y}<br>Value: %{customdata[0]}<br>Benchmark: %{customdata[1]}<extra></extra>",
                customdata=list(zip(f_df["value"], f_df["benchmark"])),
            ))
            fig.update_xaxes(title="Contribution to risk")
            st.plotly_chart(style_plotly(fig, height=320), use_container_width=True, config={"displayModeBar": False})

            tag_html = "".join(
                f"<span class='risk-badge risk-{'critical' if r['direction']=='increases_risk' else 'low'}' style='margin:3px;'>"
                f"<span class='dot'></span>{r['label']}: {r['value']}</span>"
                for _, r in f_df.iterrows()
            )
            st.markdown(f"<div>{tag_html}</div>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)

    with st.expander("Show raw API response"):
        st.json(result)
