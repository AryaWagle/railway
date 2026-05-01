"""Theme + reusable HTML/Plotly snippets for an Ant Design look."""
from __future__ import annotations

from pathlib import Path

import plotly.graph_objects as go
import streamlit as st

ASSETS_DIR = Path(__file__).resolve().parent / "assets"
STYLE_PATH = ASSETS_DIR / "style.css"

ANTD_COLORS = {
    "primary": "#00e5ff",
    "success": "#7cff9b",
    "warning": "#ffb020",
    "danger": "#ff4d4f",
    "info": "#66f3ff",
    "purple": "#8f73ff",
    "geekblue": "#2d6dff",
    "magenta": "#f15bfe",
    "cyan": "#00b7cc",
    "lime": "#a0d911",
    "gold": "#ffb020",
    "volcano": "#ff7c4d",
    "text": "#e8f5ff",
    "text_secondary": "#9eb6c8",
    "bg": "#0a0f16",
    "card": "#101826",
}

TIER_COLORS = {
    "Low": ANTD_COLORS["success"],
    "Moderate": ANTD_COLORS["primary"],
    "High": ANTD_COLORS["warning"],
    "Critical": ANTD_COLORS["danger"],
}

CATEGORICAL_PALETTE = [
    "#00e5ff", "#7cff9b", "#ffb020", "#8f73ff", "#66f3ff",
    "#2d6dff", "#ff7c4d", "#f15bfe", "#a0d911", "#00b7cc",
]


def _apply_theme_tokens(mode: str) -> None:
    global ANTD_COLORS, TIER_COLORS, CATEGORICAL_PALETTE
    if mode == "light":
        ANTD_COLORS = {
            "primary": "#2aa198",
            "success": "#859900",
            "warning": "#b58900",
            "danger": "#dc322f",
            "info": "#268bd2",
            "purple": "#6c71c4",
            "geekblue": "#268bd2",
            "magenta": "#d33682",
            "cyan": "#2aa198",
            "lime": "#859900",
            "gold": "#b58900",
            "volcano": "#cb4b16",
            "text": "#073642",
            "text_secondary": "#586e75",
            "bg": "#fdf6e3",
            "card": "#eee8d5",
        }
        CATEGORICAL_PALETTE = ["#2aa198", "#859900", "#b58900", "#6c71c4", "#268bd2", "#cb4b16", "#d33682"]
    else:
        ANTD_COLORS = {
            "primary": "#2aa198",
            "success": "#859900",
            "warning": "#b58900",
            "danger": "#dc322f",
            "info": "#6cc7bf",
            "purple": "#8f73ff",
            "geekblue": "#2d6dff",
            "magenta": "#f15bfe",
            "cyan": "#2aa198",
            "lime": "#a0d911",
            "gold": "#b58900",
            "volcano": "#ff7c4d",
            "text": "#eee8d5",
            "text_secondary": "#93a1a1",
            "bg": "#002b36",
            "card": "#073642",
        }
        CATEGORICAL_PALETTE = ["#2aa198", "#859900", "#b58900", "#8f73ff", "#6cc7bf", "#2d6dff", "#ff7c4d", "#f15bfe"]

    TIER_COLORS = {
        "Low": ANTD_COLORS["success"],
        "Moderate": ANTD_COLORS["primary"],
        "High": ANTD_COLORS["warning"],
        "Critical": ANTD_COLORS["danger"],
    }


def inject_css(mode: str = "dark") -> None:
    """Inject the global CSS overlay with explicit light/dark mode."""
    _apply_theme_tokens(mode)
    if STYLE_PATH.exists():
        css = STYLE_PATH.read_text()
        if mode == "light":
            vars_css = """
            :root {
                --hud-cyan:#2aa198; --hud-cyan-soft:#268bd2; --hud-amber:#b58900; --hud-red:#dc322f; --hud-green:#859900;
                --hud-bg:#fdf6e3; --hud-panel:#eee8d5; --hud-panel-2:#e8e1ce; --hud-border:rgba(88,110,117,0.28);
                --hud-text:#073642; --hud-muted:#586e75; --sidebar-bg-start:#eee8d5; --sidebar-bg-end:#e8e1ce; --sidebar-text:#073642;
            }
            """
        else:
            vars_css = """
            :root {
                --hud-cyan:#2aa198; --hud-cyan-soft:#6cc7bf; --hud-amber:#b58900; --hud-red:#dc322f; --hud-green:#859900;
                --hud-bg:#002b36; --hud-panel:#073642; --hud-panel-2:#0a3d4b; --hud-border:rgba(42,161,152,0.32);
                --hud-text:#eee8d5; --hud-muted:#93a1a1; --sidebar-bg-start:#08131f; --sidebar-bg-end:#0d1b2a; --sidebar-text:rgba(255,255,255,0.92);
            }
            """
        st.markdown(f"<style>{css}\n{vars_css}</style>", unsafe_allow_html=True)


