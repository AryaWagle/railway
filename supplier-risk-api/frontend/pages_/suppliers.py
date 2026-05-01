"""Supplier directory: filterable, paginated table with drill-down."""
from __future__ import annotations

import pandas as pd
import plotly.graph_objects as go
import streamlit as st
import streamlit_antd_components as sac

from frontend import api_client
from frontend.theme import (
    ANTD_COLORS,
    TIER_COLORS,
    risk_badge_html,
    style_plotly,
)

PAGE_SIZE = 12
TIERS = ["All", "Low", "Moderate", "High", "Critical"]


@st.cache_data(ttl=300)
def _categories() -> list[str]:
    return ["All"] + api_client.categories()


@st.cache_data(ttl=300)
def _countries() -> list[str]:
    return ["All"] + api_client.countries()


def _fetch(filters: dict, page: int) -> dict:
    return api_client.list_suppliers(page=page, page_size=PAGE_SIZE, **filters)


def _detail(supplier_id: str) -> dict:
    return api_client.get_supplier(supplier_id)


def render() -> None:
    st.markdown("### Supplier directory")
    st.caption("Filter, sort, and inspect every active supplier. Risk scores are produced by the trained model.")

    with st.container():
        c1, c2, c3, c4, c5 = st.columns([1.2, 1.2, 1, 1.4, 1.2])
        with c1:
            cat = st.selectbox("Category", _categories(), index=0)
        with c2:
            country = st.selectbox("Country", _countries(), index=0)
        with c3:
            tier = st.selectbox("Risk tier", TIERS, index=0)
        with c4:
            score_range = st.slider("Risk score range", 0.0, 100.0, (0.0, 100.0), step=1.0)
        with c5:
            search = st.text_input("Search", placeholder="Name or supplier ID")

    filters = {
        "category": None if cat == "All" else cat,
        "country": None if country == "All" else country,
        "risk_tier": None if tier == "All" else tier,
        "min_score": score_range[0] if score_range[0] > 0 else None,
        "max_score": score_range[1] if score_range[1] < 100 else None,
        "search": search or None,
    }

    state_key = "suppliers_filters"
    if st.session_state.get(state_key) != filters:
        st.session_state[state_key] = filters
        st.session_state["suppliers_page"] = 1

    page = st.session_state.get("suppliers_page", 1)
    data = _fetch(filters, page)
    total = data["total"]
    items = data["items"]

    if total == 0:
        sac.alert(label="No suppliers match those filters", description="Try widening the score range or clearing the search.", color="blue", icon=True)
        return

    n_pages = max(1, (total + PAGE_SIZE - 1) // PAGE_SIZE)
    new_page = sac.pagination(total=total, page_size=PAGE_SIZE, align="center", index=page, jump=True, show_total=True, key="suppliers_pagination")
    if new_page != page:
        st.session_state["suppliers_page"] = int(new_page)
        st.rerun()

    df = pd.DataFrame(items)

    table_df = df.copy()
    table_df["fulfillment_rate"] = (table_df["fulfillment_rate"] * 100).round(1)
    table_df["on_time_delivery_rate"] = (table_df["on_time_delivery_rate"] * 100).round(1)
    table_df["defect_rate"] = (table_df["defect_rate"] * 100).round(2)
    table_df["risk_score"] = table_df["risk_score"].round(1)
    st.dataframe(
        table_df.rename(
            columns={
                "supplier_id": "ID",
                "name": "Name",
                "category": "Category",
                "country": "Country",
                "fulfillment_rate": "Fulfillment %",
                "on_time_delivery_rate": "OTD %",
                "defect_rate": "Defect %",
                "risk_score": "Risk Score",
                "risk_tier": "Tier",
            }
        )[
            ["ID", "Name", "Category", "Country", "Fulfillment %", "OTD %", "Defect %", "Risk Score", "Tier"]
        ],
        use_container_width=True,
        hide_index=True,
        height=410,
    )

    st.markdown(" ")
    st.markdown("#### Inspect a supplier")
    options = {f"{r['supplier_id']} — {r['name']} ({r['risk_tier']}, {r['risk_score']:.1f})": r["supplier_id"] for _, r in df.iterrows()}
    label = st.selectbox("Select a supplier from the current page", list(options.keys()))
    if label:
        _render_detail(_detail(options[label]))


def _render_detail(detail: dict) -> None:
    s = detail["supplier"]
    factors = detail["top_factors"]
    tier = s["risk_tier"]
    score = s["risk_score"]
    color = TIER_COLORS[tier]

    st.markdown(
        f"""
        <div class='supplier-header'>
            <div>
                <div class='name'>{s['name']}</div>
                <div class='meta'>{s['supplier_id']} &nbsp;·&nbsp; {s['category']} &nbsp;·&nbsp; {s['country']} &nbsp;·&nbsp; Tier {s['tier']} &nbsp;·&nbsp; Onboarded {s['onboarded_date']}</div>
            </div>
            <div style='text-align:right;'>
                <div class='score' style='color:{color};'>{score:.1f}</div>
                {risk_badge_html(tier)}
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    col1, col2 = st.columns([1.1, 1])
    with col1:
        st.markdown('<div class="section-card"><h3>Top risk factors</h3>', unsafe_allow_html=True)
        if factors:
            f_df = pd.DataFrame(factors).sort_values("contribution")
            colors = [ANTD_COLORS["danger"] if c > 0 else ANTD_COLORS["success"] for c in f_df["contribution"]]
            fig = go.Figure(go.Bar(
                x=f_df["contribution"],
                y=f_df["label"],
                orientation="h",
                marker_color=colors,
                text=[f"{c:+.3f}" for c in f_df["contribution"]],
                textposition="outside",
            ))
            fig.update_xaxes(title="Contribution to risk")
            st.plotly_chart(style_plotly(fig, height=380), use_container_width=True, config={"displayModeBar": False})
        st.markdown("</div>", unsafe_allow_html=True)

    with col2:
        st.markdown('<div class="section-card"><h3>Operational profile</h3>', unsafe_allow_html=True)
        radar_categories = ["Fulfillment", "On-time", "Quality audit", "Renewal", "Cash runway", "Credit", "Defect (inv)", "Complaints (inv)"]
        radar_values = [
            min(s["fulfillment_rate"] * 100, 100),
            min(s["on_time_delivery_rate"] * 100, 100),
            min(s["quality_audit_score"], 100),
            min(s["contract_renewal_rate"] * 100, 100),
            min(s["cash_runway_months"] / 24 * 100, 100),
            min((s["credit_score"] - 300) / 5.5, 100),
            max(0.0, 100 - s["defect_rate"] * 1000),
            max(0.0, 100 - s["complaints_last_90d"] * 5),
        ]
        radar = go.Figure(go.Scatterpolar(
            r=radar_values + [radar_values[0]],
            theta=radar_categories + [radar_categories[0]],
            fill="toself",
            line=dict(color=color, width=2),
            fillcolor=f"rgba({_hex_to_rgb(color)},0.18)",
            name=s["name"],
        ))
        radar.update_layout(polar=dict(radialaxis=dict(range=[0, 100], showticklabels=False, gridcolor="#f0f0f0")))
        st.plotly_chart(style_plotly(radar, height=380), use_container_width=True, config={"displayModeBar": False})
        st.markdown("</div>", unsafe_allow_html=True)

    st.markdown('<div class="section-card"><h3>Detailed metrics</h3>', unsafe_allow_html=True)
    st.markdown(
        f"""
        <div style='display:grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap:10px;'>
          {_metric_pill("Order volume / month", f"{s['order_volume_monthly']:,}")}
          {_metric_pill("Fulfillment rate", f"{s['fulfillment_rate']*100:.1f}%")}
          {_metric_pill("On-time delivery", f"{s['on_time_delivery_rate']*100:.1f}%")}
          {_metric_pill("Avg delivery delay", f"{s['avg_delivery_delay_days']:.1f}d")}
          {_metric_pill("Defect rate", f"{s['defect_rate']*100:.2f}%")}
          {_metric_pill("Return rate", f"{s['return_rate']*100:.2f}%")}
          {_metric_pill("Payment delay", f"{s['payment_delay_days']:.1f}d")}
          {_metric_pill("Credit score", f"{s['credit_score']}")}
          {_metric_pill("Debt / equity", f"{s['debt_to_equity']:.2f}")}
          {_metric_pill("Current ratio", f"{s['current_ratio']:.2f}")}
          {_metric_pill("Revenue growth", f"{s['revenue_growth_pct']:+.1f}%")}
          {_metric_pill("Cash runway", f"{s['cash_runway_months']:.1f}mo")}
          {_metric_pill("Complaints (90d)", f"{s['complaints_last_90d']}")}
          {_metric_pill("Renewal rate", f"{s['contract_renewal_rate']*100:.1f}%")}
          {_metric_pill("Quality audit", f"{s['quality_audit_score']:.1f}")}
          {_metric_pill("Years in business", f"{s['years_in_business']:.1f}")}
        </div>
        """,
        unsafe_allow_html=True,
    )
    st.markdown("</div>", unsafe_allow_html=True)


def _metric_pill(label: str, value: str) -> str:
    return (
        f"<div style='border:1px solid var(--hud-border); border-radius:8px; padding:10px 12px; background:var(--hud-panel-2);'>"
        f"<div style='font-size:11px; color:var(--hud-muted); text-transform:uppercase; letter-spacing:0.4px;'>{label}</div>"
        f"<div style='font-size:16px; font-weight:600; color:var(--hud-text); margin-top:2px;'>{value}</div>"
        f"</div>"
    )


def _hex_to_rgb(hex_str: str) -> str:
    h = hex_str.lstrip("#")
    return f"{int(h[0:2],16)},{int(h[2:4],16)},{int(h[4:6],16)}"
