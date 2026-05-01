"""Analytics page: cross-sectional and time-series risk analytics."""
from __future__ import annotations

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from frontend import api_client
from frontend.theme import (
    ANTD_COLORS,
    CATEGORICAL_PALETTE,
    TIER_COLORS,
    style_plotly,
)


@st.cache_data(ttl=60)
def _load() -> tuple[pd.DataFrame, pd.DataFrame]:
    items = api_client.list_all_suppliers()
    df = pd.DataFrame(items)
    snaps = pd.DataFrame(api_client.snapshots())
    if not snaps.empty:
        snaps["month"] = pd.to_datetime(snaps["month"])
    return df, snaps


def render() -> None:
    df, snaps = _load()
    st.caption(
        "Interactive analytics view inspired by executive BI dashboards: apply filters, export data, and download chart images."
    )

    c1, c2, c3 = st.columns([1.1, 1.1, 0.8])
    with c1:
        selected_categories = st.multiselect(
            "Category filter",
            options=sorted(df["category"].dropna().unique().tolist()),
            default=[],
            help="Select one or more categories to scope all analytics.",
        )
    with c2:
        selected_countries = st.multiselect(
            "Country filter",
            options=sorted(df["country"].dropna().unique().tolist()),
            default=[],
            help="Select one or more countries to scope all analytics.",
        )
    with c3:
        show_top_n_countries = st.slider("Top countries", min_value=5, max_value=20, value=10, step=1)

    if selected_categories:
        df = df[df["category"].isin(selected_categories)]
    if selected_countries:
        df = df[df["country"].isin(selected_countries)]

    if df.empty:
        st.warning("No suppliers match the selected filters. Adjust filters to continue.")
        return

    tab_exec, tab_trends, tab_quality, tab_data = st.tabs(
        ["Executive", "Trends", "Quality & Correlations", "Data Export"]
    )

    with tab_exec:
        col1, col2 = st.columns(2)
        with col1:
            st.markdown('<div class="section-card"><h3>Average risk score by category</h3>', unsafe_allow_html=True)
            cat = (
                df.groupby("category")
                .agg(avg_risk=("risk_score", "mean"), n=("supplier_id", "count"))
                .reset_index()
                .sort_values("avg_risk", ascending=True)
            )
            fig = go.Figure(
                go.Bar(
                    x=cat["avg_risk"],
                    y=cat["category"],
                    orientation="h",
                    text=[f"{v:.1f} ({n})" for v, n in zip(cat["avg_risk"], cat["n"])],
                    textposition="outside",
                    marker_color=[_score_color(v) for v in cat["avg_risk"]],
                )
            )
            fig.update_xaxes(title="Avg risk score", range=[0, max(cat["avg_risk"]) * 1.3])
            st.plotly_chart(
                style_plotly(fig, height=360),
                use_container_width=True,
                config={"displayModeBar": True, "toImageButtonOptions": {"format": "png", "filename": "avg_risk_by_category"}},
            )
            st.download_button(
                "Export category risk CSV",
                data=cat.to_csv(index=False).encode("utf-8"),
                file_name="avg_risk_by_category.csv",
                mime="text/csv",
                use_container_width=True,
            )
            st.markdown("</div>", unsafe_allow_html=True)

        with col2:
            st.markdown(
                f'<div class="section-card"><h3>Risk by country (top {show_top_n_countries})</h3>',
                unsafe_allow_html=True,
            )
            ctry = (
                df.groupby("country")
                .agg(avg_risk=("risk_score", "mean"), n=("supplier_id", "count"))
                .reset_index()
                .sort_values("avg_risk", ascending=False)
                .head(show_top_n_countries)
            )
            fig = go.Figure(
                go.Bar(
                    x=ctry["country"],
                    y=ctry["avg_risk"],
                    marker_color=[_score_color(v) for v in ctry["avg_risk"]],
                    text=[f"{v:.1f}" for v in ctry["avg_risk"]],
                    textposition="outside",
                )
            )
            fig.update_yaxes(title="Avg risk score")
            st.plotly_chart(
                style_plotly(fig, height=360),
                use_container_width=True,
                config={"displayModeBar": True, "toImageButtonOptions": {"format": "png", "filename": "risk_by_country"}},
            )
            st.download_button(
                "Export country risk CSV",
                data=ctry.to_csv(index=False).encode("utf-8"),
                file_name="risk_by_country.csv",
                mime="text/csv",
                use_container_width=True,
            )
            st.markdown("</div>", unsafe_allow_html=True)

    with tab_trends:
        if snaps.empty:
            st.info("No monthly snapshot data available.")
        else:
            if selected_categories:
                snaps = snaps[snaps["category"].isin(selected_categories)]

            col3, col4 = st.columns(2)
            with col3:
                st.markdown('<div class="section-card"><h3>Monthly fulfillment by category</h3>', unsafe_allow_html=True)
                line = px.line(
                    snaps,
                    x="month",
                    y="fulfillment_rate",
                    color="category",
                    color_discrete_sequence=CATEGORICAL_PALETTE,
                    labels={"fulfillment_rate": "Fulfillment rate", "month": "Month"},
                )
                line.update_yaxes(tickformat=".0%", range=[0.85, 1.0])
                st.plotly_chart(
                    style_plotly(line, height=360),
                    use_container_width=True,
                    config={"displayModeBar": True, "toImageButtonOptions": {"format": "png", "filename": "monthly_fulfillment"}},
                )
                st.markdown("</div>", unsafe_allow_html=True)

            with col4:
                st.markdown('<div class="section-card"><h3>Monthly avg risk by category</h3>', unsafe_allow_html=True)
                line2 = px.line(
                    snaps,
                    x="month",
                    y="avg_risk_score",
                    color="category",
                    color_discrete_sequence=CATEGORICAL_PALETTE,
                    labels={"avg_risk_score": "Avg risk score", "month": "Month"},
                )
                st.plotly_chart(
                    style_plotly(line2, height=360),
                    use_container_width=True,
                    config={"displayModeBar": True, "toImageButtonOptions": {"format": "png", "filename": "monthly_avg_risk"}},
                )
                st.markdown("</div>", unsafe_allow_html=True)

    with tab_quality:
        st.markdown('<div class="section-card"><h3>Defect rate vs on-time delivery</h3>', unsafe_allow_html=True)
        scatter = px.scatter(
            df,
            x="on_time_delivery_rate",
            y="defect_rate",
            size="order_volume_monthly",
            color="risk_tier",
            color_discrete_map=TIER_COLORS,
            hover_data=["name", "category", "country", "risk_score"],
            labels={"on_time_delivery_rate": "On-time delivery rate", "defect_rate": "Defect rate"},
            size_max=32,
            opacity=0.78,
            category_orders={"risk_tier": ["Low", "Moderate", "High", "Critical"]},
        )
        scatter.update_layout(legend=dict(orientation="h", y=-0.18))
        st.plotly_chart(
            style_plotly(scatter, height=420),
            use_container_width=True,
            config={"displayModeBar": True, "toImageButtonOptions": {"format": "png", "filename": "quality_scatter"}},
        )
        st.markdown("</div>", unsafe_allow_html=True)

        st.markdown('<div class="section-card"><h3>Feature correlation heatmap</h3>', unsafe_allow_html=True)
        feature_cols = [
            "on_time_delivery_rate",
            "avg_delivery_delay_days",
            "defect_rate",
            "fulfillment_rate",
            "return_rate",
            "payment_delay_days",
            "credit_score",
            "debt_to_equity",
            "current_ratio",
            "revenue_growth_pct",
            "cash_runway_months",
            "complaints_last_90d",
            "contract_renewal_rate",
            "quality_audit_score",
            "risk_score",
        ]
        corr = df[feature_cols].corr().round(2)
        heat = go.Figure(
            go.Heatmap(
                z=corr.values,
                x=corr.columns,
                y=corr.columns,
                colorscale=[[0, ANTD_COLORS["danger"]], [0.5, "#ffffff"], [1.0, ANTD_COLORS["primary"]]],
                zmid=0,
                zmin=-1,
                zmax=1,
                text=corr.values,
                texttemplate="%{text}",
                textfont=dict(size=9),
            )
        )
        heat.update_xaxes(tickangle=-35)
        st.plotly_chart(
            style_plotly(heat, height=520),
            use_container_width=True,
            config={"displayModeBar": True, "toImageButtonOptions": {"format": "png", "filename": "feature_correlations"}},
        )
        st.markdown("</div>", unsafe_allow_html=True)

        st.markdown('<div class="section-card"><h3>Risk distribution by tier (boxplot of fulfillment)</h3>', unsafe_allow_html=True)
        box = px.box(
            df,
            x="risk_tier",
            y="fulfillment_rate",
            color="risk_tier",
            color_discrete_map=TIER_COLORS,
            points="outliers",
            category_orders={"risk_tier": ["Low", "Moderate", "High", "Critical"]},
        )
        box.update_yaxes(tickformat=".0%", title="Fulfillment rate")
        box.update_layout(showlegend=False)
        st.plotly_chart(
            style_plotly(box, height=360),
            use_container_width=True,
            config={"displayModeBar": True, "toImageButtonOptions": {"format": "png", "filename": "fulfillment_by_tier"}},
        )
        st.markdown("</div>", unsafe_allow_html=True)

    with tab_data:
        st.markdown('<div class="section-card"><h3>Live supplier dataset (filtered)</h3>', unsafe_allow_html=True)
        export_cols = [
            "supplier_id",
            "name",
            "category",
            "country",
            "risk_score",
            "risk_tier",
            "fulfillment_rate",
            "on_time_delivery_rate",
            "defect_rate",
            "order_volume_monthly",
        ]
        export_df = df[export_cols].copy()
        st.dataframe(export_df, use_container_width=True, hide_index=True, height=380)
        st.download_button(
            "Export filtered suppliers CSV",
            data=export_df.to_csv(index=False).encode("utf-8"),
            file_name="filtered_suppliers.csv",
            mime="text/csv",
            use_container_width=True,
        )
        st.markdown("</div>", unsafe_allow_html=True)


def _score_color(value: float) -> str:
    if value < 25: return ANTD_COLORS["success"]
    if value < 50: return ANTD_COLORS["primary"]
    if value < 75: return ANTD_COLORS["warning"]
    return ANTD_COLORS["danger"]