def page_header(title: str, subtitle: str, emoji: str = "S") -> None:
    st.markdown(
        f"""
        <div class="brand-bar">
            <div class="brand-logo">{emoji}</div>
            <div>
                <div class="brand-title">{title}</div>
                <div class="brand-sub">{subtitle}</div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )


def kpi_card(label: str, value: str, *, suffix: str = "", delta: str | None = None,
             delta_dir: str = "flat", accent: str = "#1677ff") -> str:
    delta_html = ""
    if delta:
        arrow = {"up": "▲", "down": "▼", "flat": "■"}[delta_dir]
        delta_html = f'<div class="kpi-delta {delta_dir}">{arrow} {delta}</div>'
    return (
        f'<div class="kpi-card" style="--accent: {accent};">'
        f'<div class="kpi-label">{label}</div>'
        f'<div class="kpi-value">{value}<span class="kpi-suffix">{suffix}</span></div>'
        f"{delta_html}"
        "</div>"
    )


def kpi_grid(cards: list[str]) -> None:
    st.markdown('<div class="kpi-grid">' + "".join(cards) + "</div>", unsafe_allow_html=True)


def risk_badge_html(tier: str) -> str:
    cls = f"risk-{tier.lower()}"
    return f'<span class="risk-badge {cls}"><span class="dot"></span>{tier}</span>'


def style_plotly(fig: go.Figure, *, height: int | None = None, title: str | None = None) -> go.Figure:
    # Normalize ambiguous trace names to avoid "undefined" legend labels.
    for tr in fig.data:
        n = getattr(tr, "name", "")
        if n is None or str(n).strip().lower() in {"undefined", "none"}:
            tr.name = ""

    fig.update_layout(
        font=dict(family="-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif", color=ANTD_COLORS["text"], size=12),
        plot_bgcolor=ANTD_COLORS["card"],
        paper_bgcolor=ANTD_COLORS["card"],
        margin=dict(l=20, r=20, t=40 if title else 16, b=20),
        legend=dict(bgcolor="rgba(0,0,0,0)", bordercolor="rgba(0,0,0,0)"),
        title=dict(text=title, x=0, xanchor="left", font=dict(size=14)) if title else None,
        colorway=CATEGORICAL_PALETTE,
        legend_title_text="",
    )
    # Legend text from some generated traces can render as "undefined" in Streamlit;
    # keep charts deterministic for stakeholder demos.
    fig.update_layout(showlegend=False)
    fig.update_xaxes(gridcolor="rgba(0,229,255,0.15)", zerolinecolor="rgba(0,229,255,0.15)")
    fig.update_yaxes(gridcolor="rgba(0,229,255,0.15)", zerolinecolor="rgba(0,229,255,0.15)")
    if height:
        fig.update_layout(height=height)
    return fig


def gauge(value: float, *, title: str = "Risk Score", max_value: float = 100.0,
          height: int = 240) -> go.Figure:
    """Risk gauge with green/yellow/red bands."""
    fig = go.Figure(go.Indicator(
        mode="gauge+number",
        value=value,
        number=dict(suffix="", font=dict(size=36, color=ANTD_COLORS["text"])),
        gauge=dict(
            axis=dict(range=[0, max_value], tickfont=dict(size=10), tickwidth=1, tickcolor="#d9d9d9"),
            bar=dict(color=_score_color(value), thickness=0.32),
            bgcolor=ANTD_COLORS["card"],
            borderwidth=0,
            steps=[
                dict(range=[0, 25], color="rgba(133,153,0,0.20)"),
                dict(range=[25, 50], color="rgba(42,161,152,0.22)"),
                dict(range=[50, 75], color="rgba(181,137,0,0.20)"),
                dict(range=[75, 100], color="rgba(220,50,47,0.20)"),
            ],
            threshold=dict(line=dict(color=ANTD_COLORS["text"], width=2), thickness=0.75, value=value),
        ),
        title=dict(text=title, font=dict(size=13, color=ANTD_COLORS["text_secondary"])),
        domain=dict(x=[0, 1], y=[0, 1]),
    ))
    return style_plotly(fig, height=height)


def _score_color(value: float) -> str:
    if value < 25: return ANTD_COLORS["success"]
    if value < 50: return ANTD_COLORS["primary"]
    if value < 75: return ANTD_COLORS["warning"]
    return ANTD_COLORS["danger"]
