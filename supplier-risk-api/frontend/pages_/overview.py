"""Overview / executive dashboard page."""
from __future__ import annotations

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st
import streamlit_antd_components as sac

from frontend import api_client
from frontend.theme import (
    ANTD_COLORS,
    TIER_COLORS,
    gauge,
    kpi_card,
    kpi_grid,
    risk_badge_html,
    style_plotly,
)


@st.cache_data(ttl=60)
def _load() -> tuple[pd.DataFrame, list[dict]]:
    suppliers = api_client.list_all_suppliers()
    snaps = api_client.snapshots()
    return pd.DataFrame(suppliers), snaps


def render() -> None:
    df, snaps = _load()
    st.caption(
        "Executive homepage with portfolio KPIs, risk distribution, and trend monitoring. Use filters to interactively scope the view."
    )

    f1, f2, f3 = st.columns([1.1, 1.1, 1])
    with f1:
        selected_categories = st.multiselect(
            "Category filter",
            options=sorted(df["category"].dropna().unique().tolist()),
            default=[],
        )
    with f2:
        selected_countries = st.multiselect(
            "Country filter",
            options=sorted(df["country"].dropna().unique().tolist()),
            default=[],
        )
    with f3:
        selected_tiers = st.multiselect(
            "Risk tier filter",
            options=["Low", "Moderate", "High", "Critical"],
            default=[],
        )

    if selected_categories:
        df = df[df["category"].isin(selected_categories)]
    if selected_countries:
        df = df[df["country"].isin(selected_countries)]
    if selected_tiers:
        df = df[df["risk_tier"].isin(selected_tiers)]

    if df.empty:
        st.warning("No suppliers match current filters. Adjust filters to populate the dashboard.")
        return

    snaps_df = pd.DataFrame(snaps)
    if not snaps_df.empty:
        snaps_df["month"] = pd.to_datetime(snaps_df["month"])
        if selected_categories:
            snaps_df = snaps_df[snaps_df["category"].isin(selected_categories)]

    n_total = len(df)
    n_critical = int((df["risk_tier"] == "Critical").sum())
    avg_risk = float(df["risk_score"].mean())
    avg_fulfillment = float(df["fulfillment_rate"].mean())
    avg_otd = float(df["on_time_delivery_rate"].mean())
    avg_defect = float(df["defect_rate"].mean())

    kpi_grid([
        kpi_card("Active suppliers", f"{n_total:,}", suffix="", delta=f"{n_total} tracked", delta_dir="flat", accent=ANTD_COLORS["primary"]),
        kpi_card("Critical risk", f"{n_critical}", suffix=f" / {n_total}", delta=f"{n_critical/n_total*100:.1f}% of base", delta_dir=("up" if n_critical > 10 else "flat"), accent=ANTD_COLORS["danger"]),
        kpi_card("Average risk score", f"{avg_risk:.1f}", suffix=" / 100", delta="Lower is better", delta_dir="flat", accent=ANTD_COLORS["warning"]),
        kpi_card("Avg fulfillment rate", f"{avg_fulfillment*100:.1f}", suffix="%", delta="Target ≥ 95%", delta_dir=("up" if avg_fulfillment > 0.95 else "down"), accent=ANTD_COLORS["success"]),
        kpi_card("Avg on-time delivery", f"{avg_otd*100:.1f}", suffix="%", delta="Target ≥ 95%", delta_dir=("up" if avg_otd > 0.95 else "down"), accent=ANTD_COLORS["info"]),
        kpi_card("Avg defect rate", f"{avg_defect*100:.2f}", suffix="%", delta="Target < 1%", delta_dir=("down" if avg_defect < 0.01 else "up"), accent=ANTD_COLORS["purple"]),
    ])

    top_critical = df.sort_values("risk_score", ascending=False).head(5)
    if not top_critical.empty:
        names = ", ".join(f"{r['name']} ({r['risk_score']:.0f})" for _, r in top_critical.iterrows())
        sac.alert(
            label="Top risk alerts",
            description=f"{n_critical} suppliers in Critical tier. Highest scores: {names}.",
            color="red" if n_critical else "blue",
            icon=True,
            banner=True,
            closable=False,
        )

    col1, col2 = st.columns([1.1, 1])
    with col1:
        st.markdown('<div class="section-card"><h3>Risk tier distribution</h3>', unsafe_allow_html=True)
        tier_counts = df["risk_tier"].value_counts().reindex(["Low", "Moderate", "High", "Critical"]).fillna(0).astype(int)
        donut = go.Figure(go.Pie(
            labels=tier_counts.index.tolist(),
            values=tier_counts.values.tolist(),
            hole=0.62,
            marker=dict(colors=[TIER_COLORS[t] for t in tier_counts.index]),
            textinfo="label+percent",
            textposition="outside",
            sort=False,
        ))
        donut.update_layout(showlegend=True, legend=dict(orientation="h", y=-0.05), legend_title_text="")
        donut.add_annotation(text=f"<b>{n_total}</b><br>suppliers", x=0.5, y=0.5, showarrow=False, font=dict(size=18))
        st.plotly_chart(style_plotly(donut, height=320), use_container_width=True, config={"displayModeBar": False})
        st.markdown("</div>", unsafe_allow_html=True)

    with col2:
        st.markdown('<div class="section-card"><h3>Risk score distribution</h3>', unsafe_allow_html=True)
        hist = px.histogram(df, x="risk_score", nbins=24, color_discrete_sequence=[ANTD_COLORS["primary"]])
        hist.update_traces(name="Risk score", showlegend=False)
        hist.add_vline(x=25, line_dash="dot", line_color=ANTD_COLORS["success"])
        hist.add_vline(x=50, line_dash="dot", line_color=ANTD_COLORS["primary"])
        hist.add_vline(x=75, line_dash="dot", line_color=ANTD_COLORS["danger"])
        hist.update_xaxes(title="Risk score", range=[0, 100])
        hist.update_yaxes(title="Suppliers")
        hist.update_layout(showlegend=False, legend_title_text="")
        st.plotly_chart(style_plotly(hist, height=320), use_container_width=True, config={"displayModeBar": False})
        st.markdown("</div>", unsafe_allow_html=True)

    col3, col4 = st.columns(2)
    with col3:
        st.markdown('<div class="section-card"><h3>Fulfillment vs target by category</h3>', unsafe_allow_html=True)
        cat_perf = df.groupby("category").agg(
            fulfillment_rate=("fulfillment_rate", "mean"),
            on_time_delivery_rate=("on_time_delivery_rate", "mean"),
            avg_risk=("risk_score", "mean"),
        ).reset_index()
        bar = go.Figure()
        bar.add_bar(name="Fulfillment", x=cat_perf["category"], y=(cat_perf["fulfillment_rate"] * 100).round(2), marker_color=ANTD_COLORS["primary"])
        bar.add_bar(name="On-time delivery", x=cat_perf["category"], y=(cat_perf["on_time_delivery_rate"] * 100).round(2), marker_color=ANTD_COLORS["success"])
        bar.add_shape(type="line", x0=-0.5, x1=len(cat_perf) - 0.5, y0=95, y1=95,
                      line=dict(color=ANTD_COLORS["danger"], width=2, dash="dot"))
        bar.add_annotation(x=len(cat_perf) - 1, y=95, text="Target 95%", showarrow=False, yshift=10, font=dict(size=10, color=ANTD_COLORS["danger"]))
        bar.update_layout(barmode="group", yaxis=dict(range=[80, 100], title="%"), legend_title_text="")
        st.plotly_chart(style_plotly(bar, height=340), use_container_width=True, config={"displayModeBar": False})
        st.markdown("</div>", unsafe_allow_html=True)

    with col4:
        st.markdown('<div class="section-card"><h3>Portfolio-wide health</h3>', unsafe_allow_html=True)
        c1, c2 = st.columns(2)
        with c1:
            st.plotly_chart(gauge(avg_risk, title="Avg risk score"), use_container_width=True, config={"displayModeBar": False})
        with c2:
            st.plotly_chart(gauge(avg_fulfillment * 100, title="Fulfillment %"), use_container_width=True, config={"displayModeBar": False})
        st.markdown(
            f"""
            <div style='display:flex; gap:10px; flex-wrap:wrap; margin-top:6px;'>
              <span class='risk-badge risk-low'><span class='dot'></span>Low {int((df['risk_tier']=='Low').sum())}</span>
              <span class='risk-badge risk-moderate'><span class='dot'></span>Moderate {int((df['risk_tier']=='Moderate').sum())}</span>
              <span class='risk-badge risk-high'><span class='dot'></span>High {int((df['risk_tier']=='High').sum())}</span>
              <span class='risk-badge risk-critical'><span class='dot'></span>Critical {int((df['risk_tier']=='Critical').sum())}</span>
            </div>
            """,
            unsafe_allow_html=True,
        )
        st.markdown("</div>", unsafe_allow_html=True)

    if not snaps_df.empty:
        st.markdown('<div class="section-card"><h3>24-month fulfillment & risk trend</h3>', unsafe_allow_html=True)
        monthly = snaps_df.groupby("month").agg(fulfillment_rate=("fulfillment_rate", "mean"), avg_risk_score=("avg_risk_score", "mean")).reset_index()
        trend = go.Figure()
        trend.add_scatter(x=monthly["month"], y=(monthly["fulfillment_rate"] * 100).round(2),
                          mode="lines+markers", name="Fulfillment %", line=dict(color=ANTD_COLORS["primary"], width=3),
                          marker=dict(size=6))
        trend.add_scatter(x=monthly["month"], y=monthly["avg_risk_score"].round(2),
                          mode="lines+markers", name="Avg risk score",
                          line=dict(color=ANTD_COLORS["warning"], width=3, dash="dot"),
                          marker=dict(size=6), yaxis="y2")
        trend.update_layout(
            yaxis=dict(title="Fulfillment %", range=[80, 100]),
            yaxis2=dict(title="Risk score", overlaying="y", side="right", range=[0, 70]),
            legend=dict(orientation="h", y=-0.15),
            legend_title_text="",
        )
        st.plotly_chart(style_plotly(trend, height=320), use_container_width=True, config={"displayModeBar": False})
        st.markdown("</div>", unsafe_allow_html=True)

    st.markdown('<div class="section-card"><h3>Top 10 risk-flagged suppliers</h3>', unsafe_allow_html=True)
    top10 = df.sort_values("risk_score", ascending=False).head(10)[
        ["supplier_id", "name", "category", "country", "fulfillment_rate", "on_time_delivery_rate", "defect_rate", "risk_score", "risk_tier"]
    ].copy()
    top10["fulfillment_rate"] = (top10["fulfillment_rate"] * 100).round(1)
    top10["on_time_delivery_rate"] = (top10["on_time_delivery_rate"] * 100).round(1)
    top10["defect_rate"] = (top10["defect_rate"] * 100).round(2)

    st.dataframe(
        top10.rename(
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
        ),
        use_container_width=True,
        hide_index=True,
        height=390,
    )
    st.download_button(
        "Export top-10 risk suppliers CSV",
        data=top10.to_csv(index=False).encode("utf-8"),
        file_name="top10_risk_suppliers.csv",
        mime="text/csv",
        use_container_width=True,
    )
    st.markdown("</div>", unsafe_allow_html=True)
