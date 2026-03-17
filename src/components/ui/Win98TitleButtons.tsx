"use client";

import React from "react";

const btnBase: React.CSSProperties = {
    width: 16,
    height: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--retro-surface)",
    border: "1px solid",
    borderColor: "var(--retro-border-light) var(--retro-border-dark) var(--retro-border-dark) var(--retro-border-light)",
    fontSize: 8,
    lineHeight: 1,
    fontFamily: "monospace",
    color: "var(--retro-text)",
    cursor: "default",
};

export default function Win98TitleButtons() {
    return (
        <div className="flex gap-0.5" aria-hidden="true">
            <div style={btnBase}><span style={{ marginTop: -1 }}>_</span></div>
            <div style={btnBase}><span style={{ fontSize: 7 }}>□</span></div>
            <div style={btnBase}><span style={{ fontWeight: 700 }}>×</span></div>
        </div>
    );
}
