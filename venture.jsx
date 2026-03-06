import React, { useState, useRef, useEffect } from "react";

// ─── Load external scripts (Google Fonts, jsPDF) ───
const useExternalScripts = () => {
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    // Google Fonts
    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href =
      "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap";
    document.head.appendChild(fontLink);

    // Global style overrides
    const style = document.createElement("style");
    style.textContent = `
      body { margin: 0; padding: 0; background: #080808; }
      * { box-sizing: border-box; }
      ::selection { background: #C8FF00; color: #080808; }
      textarea:focus, input:focus { outline: none; }
      @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      @keyframes scanLine { 0% { width: 0%; } 50% { width: 70%; } 100% { width: 100%; } }
      @keyframes spin { to { transform: rotate(360deg); } }
      .card-enter { animation: fadeInUp 0.5s ease-out forwards; }
      .scan-progress { animation: scanLine 3s ease-in-out infinite; }
      .spinner { animation: spin 1s linear infinite; }
      .pulse-dots { animation: pulse 1.5s ease-in-out infinite; }
    `;
    document.head.appendChild(style);

    // jsPDF
    const jspdfScript = document.createElement("script");
    jspdfScript.src =
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    jspdfScript.onload = () => {
      const autoTableScript = document.createElement("script");
      autoTableScript.src =
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js";
      document.head.appendChild(autoTableScript);
    };
    document.head.appendChild(jspdfScript);
  }, []);
};

// ─── Color constants ───
const C = {
  bg: "#080808",
  s1: "#111111",
  s2: "#181818",
  s3: "#202020",
  border: "#252525",
  accent: "#C8FF00",
  orange: "#FF6B35",
  blue: "#00D4FF",
  green: "#00FF88",
  red: "#FF3B3B",
  text: "#E0E0E0",
  muted: "#888888",
  dim: "#555555",
};

const font = { heading: "'Syne', sans-serif", mono: "'JetBrains Mono', monospace" };

// ─── Small reusable components ───
const Badge = ({ children, color = C.accent, bg }) => (
  <span
    style={{
      fontFamily: font.mono,
      fontSize: 10,
      fontWeight: 600,
      padding: "2px 8px",
      borderRadius: 2,
      background: bg || `${color}18`,
      color: color,
      letterSpacing: 1,
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

const StatusChip = ({ status }) => {
  const map = {
    pending: { color: C.orange, label: "PENDING" },
    revising: { color: C.blue, label: "REVISING" },
    approved: { color: C.green, label: "APPROVED" },
    declined: { color: C.red, label: "DECLINED" },
  };
  const s = map[status] || map.pending;
  return (
    <span
      style={{
        fontFamily: font.mono,
        fontSize: 10,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 2,
        background: `${s.color}20`,
        color: s.color,
        border: `1px solid ${s.color}40`,
        letterSpacing: 1,
      }}
    >
      {s.label}
    </span>
  );
};

const Btn = ({ children, color = C.accent, filled, onClick, disabled, style: sx }) => (
  <button
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    style={{
      fontFamily: font.mono,
      fontSize: 12,
      fontWeight: 600,
      padding: "8px 18px",
      borderRadius: 3,
      border: `1px solid ${color}`,
      background: filled ? color : "transparent",
      color: filled ? "#080808" : color,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      letterSpacing: 1,
      transition: "all 0.2s",
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      ...sx,
    }}
    onMouseEnter={(e) => {
      if (!disabled) {
        e.target.style.background = color;
        e.target.style.color = "#080808";
      }
    }}
    onMouseLeave={(e) => {
      if (!disabled && !filled) {
        e.target.style.background = "transparent";
        e.target.style.color = color;
      }
    }}
  >
    {children}
  </button>
);

const Callout = ({ children, borderColor = C.accent, bg, style: sx }) => (
  <div
    style={{
      borderLeft: `3px solid ${borderColor}`,
      padding: "10px 14px",
      background: bg || `${borderColor}08`,
      borderRadius: "0 4px 4px 0",
      ...sx,
    }}
  >
    {children}
  </div>
);

// ─── Grid background overlay ───
const GridOverlay = () => (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundImage: `linear-gradient(${C.accent}04 1px, transparent 1px), linear-gradient(90deg, ${C.accent}04 1px, transparent 1px)`,
      backgroundSize: "52px 52px",
      pointerEvents: "none",
      zIndex: 0,
    }}
  />
);

// ─── Wave Progress Tracker ───
const WaveProgress = ({ currentWave, scanSignals, scanProgress }) => {
  const waves = [
    { num: 1, label: "SWEEP", desc: "scanning 6 data channels" },
    { num: 2, label: "VALIDATE", desc: `deep-diving signals ${scanProgress || ""}` },
    { num: 3, label: "RANK", desc: "scoring & ranking" },
  ];

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Wave steps */}
      <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 12 }}>
        {waves.map((w, i) => {
          const isActive = currentWave === w.num;
          const isDone = currentWave > w.num;
          const isPending = currentWave < w.num;

          return (
            <React.Fragment key={w.num}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* Circle */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: font.mono,
                    fontSize: 11,
                    fontWeight: 700,
                    background: isDone ? C.green : isActive ? C.accent : C.s3,
                    color: isDone || isActive ? "#080808" : C.dim,
                    border: isActive ? "none" : `1px solid ${isDone ? C.green : C.border}`,
                    animation: isActive ? "pulse 1.5s ease-in-out infinite" : "none",
                  }}
                >
                  {isDone ? "\u2713" : w.num}
                </div>
                {/* Label */}
                <div>
                  <div
                    style={{
                      fontFamily: font.mono,
                      fontSize: 10,
                      fontWeight: 600,
                      color: isDone ? C.green : isActive ? C.accent : C.dim,
                      letterSpacing: 1,
                    }}
                  >
                    {w.label}
                  </div>
                  {isActive && (
                    <div style={{ fontFamily: font.mono, fontSize: 9, color: C.muted, marginTop: 1 }}>
                      {w.desc}
                    </div>
                  )}
                </div>
              </div>
              {/* Connector line */}
              {i < waves.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background: currentWave > w.num ? C.green : C.border,
                    margin: "0 12px",
                    minWidth: 30,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Active wave progress bar */}
      <div style={{ height: 2, background: C.border, borderRadius: 1, overflow: "hidden", marginBottom: 6 }}>
        <div className="scan-progress" style={{ height: "100%", background: currentWave > 0 ? C.accent : "transparent", borderRadius: 1 }} />
      </div>

      {/* Signal feed from Wave 1 */}
      {scanSignals && scanSignals.length > 0 && currentWave >= 2 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontFamily: font.mono, fontSize: 9, color: C.dim, letterSpacing: 1, marginBottom: 6 }}>
            DETECTED SIGNALS
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {scanSignals.map((sig, i) => (
              <span
                key={i}
                style={{
                  fontFamily: font.mono,
                  fontSize: 9,
                  padding: "3px 8px",
                  borderRadius: 2,
                  background: `${C.accent}15`,
                  color: C.accent,
                  border: `1px solid ${C.accent}30`,
                }}
              >
                {sig.signal_name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── API helper ───
const callClaude = async (apiKey, systemPrompt, userMessage, tools = [], maxTokens = 8000) => {
  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  };
  if (tools.length > 0) body.tools = tools;

  const doCall = async () => {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`API error ${res.status}: ${err}`);
    }
    return res.json();
  };

  let response = await doCall();

  // Handle web search tool use loop
  while (response.stop_reason === "tool_use") {
    const toolBlocks = response.content.filter((b) => b.type === "tool_use");
    const toolResults = toolBlocks.map((tb) => ({
      type: "tool_result",
      tool_use_id: tb.id,
      content: "Search completed. Continue with analysis.",
    }));

    const continueBody = {
      ...body,
      messages: [
        { role: "user", content: userMessage },
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ],
    };

    const res2 = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(continueBody),
    });
    if (!res2.ok) {
      const err = await res2.text();
      throw new Error(`API error ${res2.status}: ${err}`);
    }
    response = await res2.json();
  }

  // Extract text
  const textBlocks = response.content.filter((b) => b.type === "text");
  return textBlocks.map((b) => b.text).join("\n");
};

// ─── Extract JSON from text (handles markdown fences) ───
const extractJSON = (text) => {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch (_) {}
  // Try extracting from code fences
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) {
    try {
      return JSON.parse(m[1].trim());
    } catch (_) {}
  }
  // Try finding array or object
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      return JSON.parse(arrMatch[0]);
    } catch (_) {}
  }
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch (_) {}
  }
  return null;
};

// ─── PDF Generator ───
const generatePDF = (idea, pipeline) => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210,
    H = 297;
  const margin = 18;
  const contentW = W - margin * 2;
  let pageNum = 0;

  const addBg = () => {
    doc.setFillColor(8, 8, 8);
    doc.rect(0, 0, W, H, "F");
    // grid lines
    doc.setDrawColor(200, 255, 0);
    doc.setLineWidth(0.08);
    for (let x = 0; x < W; x += 13) {
      doc.setGState(new doc.GState({ opacity: 0.03 }));
      doc.line(x, 0, x, H);
    }
    for (let y = 0; y < H; y += 13) {
      doc.line(0, y, W, y);
    }
    doc.setGState(new doc.GState({ opacity: 1 }));
    // top bar
    doc.setFillColor(200, 255, 0);
    doc.rect(0, 0, W, 4, "F");
  };

  const addHeader = () => {
    if (pageNum > 1) {
      doc.setFillColor(17, 17, 17);
      doc.rect(0, 4, W, 10, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(200, 255, 0);
      doc.text(`VENTURE.ai // ${idea.name.toUpperCase()}`, margin, 10.5);
      doc.setTextColor(136, 136, 136);
      doc.text(`PIPELINE REPORT | PAGE ${pageNum}`, W - margin, 10.5, { align: "right" });
    }
  };

  const addFooter = () => {
    doc.setDrawColor(37, 37, 37);
    doc.line(margin, H - 12, W - margin, H - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(85, 85, 85);
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    doc.text(`Generated by VENTURE.ai \u2022 ${today} \u2022 CONFIDENTIAL`, margin, H - 8);
    doc.text("Zero-Capital Automation Pipeline", W - margin, H - 8, { align: "right" });
  };

  const newPage = (isFirst = false) => {
    if (!isFirst) doc.addPage();
    pageNum++;
    addBg();
    addHeader();
    addFooter();
    return pageNum > 1 ? 20 : 8;
  };

  const checkPage = (y, needed = 30) => {
    if (y + needed > H - 20) {
      return newPage();
    }
    return y;
  };

  const sectionTitle = (y, num, title) => {
    y = checkPage(y, 20);
    doc.setFillColor(200, 255, 0);
    doc.rect(margin, y, 3, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(200, 255, 0);
    doc.text(`${num}.`, margin + 6, y + 6);
    doc.setTextColor(224, 224, 224);
    doc.text(title, margin + 16, y + 6);
    return y + 14;
  };

  const bodyText = (y, text, opts = {}) => {
    const { color = [224, 224, 224], size = 9, maxWidth = contentW, bold = false } = opts;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text || "", maxWidth);
    for (const line of lines) {
      y = checkPage(y, 6);
      doc.text(line, margin, y);
      y += 4.5;
    }
    return y + 2;
  };

  const labelValue = (y, label, value) => {
    y = checkPage(y, 10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(136, 136, 136);
    doc.text(label.toUpperCase(), margin, y);
    y += 5;
    y = bodyText(y, value || "N/A");
    return y;
  };

  const calloutBox = (y, text, color = [200, 255, 0]) => {
    y = checkPage(y, 16);
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(margin, y, 2.5, 12, "F");
    doc.setFillColor(color[0], color[1], color[2], 0);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text || "", contentW - 8);
    let ly = y + 4;
    for (const l of lines) {
      ly = checkPage(ly, 5);
      doc.text(l, margin + 6, ly);
      ly += 4.5;
    }
    return ly + 4;
  };

  // ═══ PAGE 1: COVER ═══
  let y = newPage(true);
  y = 35;

  // Category badge
  doc.setFillColor(200, 255, 0);
  doc.roundedRect(margin, y, doc.getTextWidth(idea.category || "VENTURE") * 1.4 + 10, 7, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(8, 8, 8);
  doc.text((idea.category || "VENTURE").toUpperCase(), margin + 5, y + 5);
  y += 16;

  // Business name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.setTextColor(255, 255, 255);
  const nameLines = doc.splitTextToSize(idea.name || "Untitled", contentW);
  for (const nl of nameLines) {
    doc.text(nl, margin, y);
    y += 14;
  }
  y += 2;

  // Tagline
  doc.setFont("helvetica", "italic");
  doc.setFontSize(12);
  doc.setTextColor(136, 136, 136);
  doc.text(idea.tagline || "", margin, y);
  y += 16;

  // Metrics table
  doc.setFillColor(17, 17, 17);
  doc.roundedRect(margin, y, contentW, 18, 2, 2, "F");
  const metricW = contentW / 4;
  const metrics = [
    { label: "CAPITAL", value: idea.startupCapital || "€0", color: [0, 255, 136] },
    { label: "TIME TO REVENUE", value: idea.timeToFirstRevenue || "TBD", color: [255, 107, 53] },
    { label: "AUTOMATION", value: `${idea.automationScore || 0}%`, color: [0, 212, 255] },
    { label: "EARNINGS", value: idea.earningsPotential || "TBD", color: [200, 255, 0] },
  ];
  metrics.forEach((m, i) => {
    const mx = margin + i * metricW;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(136, 136, 136);
    doc.text(m.label, mx + metricW / 2, y + 6, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...m.color);
    doc.text(m.value, mx + metricW / 2, y + 13, { align: "center" });
  });
  y += 26;

  // Executive summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(200, 255, 0);
  doc.text("EXECUTIVE SUMMARY", margin, y);
  y += 6;
  y = bodyText(y, idea.pitch);
  y += 6;

  // Document metadata
  doc.setFillColor(17, 17, 17);
  doc.roundedRect(margin, y, contentW, 12, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(136, 136, 136);
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const metaItems = [
    `TYPE: Pipeline Report`,
    `PREPARED BY: VENTURE.ai`,
    `DATE: ${today}`,
    `VERSION: 1.0`,
  ];
  metaItems.forEach((item, i) => {
    doc.text(item, margin + 4 + i * (contentW / 4), y + 7.5);
  });

  // ═══ PAGE 2: TABLE OF CONTENTS ═══
  y = newPage();
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("Table of Contents", margin, y);
  y += 14;
  const tocItems = [
    "Market Opportunity Analysis",
    "Business Model Deep Dive",
    "Zero-Capital Launch Strategy",
    "Full Automation Pipeline",
    "Tool Stack & Free Resources",
    "Week-by-Week Launch Roadmap",
    "Revenue Projections & Reinvestment",
    "Risk Analysis & Mitigation",
    "KPIs & Success Metrics",
    "Scaling Playbook",
  ];
  tocItems.forEach((item, i) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(200, 255, 0);
    doc.text(`${String(i + 1).padStart(2, "0")}`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(224, 224, 224);
    doc.text(item, margin + 14, y);
    doc.setDrawColor(37, 37, 37);
    doc.setLineWidth(0.3);
    doc.line(margin + 14 + doc.getTextWidth(item) + 3, y, W - margin - 14, y);
    doc.setTextColor(136, 136, 136);
    doc.setFontSize(9);
    doc.text(`${i + 3}`, W - margin - 8, y);
    y += 10;
  });

  // ═══ PAGE 3: MARKET OPPORTUNITY ═══
  y = newPage();
  y = sectionTitle(y, 1, "Market Opportunity Analysis");
  if (pipeline.marketAnalysis) {
    const ma = pipeline.marketAnalysis;
    y = calloutBox(y, `SIGNAL: ${ma.signal || idea.marketSignal || ""}`, [0, 212, 255]);
    y = labelValue(y, "Market Size", ma.marketSize);
    y = labelValue(y, "Growth Rate", ma.growthRate);
    y = labelValue(y, "Competition", ma.competition);
    y = labelValue(y, "Timing", ma.timing);
    y = labelValue(y, "Why Now", ma.whyNow);
    y = labelValue(y, "Target Audience", ma.targetAudience);
  }

  // ═══ PAGE 4: BUSINESS MODEL ═══
  y = newPage();
  y = sectionTitle(y, 2, "Business Model Deep Dive");
  if (pipeline.businessModel) {
    const bm = pipeline.businessModel;
    y = labelValue(y, "Model", bm.model);
    y = labelValue(y, "Monetization", bm.monetization);
    y = labelValue(y, "Value Proposition", bm.valueProposition);
    y = labelValue(y, "Unfair Advantage", bm.unfairAdvantage);
    y = labelValue(y, "Moat", bm.moat);
  }

  // ═══ PAGE 5: ZERO-CAPITAL STRATEGY ═══
  y = newPage();
  y = sectionTitle(y, 3, "Zero-Capital Launch Strategy");
  if (pipeline.zeroCapital) {
    const zc = pipeline.zeroCapital;
    y = calloutBox(y, `DAY 1 ACTION: ${zc.firstStep || idea.firstStep || ""}`, [0, 255, 136]);
    y = labelValue(y, "How Zero Capital Works", zc.howZeroCapital);
    y = labelValue(y, "Free Tools Needed", zc.freeTools);
    y = labelValue(y, "Path to First Revenue", zc.firstRevenuePath);
    y = labelValue(y, "Bootstrap Strategy", zc.bootstrap);
  }

  // ═══ PAGE 6: AUTOMATION PIPELINE ═══
  y = newPage();
  y = sectionTitle(y, 4, "Full Automation Pipeline");
  if (pipeline.summary) {
    y = calloutBox(y, pipeline.summary);
  }
  if (pipeline.steps) {
    pipeline.steps.forEach((step, i) => {
      y = checkPage(y, 35);
      // Step number
      doc.setFillColor(200, 255, 0);
      doc.circle(margin + 3, y + 3, 3, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(8, 8, 8);
      doc.text(`${step.stepNumber || i + 1}`, margin + 3, y + 4.5, { align: "center" });

      // Connecting line
      if (i < pipeline.steps.length - 1) {
        doc.setDrawColor(37, 37, 37);
        doc.setLineWidth(0.5);
        doc.line(margin + 3, y + 7, margin + 3, y + 30);
      }

      // Step content
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(step.title || "", margin + 10, y + 4.5);
      y += 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      const descLines = doc.splitTextToSize(step.description || "", contentW - 12);
      for (const dl of descLines) {
        y = checkPage(y, 5);
        doc.text(dl, margin + 10, y);
        y += 4;
      }
      y += 2;

      // Tools
      if (step.tools && step.tools.length) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(0, 212, 255);
        doc.text(`TOOLS: ${step.tools.join(", ")}`, margin + 10, y);
        y += 4;
      }

      // Frequency & Human input
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(136, 136, 136);
      const metaLine = `Frequency: ${step.frequency || "N/A"} | Human Input: ${step.humanInput || "None"}`;
      doc.text(metaLine, margin + 10, y);
      y += 8;
    });
  }

  // ═══ PAGE 7: TOOL STACK ═══
  y = newPage();
  y = sectionTitle(y, 5, "Tool Stack & Free Resources");
  if (pipeline.toolStack && pipeline.toolStack.length) {
    doc.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Tool", "Purpose", "Free Limit", "Upgrade Trigger"]],
      body: pipeline.toolStack.map((t) => [t.name, t.purpose, t.freeLimit, t.upgradeTrigger]),
      styles: {
        fillColor: [17, 17, 17],
        textColor: [224, 224, 224],
        fontSize: 8,
        cellPadding: 3,
        lineColor: [37, 37, 37],
        lineWidth: 0.3,
        font: "helvetica",
      },
      headStyles: {
        fillColor: [32, 32, 32],
        textColor: [200, 255, 0],
        fontStyle: "bold",
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [24, 24, 24] },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // ═══ PAGE 8: ROADMAP ═══
  y = newPage();
  y = sectionTitle(y, 6, "Week-by-Week Launch Roadmap");
  if (pipeline.roadmap) {
    pipeline.roadmap.forEach((week) => {
      y = checkPage(y, 30);
      doc.setFillColor(24, 24, 24);
      doc.roundedRect(margin, y, contentW, 6, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(200, 255, 0);
      doc.text(week.period || "", margin + 4, y + 4.5);
      y += 10;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(`Goal: ${week.goal || ""}`, margin + 4, y);
      y += 6;

      if (week.tasks) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(180, 180, 180);
        week.tasks.forEach((task) => {
          y = checkPage(y, 5);
          doc.text(`\u2022 ${task}`, margin + 6, y);
          y += 4.5;
        });
      }

      if (week.milestone) {
        y += 2;
        y = calloutBox(y, `MILESTONE: ${week.milestone}`, [0, 255, 136]);
      }
      y += 4;
    });
  }

  // ═══ PAGE 9: REVENUE ═══
  y = newPage();
  y = sectionTitle(y, 7, "Revenue Projections & Reinvestment");
  if (pipeline.revenue && pipeline.revenue.scenarios) {
    doc.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Timeframe", "Conservative", "Realistic", "Optimistic", "Reinvest"]],
      body: pipeline.revenue.scenarios.map((s) => [
        s.month,
        s.conservative,
        s.realistic,
        s.optimistic,
        s.reinvest,
      ]),
      styles: {
        fillColor: [17, 17, 17],
        textColor: [224, 224, 224],
        fontSize: 8,
        cellPadding: 3,
        lineColor: [37, 37, 37],
        lineWidth: 0.3,
        font: "helvetica",
      },
      headStyles: {
        fillColor: [32, 32, 32],
        textColor: [200, 255, 0],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [24, 24, 24] },
    });
    y = doc.lastAutoTable.finalY + 8;
    if (pipeline.revenue.reinvestmentPlan) {
      y = labelValue(y, "Reinvestment Strategy", pipeline.revenue.reinvestmentPlan);
    }
  }

  // ═══ PAGE 10: RISKS ═══
  y = newPage();
  y = sectionTitle(y, 8, "Risk Analysis & Mitigation");
  if (pipeline.risks) {
    pipeline.risks.forEach((risk) => {
      y = checkPage(y, 22);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(risk.risk || "", margin, y);

      // severity badge
      const sevColor =
        risk.severity === "High" ? [255, 59, 59] : risk.severity === "Medium" ? [255, 107, 53] : [0, 255, 136];
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...sevColor);
      doc.text(`SEVERITY: ${risk.severity || "?"}`, margin + 100, y);
      doc.text(`PROB: ${risk.probability || "?"}`, margin + 130, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      const mitLines = doc.splitTextToSize(`Mitigation: ${risk.mitigation || ""}`, contentW);
      for (const ml of mitLines) {
        y = checkPage(y, 5);
        doc.text(ml, margin, y);
        y += 4;
      }
      y += 4;
    });
  }

  // ═══ PAGE 11: KPIs ═══
  y = newPage();
  y = sectionTitle(y, 9, "KPIs & Success Metrics");
  if (pipeline.kpis && pipeline.kpis.length) {
    doc.autoTable({
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Metric", "Target", "Frequency", "Action if Missed"]],
      body: pipeline.kpis.map((k) => [k.metric, k.target, k.frequency, k.action]),
      styles: {
        fillColor: [17, 17, 17],
        textColor: [224, 224, 224],
        fontSize: 8,
        cellPadding: 3,
        lineColor: [37, 37, 37],
        lineWidth: 0.3,
        font: "helvetica",
      },
      headStyles: {
        fillColor: [32, 32, 32],
        textColor: [200, 255, 0],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [24, 24, 24] },
    });
  }

  // ═══ PAGE 12: SCALING ═══
  y = newPage();
  y = sectionTitle(y, 10, "Scaling Playbook");
  if (pipeline.scaling) {
    if (pipeline.scaling.phases) {
      pipeline.scaling.phases.forEach((phase) => {
        y = checkPage(y, 30);
        doc.setFillColor(24, 24, 24);
        doc.roundedRect(margin, y, contentW, 7, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(200, 255, 0);
        doc.text(phase.name || "", margin + 4, y + 5);
        y += 11;

        if (phase.trigger) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(136, 136, 136);
          doc.text(`TRIGGER: ${phase.trigger}`, margin + 4, y);
          y += 5;
        }

        y = bodyText(y, phase.description, { size: 8 });

        if (phase.actions) {
          phase.actions.forEach((a) => {
            y = checkPage(y, 5);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(180, 180, 180);
            doc.text(`\u2022 ${a}`, margin + 6, y);
            y += 4.5;
          });
        }
        y += 6;
      });
    }

    if (pipeline.scaling.longTermVision) {
      y += 4;
      y = calloutBox(y, pipeline.scaling.longTermVision);
    }
  }

  // ═══ FINAL PAGE ═══
  y = newPage();
  y = 100;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.setTextColor(255, 255, 255);
  doc.text("Ready to launch.", W / 2, y, { align: "center" });
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(136, 136, 136);
  const closingLines = doc.splitTextToSize(
    "This pipeline document contains everything you need to go from zero to revenue. Follow the steps, use the free tools, track your KPIs, and reinvest profits to scale.",
    contentW - 20
  );
  closingLines.forEach((cl) => {
    doc.text(cl, W / 2, y, { align: "center" });
    y += 6;
  });
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(200, 255, 0);
  doc.text("Start today. Automate everything. Reinvest relentlessly.", W / 2, y, { align: "center" });

  // Save
  const safeName = (idea.name || "Venture").replace(/[^a-zA-Z0-9]/g, "-");
  doc.save(`VENTURE-${safeName}-Pipeline.pdf`);
  return true;
};

// ═══════════════════════════════════════════════
// ─── IDEA CARD COMPONENT ───
// ═══════════════════════════════════════════════
const IdeaCard = ({ idea, onApprove, onDecline, onRevise, apiKey }) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (showFeedback && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [showFeedback]);

  const borderColor =
    idea.status === "approved"
      ? C.green
      : idea.status === "declined"
      ? C.red
      : idea.status === "revising"
      ? C.blue
      : C.orange;

  const autoColor = (score) => {
    const s = parseInt(score) || 0;
    return s >= 80 ? C.green : s >= 60 ? C.orange : C.red;
  };

  const handleRevise = async () => {
    if (!feedback.trim()) return;
    setSending(true);
    await onRevise(idea.id, feedback.trim());
    setFeedback("");
    setShowFeedback(false);
    setSending(false);
  };

  const isActive = idea.status === "pending" || idea.status === "revising";
  const declined = idea.status === "declined";

  return (
    <div
      className="card-enter"
      style={{
        background: declined ? `${C.s1}80` : C.s1,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: "0 6px 6px 0",
        padding: 20,
        marginBottom: 16,
        opacity: declined ? 0.5 : 1,
        position: "relative",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Badge color={C.orange}>{idea.category}</Badge>
          <Badge color={idea.revisions > 0 ? C.blue : C.accent}>
            {idea.revisions > 0 ? `#v${idea.revisions + 1}` : "#new"}
          </Badge>
          {idea.revisions > 0 && <Badge color={C.blue}>↻ REVISED {idea.revisions}x</Badge>}
        </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <StatusChip status={idea.status} />
            {idea.compositeScore && (
              <span
                style={{
                  fontFamily: font.mono,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 2,
                  background: `${idea.compositeScore >= 75 ? C.green : idea.compositeScore >= 50 ? C.orange : C.red}20`,
                  color: idea.compositeScore >= 75 ? C.green : idea.compositeScore >= 50 ? C.orange : C.red,
                  border: `1px solid ${idea.compositeScore >= 75 ? C.green : idea.compositeScore >= 50 ? C.orange : C.red}40`,
                  letterSpacing: 1,
                }}
              >
                CONFIDENCE: {idea.compositeScore}
              </span>
            )}
          </div>
      </div>

      <h3
        style={{
          fontFamily: font.heading,
          fontSize: 22,
          fontWeight: 700,
          color: "#fff",
          margin: "8px 0 2px",
        }}
      >
        {idea.name}
      </h3>
      <p style={{ fontFamily: font.heading, fontSize: 13, color: C.muted, fontStyle: "italic", margin: "0 0 14px" }}>
        {idea.tagline}
      </p>

      {/* Pitch */}
      <p style={{ fontFamily: font.mono, fontSize: 12, color: C.text, lineHeight: 1.7, marginBottom: 14 }}>
        {idea.pitch}
      </p>

      {/* Market signal */}
      <Callout borderColor={C.blue} style={{ marginBottom: 14 }}>
        <span style={{ fontFamily: font.mono, fontSize: 10, color: C.blue, fontWeight: 600 }}>MARKET SIGNAL</span>
        <p style={{ fontFamily: font.mono, fontSize: 11, color: C.text, margin: "4px 0 0" }}>{idea.marketSignal}</p>
      </Callout>

      {/* Metrics grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginBottom: 10,
        }}
      >
        {[
          { label: "STARTUP CAPITAL", value: idea.startupCapital, color: C.green },
          { label: "TIME TO REVENUE", value: idea.timeToFirstRevenue, color: C.orange },
          { label: "AUTOMATION", value: `${idea.automationScore}%`, color: autoColor(idea.automationScore) },
          { label: "EARNINGS", value: idea.earningsPotential, color: C.blue },
        ].map((m) => (
          <div
            key={m.label}
            style={{
              background: C.s2,
              padding: "8px 10px",
              borderRadius: 4,
              textAlign: "center",
            }}
          >
            <div style={{ fontFamily: font.mono, fontSize: 9, color: C.dim, marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontFamily: font.mono, fontSize: 14, color: m.color, fontWeight: 700 }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Score breakdown bars */}
      {idea.scoreBreakdown && Object.keys(idea.scoreBreakdown).length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: font.mono, fontSize: 9, color: C.dim, letterSpacing: 1, marginBottom: 8 }}>
            SCORE BREAKDOWN
          </div>
          {[
            { key: "timingUrgency", label: "TIMING", color: C.orange },
            { key: "marketGapSize", label: "MARKET GAP", color: C.blue },
            { key: "zeroCapitalFeasibility", label: "ZERO-CAP", color: C.green },
            { key: "automationPotential", label: "AUTOMATION", color: C.accent },
            { key: "revenueSpeed", label: "REV SPEED", color: "#FF6BFF" },
          ].map((axis) => {
            const val = parseInt(idea.scoreBreakdown[axis.key]) || 0;
            return (
              <div key={axis.key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ fontFamily: font.mono, fontSize: 9, color: C.dim, width: 80, textAlign: "right" }}>
                  {axis.label}
                </div>
                <div style={{ flex: 1, height: 6, background: C.s3, borderRadius: 3, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${val}%`,
                      height: "100%",
                      background: axis.color,
                      borderRadius: 3,
                      transition: "width 0.5s ease-out",
                    }}
                  />
                </div>
                <div style={{ fontFamily: font.mono, fontSize: 9, color: axis.color, width: 24, textAlign: "right", fontWeight: 600 }}>
                  {val}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Secondary metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div style={{ background: C.s2, padding: "8px 10px", borderRadius: 4 }}>
          <span style={{ fontFamily: font.mono, fontSize: 9, color: C.dim }}>COMPETITION</span>
          <div style={{ fontFamily: font.mono, fontSize: 12, color: C.text, marginTop: 2 }}>
            {idea.competitionLevel}
          </div>
        </div>
        <div style={{ background: C.s2, padding: "8px 10px", borderRadius: 4 }}>
          <span style={{ fontFamily: font.mono, fontSize: 9, color: C.dim }}>GEOGRAPHIC FOCUS</span>
          <div style={{ fontFamily: font.mono, fontSize: 12, color: C.text, marginTop: 2 }}>
            {idea.geographicFocus}
          </div>
        </div>
      </div>

      {/* Revenue model */}
      <div style={{ fontFamily: font.mono, fontSize: 11, color: C.muted, marginBottom: 6 }}>
        <span style={{ color: C.accent, fontWeight: 600 }}>REVENUE MODEL:</span> {idea.revenueModel}
      </div>

      {/* Zero capital */}
      <div style={{ fontFamily: font.mono, fontSize: 11, color: C.muted, marginBottom: 14 }}>
        <span style={{ color: C.green, fontWeight: 600 }}>WHY €0:</span> {idea.zeroCapitalMechanism}
      </div>

      {/* First step */}
      <Callout borderColor={C.accent} style={{ marginBottom: 14 }}>
        <span style={{ fontFamily: font.mono, fontSize: 10, color: C.accent, fontWeight: 600 }}>
          FIRST STEP TODAY
        </span>
        <p style={{ fontFamily: font.mono, fontSize: 11, color: "#fff", margin: "4px 0 0", fontWeight: 500 }}>
          {idea.firstStep}
        </p>
      </Callout>

      {/* Validation Evidence */}
      {idea.validationData && Object.keys(idea.validationData).length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div
            onClick={() => setShowValidation(!showValidation)}
            style={{
              fontFamily: font.mono,
              fontSize: 10,
              color: C.blue,
              fontWeight: 600,
              cursor: "pointer",
              padding: "6px 0",
              display: "flex",
              alignItems: "center",
              gap: 6,
              letterSpacing: 1,
              userSelect: "none",
            }}
          >
            <span style={{ transition: "transform 0.2s", display: "inline-block", transform: showValidation ? "rotate(90deg)" : "rotate(0)" }}>
              ▶
            </span>
            VALIDATION EVIDENCE
          </div>

          {showValidation && (
            <div className="card-enter" style={{ background: C.s2, borderRadius: 4, padding: 14, marginTop: 4 }}>
              {/* Competitors */}
              {idea.validationData.competitors && idea.validationData.competitors.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: font.mono, fontSize: 9, color: C.dim, letterSpacing: 1, marginBottom: 6 }}>
                    COMPETITORS
                  </div>
                  {idea.validationData.competitors.map((c, i) => (
                    <div key={i} style={{ fontFamily: font.mono, fontSize: 11, color: C.text, marginBottom: 4, paddingLeft: 8, borderLeft: `2px solid ${C.red}40` }}>
                      <span style={{ color: C.orange, fontWeight: 600 }}>{c.name}</span>
                      {c.pricing && <span style={{ color: C.dim }}> — {c.pricing}</span>}
                      {c.weakness && <div style={{ color: C.muted, fontSize: 10, marginTop: 1 }}>Weakness: {c.weakness}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* TAM */}
              {idea.validationData.tamEstimate && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: font.mono, fontSize: 9, color: C.dim, letterSpacing: 1, marginBottom: 4 }}>
                    MARKET SIZE (TAM)
                  </div>
                  <div style={{ fontFamily: font.mono, fontSize: 12, color: C.accent, fontWeight: 600 }}>
                    {idea.validationData.tamEstimate}
                  </div>
                </div>
              )}

              {/* Demand Proof */}
              {idea.validationData.demandProof && idea.validationData.demandProof.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: font.mono, fontSize: 9, color: C.dim, letterSpacing: 1, marginBottom: 4 }}>
                    DEMAND PROOF
                  </div>
                  {idea.validationData.demandProof.map((proof, i) => (
                    <div key={i} style={{ fontFamily: font.mono, fontSize: 10, color: C.green, marginBottom: 3, paddingLeft: 8 }}>
                      ✓ {proof}
                    </div>
                  ))}
                </div>
              )}

              {/* Timing Window */}
              {idea.validationData.timingWindow && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: font.mono, fontSize: 9, color: C.dim, letterSpacing: 1, marginBottom: 4 }}>
                    TIMING WINDOW
                  </div>
                  <div style={{ fontFamily: font.mono, fontSize: 11, color: C.orange }}>
                    {idea.validationData.timingWindow}
                  </div>
                </div>
              )}

              {/* Free Tools */}
              {idea.validationData.freeTools && idea.validationData.freeTools.length > 0 && (
                <div>
                  <div style={{ fontFamily: font.mono, fontSize: 9, color: C.dim, letterSpacing: 1, marginBottom: 4 }}>
                    FREE TOOLS STACK
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {idea.validationData.freeTools.map((tool, i) => (
                      <span
                        key={i}
                        style={{
                          fontFamily: font.mono,
                          fontSize: 9,
                          padding: "3px 8px",
                          borderRadius: 2,
                          background: `${C.blue}15`,
                          color: C.blue,
                          border: `1px solid ${C.blue}30`,
                        }}
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* AI Revision Note */}
      {idea.aiRevisionNote && (
        <Callout borderColor={C.blue} style={{ marginBottom: 14 }}>
          <span style={{ fontFamily: font.mono, fontSize: 10, color: C.blue, fontWeight: 600 }}>
            ↳ AI REVISED BECAUSE:
          </span>
          <p style={{ fontFamily: font.mono, fontSize: 11, color: C.text, margin: "4px 0 0" }}>
            {idea.aiRevisionNote}
          </p>
        </Callout>
      )}

      {/* Pipeline generating indicator */}
      {idea.pdfGenerating && (
        <div
          style={{
            fontFamily: font.mono,
            fontSize: 12,
            color: C.accent,
            padding: "12px 0",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span className="spinner" style={{ display: "inline-block", width: 14, height: 14, border: `2px solid ${C.accent}40`, borderTop: `2px solid ${C.accent}`, borderRadius: "50%" }} />
          Building pipeline<span className="pulse-dots">...</span>
        </div>
      )}

      {/* Actions */}
      {isActive && !idea.pdfGenerating && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
          <Btn color={C.green} onClick={() => onApprove(idea.id)}>
            ✓ APPROVE
          </Btn>
          <Btn
            color={C.blue}
            onClick={() => setShowFeedback(!showFeedback)}
          >
            ↻ NEEDS WORK
          </Btn>
          <Btn color={C.red} onClick={() => onDecline(idea.id)}>
            ✕ DECLINE
          </Btn>
        </div>
      )}

      {/* Feedback area */}
      {showFeedback && isActive && (
        <div style={{ marginTop: 12 }}>
          <textarea
            ref={textareaRef}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What's missing or needs improvement? Be specific — the AI will search for more data and come back stronger..."
            style={{
              width: "100%",
              minHeight: 80,
              background: C.s3,
              border: `1px solid ${C.blue}40`,
              borderRadius: 4,
              padding: 12,
              color: C.text,
              fontFamily: font.mono,
              fontSize: 12,
              resize: "vertical",
            }}
          />
          <div style={{ marginTop: 8 }}>
            <Btn color={C.blue} filled onClick={handleRevise} disabled={sending || !feedback.trim()}>
              {sending ? "SENDING..." : "SEND FOR REVISION"}
            </Btn>
          </div>
        </div>
      )}

      {/* Declined message */}
      {declined && (
        <p style={{ fontFamily: font.mono, fontSize: 11, color: C.dim, marginTop: 8 }}>
          // declined — scan again for new opportunities
        </p>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════
// ─── PIPELINE CARD COMPONENT ───
// ═══════════════════════════════════════════════
const PipelineCard = ({ idea }) => {
  if (!idea.pipeline) {
    return (
      <div
        style={{
          background: C.s1,
          borderLeft: `3px solid ${C.accent}`,
          borderRadius: "0 6px 6px 0",
          padding: 20,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <h3 style={{ fontFamily: font.heading, fontSize: 18, color: "#fff", margin: 0 }}>{idea.name}</h3>
          <Badge color={C.green}>APPROVED</Badge>
        </div>
        <div
          style={{
            fontFamily: font.mono,
            fontSize: 12,
            color: C.accent,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span className="spinner" style={{ display: "inline-block", width: 14, height: 14, border: `2px solid ${C.accent}40`, borderTop: `2px solid ${C.accent}`, borderRadius: "50%" }} />
          Generating pipeline<span className="pulse-dots">...</span>
        </div>
      </div>
    );
  }

  const pl = idea.pipeline;

  return (
    <div
      className="card-enter"
      style={{
        background: C.s1,
        borderLeft: `3px solid ${C.green}`,
        borderRadius: "0 6px 6px 0",
        padding: 20,
        marginBottom: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <h3 style={{ fontFamily: font.heading, fontSize: 20, color: "#fff", margin: 0 }}>{idea.name}</h3>
        <Badge color={C.green}>APPROVED</Badge>
        {idea.pdfReady && <Badge color={C.accent}>PDF READY</Badge>}
      </div>

      {/* Summary */}
      {pl.summary && (
        <Callout borderColor={C.accent} style={{ marginBottom: 16 }}>
          <p style={{ fontFamily: font.mono, fontSize: 12, color: C.accent, margin: 0, fontWeight: 500 }}>
            {pl.summary}
          </p>
        </Callout>
      )}

      {/* Steps */}
      {pl.steps && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: font.mono, fontSize: 10, color: C.dim, marginBottom: 10, letterSpacing: 1 }}>
            AUTOMATION PIPELINE
          </div>
          {pl.steps.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 2 }}>
              {/* Vertical line + dot */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: C.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: font.mono,
                    fontSize: 10,
                    color: "#080808",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {step.stepNumber || i + 1}
                </div>
                {i < pl.steps.length - 1 && (
                  <div style={{ width: 2, flexGrow: 1, background: C.border, minHeight: 20 }} />
                )}
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingBottom: 12 }}>
                <div style={{ fontFamily: font.heading, fontSize: 14, color: "#fff", fontWeight: 600 }}>
                  {step.title}
                </div>
                <p style={{ fontFamily: font.mono, fontSize: 11, color: C.muted, margin: "4px 0 6px", lineHeight: 1.6 }}>
                  {step.description}
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  {step.tools &&
                    step.tools.map((tool) => (
                      <span
                        key={tool}
                        style={{
                          fontFamily: font.mono,
                          fontSize: 9,
                          padding: "2px 6px",
                          background: `${C.blue}18`,
                          color: C.blue,
                          borderRadius: 2,
                        }}
                      >
                        {tool}
                      </span>
                    ))}
                  <span
                    style={{
                      fontFamily: font.mono,
                      fontSize: 9,
                      color: !step.humanInput || step.humanInput.toLowerCase() === "none" ? C.green : C.orange,
                    }}
                  >
                    {!step.humanInput || step.humanInput.toLowerCase() === "none"
                      ? "🤖 AUTOMATED"
                      : `👤 ${step.humanInput}`}
                  </span>
                  {step.frequency && (
                    <span style={{ fontFamily: font.mono, fontSize: 9, color: C.dim }}>• {step.frequency}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Download button */}
      {idea.pdfReady && (
        <Btn
          color={C.accent}
          filled
          onClick={() => generatePDF(idea, pl)}
          style={{ marginTop: 4 }}
        >
          ⬡ DOWNLOAD PIPELINE PDF
        </Btn>
      )}

      {!idea.pdfReady && idea.pdfGenerating && (
        <div style={{ fontFamily: font.mono, fontSize: 12, color: C.accent, display: "flex", alignItems: "center", gap: 8 }}>
          <span className="spinner" style={{ display: "inline-block", width: 14, height: 14, border: `2px solid ${C.accent}40`, borderTop: `2px solid ${C.accent}`, borderRadius: "50%" }} />
          Generating PDF<span className="pulse-dots">...</span>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════
// ─── MAIN APP ───
// ═══════════════════════════════════════════════
export default function VentureApp() {
  useExternalScripts();

  const [apiKey, setApiKey] = useState("");
  const [apiKeySet, setApiKeySet] = useState(false);
  const [tab, setTab] = useState("scanner");
  const [ideas, setIdeas] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanPhase, setScanPhase] = useState("");
  const [scanWave, setScanWave] = useState(0);
  const [scanSignals, setScanSignals] = useState([]);
  const [scanProgress, setScanProgress] = useState("");
  const [error, setError] = useState(null);

  // ─── Counts ───
  const pendingCount = ideas.filter((i) => i.status === "pending" || i.status === "revising").length;
  const approvedCount = ideas.filter((i) => i.status === "approved").length;
  const pipelineCount = ideas.filter((i) => i.pipeline !== null).length;

  // ─── Scan (3-Wave Architecture) ───
  const handleScan = async () => {
    if (scanning || !apiKey) return;
    setScanning(true);
    setError(null);
    setScanWave(1);
    setScanSignals([]);
    setScanProgress("");
    setScanPhase("// wave 1: sweeping 6 data channels...");

    const existingNames = ideas.map((i) => i.name).join(", ");

    try {
      // ═══ WAVE 1: Broad Trend Sweep ═══
      const sweepText = await callClaude(
        apiKey,
        `You are an elite market intelligence analyst. Your job is to scan 6 data channels simultaneously and identify raw market signals — emerging opportunities that a zero-capital solo operator could exploit RIGHT NOW.

Scan these 6 channels:
1. REDDIT/COMMUNITIES — subreddits with monetization gaps, growing communities with unmet needs, pain points people are paying to solve
2. PRODUCT HUNT/LAUNCHES — new tools creating ecosystem opportunities, APIs just released, platforms with early-mover advantages
3. GOOGLE TRENDS — spiking search terms with low competition, emerging categories, breakout queries
4. X/TWITTER — viral pain points, complaints about existing solutions going viral, underserved creator niches
5. REGULATORY/POLICY — new laws, platform policy changes, compliance requirements creating market openings
6. SEASONAL/TIMING — upcoming events, cyclical demand windows opening, cultural moments creating short-term opportunities

Use web search to find REAL, CURRENT signals from each channel. Not hypothetical — actual data you can find right now.

Return ONLY valid JSON array, no markdown, no explanation.`,
        `Search the web across all 6 channels for current market signals and emerging opportunities. Find 6-8 specific, timely signals.${existingNames ? `\nAvoid signals related to these already-found ideas: ${existingNames}` : ""}

Return ONLY a JSON array with this schema:
[
  {
    "signal_name": "short descriptive name",
    "channel_source": "one of: Reddit, ProductHunt, GoogleTrends, Twitter, Regulatory, Seasonal",
    "raw_evidence": "specific data point or observation from web search",
    "opportunity_hint": "1 sentence on what business opportunity this signal suggests",
    "urgency": 8
  }
]

Return 6-8 signals. urgency is 1-10 (10 = most urgent/time-sensitive). Return ONLY the JSON array.`,
        [{ type: "web_search_20250305", name: "web_search" }]
      );

      let signals = extractJSON(sweepText);

      if (!signals || !Array.isArray(signals)) {
        const retryText = await callClaude(
          apiKey,
          "Return ONLY a valid JSON array. No markdown, no explanation, no code fences.",
          `Convert this into a valid JSON array of market signals:\n\n${sweepText}\n\nReturn ONLY the JSON array.`
        );
        signals = extractJSON(retryText);
      }

      if (!signals || !Array.isArray(signals) || signals.length === 0) {
        throw new Error("Wave 1 failed: Could not extract market signals. Try scanning again.");
      }

      // Sort by urgency, take top 4
      signals.sort((a, b) => (b.urgency || 0) - (a.urgency || 0));
      const topSignals = signals.slice(0, 4);
      setScanSignals(signals);

      // ═══ WAVE 2: Deep-Dive Validation ═══
      setScanWave(2);
      setScanPhase("// wave 2: validating top signals...");

      const validationPromises = topSignals.map((signal, idx) => {
        setScanProgress(`${idx + 1}/${topSignals.length}`);
        return callClaude(
          apiKey,
          `You are a market validation analyst. Your job is to deep-dive into a specific market signal and determine if it represents a REAL, actionable zero-capital business opportunity. Be brutally honest — kill weak signals.

Use web search to find:
1. Real competitor names, their pricing, and specific weaknesses
2. TAM (total addressable market) estimate with actual data
3. Demand proof: community sizes, search volumes, spending signals
4. Timing window: why this works NOW specifically
5. Zero-capital feasibility: specific free tools that make this possible

Return ONLY valid JSON, no markdown, no explanation.`,
          `Validate this market signal with targeted web research:

Signal: ${signal.signal_name}
Source: ${signal.channel_source}
Evidence: ${signal.raw_evidence}
Opportunity: ${signal.opportunity_hint}

Search the web to validate or kill this signal. Return ONLY a JSON object:
{
  "signal": "${signal.signal_name}",
  "validated": true,
  "competitors": [{"name": "CompanyX", "pricing": "$29/mo", "weakness": "specific weakness"}],
  "tamEstimate": "$X.XB growing XX% YoY",
  "demandProof": ["specific data point 1", "specific data point 2"],
  "timingWindow": "why this works right now specifically",
  "freeTools": ["tool1 — what it does", "tool2 — what it does"],
  "killReason": null,
  "validatedOpportunity": "refined 1-sentence opportunity description"
}

Set validated to false and killReason to a specific reason if the signal is weak, saturated, or not feasible with zero capital. Return ONLY the JSON object.`,
          [{ type: "web_search_20250305", name: "web_search" }]
        ).then((text) => {
          let data = extractJSON(text);
          if (!data) {
            return { signal: signal.signal_name, validated: false, killReason: "Failed to parse validation data" };
          }
          return data;
        }).catch(() => {
          return { signal: signal.signal_name, validated: false, killReason: "Validation call failed" };
        });
      });

      const validationResults = await Promise.all(validationPromises);
      const validated = validationResults.filter((v) => v.validated !== false);

      if (validated.length === 0) {
        throw new Error("Wave 2: All signals were killed during validation. Try scanning again for fresh signals.");
      }

      // ═══ WAVE 3: Scoring & Ranking ═══
      setScanWave(3);
      setScanPhase("// wave 3: scoring & ranking opportunities...");
      setScanProgress("");

      const doNotRepeat = existingNames ? `\nDo NOT repeat any of these already-proposed ideas: ${existingNames}` : "";
      const scoredText = await callClaude(
        apiKey,
        `You are a business scoring and ranking analyst. Take validated market opportunities and:
1. Score each on 5 axes (0-100): timingUrgency, marketGapSize, zeroCapitalFeasibility, automationPotential, revenueSpeed
2. Calculate compositeScore as weighted average (timing 25%, gap 20%, feasibility 20%, automation 15%, speed 20%)
3. Structure into full business proposals
4. Rank by compositeScore descending

Return ONLY valid JSON array, no markdown, no explanation.`,
        `Here are ${validated.length} validated market opportunities with their evidence:

${JSON.stringify(validated, null, 2)}

For each validated opportunity, create a ranked business proposal. Return ONLY a JSON array sorted by compositeScore (highest first):
[
  {
    "name": "punchy business name",
    "category": "one of: [Digital Products, Affiliate, Content, SaaS, Services, E-commerce, Community, AI-powered, Arbitrage]",
    "tagline": "one sharp sentence",
    "pitch": "3-4 sentences — the opportunity, why now, why zero capital works",
    "startupCapital": "€0",
    "timeToFirstRevenue": "realistic estimate",
    "automationScore": 75,
    "earningsPotential": "€500-3000/mo",
    "firstStep": "single most important action TODAY",
    "marketSignal": "the specific trend/data point",
    "targetAudience": "specific who-pays description",
    "revenueModel": "exactly how money is made",
    "zeroCapitalMechanism": "specifically why €0 to start",
    "competitionLevel": "Low/Medium/High with reason",
    "geographicFocus": "where or Global",
    "compositeScore": 82,
    "rank": 1,
    "scoreBreakdown": {
      "timingUrgency": 90,
      "marketGapSize": 85,
      "zeroCapitalFeasibility": 75,
      "automationPotential": 70,
      "revenueSpeed": 80
    },
    "validationData": {
      "competitors": [{"name": "X", "pricing": "$Y/mo", "weakness": "Z"}],
      "tamEstimate": "$X.XB",
      "demandProof": ["proof1", "proof2"],
      "timingWindow": "why now",
      "freeTools": ["tool1", "tool2"]
    }
  }
]${doNotRepeat}

Return ONLY the JSON array. No markdown fences.`
      );

      let scored = extractJSON(scoredText);

      if (!scored || !Array.isArray(scored)) {
        const retryText = await callClaude(
          apiKey,
          "Return ONLY a valid JSON array. No markdown, no explanation, no code fences.",
          `Fix this into a valid JSON array:\n${scoredText}\nReturn ONLY the JSON array.`
        );
        scored = extractJSON(retryText);
      }

      if (scored && Array.isArray(scored)) {
        // Sort by compositeScore descending
        scored.sort((a, b) => (b.compositeScore || 0) - (a.compositeScore || 0));

        const newIdeas = scored.map((item, idx) => ({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          ...item,
          automationScore: parseInt(item.automationScore) || 50,
          compositeScore: parseInt(item.compositeScore) || 50,
          rank: idx + 1,
          scoreBreakdown: item.scoreBreakdown || {},
          validationData: item.validationData || {},
          status: "pending",
          revisions: 0,
          aiRevisionNote: null,
          pipeline: null,
          pdfReady: false,
          pdfGenerating: false,
        }));
        setIdeas((prev) => [...newIdeas, ...prev]);
      } else {
        setError("Wave 3 failed: Could not parse scored results. Try scanning again.");
      }
    } catch (err) {
      setError(err.message);
    }

    setScanning(false);
    setScanWave(0);
    setScanSignals([]);
    setScanPhase("");
    setScanProgress("");
  };

  // ─── Approve ───
  const handleApprove = async (id) => {
    setIdeas((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "approved", pdfGenerating: true } : i))
    );

    const idea = ideas.find((i) => i.id === id);
    if (!idea) return;

    try {
      // Pipeline Call 1: Research tools
      const toolsResearch = await callClaude(
        apiKey,
        `You are an expert automation architect. Search for current free tools, platforms, and resources that would be needed to build and run this specific business. Look for: free tiers of automation platforms (Make.com, n8n, Zapier), free marketing tools, free CRM options, free hosting, relevant APIs, and any other free resources specifically useful for this business type.`,
        `Research free tools and automation options for this business:\nName: ${idea.name}\nCategory: ${idea.category}\nRevenue Model: ${idea.revenueModel}\nTarget Audience: ${idea.targetAudience}\n\nFind specific free tools and their current free tier limits.`,
        [{ type: "web_search_20250305", name: "web_search" }]
      );

      // Pipeline Call 2: Full pipeline JSON
      const pipelineText = await callClaude(
        apiKey,
        `You are an expert automation architect and zero-capital business launcher with deep knowledge of free SaaS tools, automation platforms, and lean business operations. Design a complete operational playbook. Return ONLY valid JSON, no markdown, no explanation.`,
        `Using this research about free tools:\n${toolsResearch}\n\nAnd this business idea:\n${JSON.stringify(idea)}\n\nCreate a complete operational pipeline. Return ONLY valid JSON with this exact structure:\n{\n  "summary": "one sentence on how this runs on autopilot",\n  "steps": [{"stepNumber": 1, "title": "step title", "description": "detailed description", "tools": ["Tool1"], "humanInput": "none OR brief description", "frequency": "daily/weekly/per lead", "estimatedSetupTime": "2 hours", "freeAlternatives": "if primary tool costs money"}],\n  "reinvestTip": "first thing to reinvest profits into",\n  "marketAnalysis": {"signal": "core market signal", "marketSize": "TAM estimate", "growthRate": "if known", "competition": "detailed landscape", "timing": "why now", "whyNow": "expanded reasoning", "targetAudience": "detailed ICP"},\n  "businessModel": {"model": "type", "monetization": "exact mechanism", "valueProposition": "core value prop", "unfairAdvantage": "edge", "moat": "defensibility"},\n  "zeroCapital": {"firstStep": "day 1 action", "howZeroCapital": "detailed explanation", "freeTools": "complete list", "firstRevenuePath": "exact path to first payment", "bootstrap": "full bootstrap strategy"},\n  "toolStack": [{"name": "tool name", "purpose": "what it does", "freeLimit": "free tier details", "upgradeTrigger": "when to pay"}],\n  "roadmap": [{"period": "Week 1", "goal": "main goal", "tasks": ["task1", "task2", "task3", "task4"], "milestone": "key milestone"}],\n  "revenue": {"scenarios": [{"month": "Month 1", "conservative": "€X", "realistic": "€Y", "optimistic": "€Z", "reinvest": "what to reinvest"}], "reinvestmentPlan": "detailed strategy"},\n  "risks": [{"risk": "risk name", "severity": "Low/Medium/High", "probability": "Low/Medium/High", "mitigation": "specific strategy"}],\n  "kpis": [{"metric": "metric name", "target": "target value", "frequency": "how often", "action": "what to do if missed"}],\n  "scaling": {"phases": [{"name": "Phase 1: Validation", "trigger": "milestone", "description": "what this looks like", "actions": ["action1"]}], "longTermVision": "12-month vision"}\n}\n\nMake it have 7-8 pipeline steps minimum, 4 roadmap weeks minimum, 3 revenue scenario months minimum, 5+ risks, 6+ KPIs, 3 scaling phases. Return ONLY the JSON object. No markdown fences.`
      );

      let pipelineData = extractJSON(pipelineText);

      if (!pipelineData) {
        const retryText = await callClaude(
          apiKey,
          "Return ONLY valid JSON object. No markdown, no explanation, no code fences.",
          `Fix this into valid JSON:\n${pipelineText}`
        );
        pipelineData = extractJSON(retryText);
      }

      if (pipelineData) {
        setIdeas((prev) =>
          prev.map((i) =>
            i.id === id ? { ...i, pipeline: pipelineData, pdfReady: true, pdfGenerating: false } : i
          )
        );

        // Auto-generate PDF
        const updatedIdea = { ...idea, status: "approved", pipeline: pipelineData };
        try {
          generatePDF(updatedIdea, pipelineData);
        } catch (pdfErr) {
          console.error("PDF generation error:", pdfErr);
        }
      } else {
        setIdeas((prev) =>
          prev.map((i) =>
            i.id === id ? { ...i, pdfGenerating: false, error: "Failed to generate pipeline" } : i
          )
        );
      }
    } catch (err) {
      setIdeas((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, pdfGenerating: false, error: err.message } : i
        )
      );
    }
  };

  // ─── Decline ───
  const handleDecline = (id) => {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, status: "declined" } : i)));
  };

  // ─── Revise ───
  const handleRevise = async (id, feedback) => {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, status: "revising" } : i)));

    const idea = ideas.find((i) => i.id === id);
    if (!idea) return;

    try {
      const revisedText = await callClaude(
        apiKey,
        `You are an elite zero-capital business opportunity analyst. The user has provided feedback on a business proposal. Research specifically to address their concerns and return an improved version. Return ONLY valid JSON, no markdown, no explanation.`,
        `Original idea:\n${JSON.stringify(idea)}\n\nUser feedback: "${feedback}"\n\nSearch the web to address this feedback specifically. Then return an improved version of this business idea as a JSON object with the same fields plus a new field "aiRevisionNote" explaining what changed and why. Same schema:\n{\n  "name": "string", "category": "string", "tagline": "string", "pitch": "string",\n  "startupCapital": "€0", "timeToFirstRevenue": "string", "automationScore": "integer 0-100",\n  "earningsPotential": "string", "firstStep": "string", "marketSignal": "string",\n  "targetAudience": "string", "revenueModel": "string", "zeroCapitalMechanism": "string",\n  "competitionLevel": "string", "geographicFocus": "string",\n  "aiRevisionNote": "string explaining what changed based on feedback"\n}\n\nReturn ONLY the JSON object. No markdown fences.`,
        [{ type: "web_search_20250305", name: "web_search" }]
      );

      let revisedData = extractJSON(revisedText);

      if (!revisedData) {
        const retryText = await callClaude(
          apiKey,
          "Return ONLY valid JSON object. No markdown, no explanation.",
          `Fix this into valid JSON:\n${revisedText}`
        );
        revisedData = extractJSON(retryText);
      }

      if (revisedData) {
        setIdeas((prev) =>
          prev.map((i) =>
            i.id === id
              ? {
                  ...i,
                  ...revisedData,
                  automationScore: parseInt(revisedData.automationScore) || i.automationScore,
                  id: i.id,
                  status: "pending",
                  revisions: i.revisions + 1,
                  pipeline: i.pipeline,
                  pdfReady: i.pdfReady,
                  pdfGenerating: i.pdfGenerating,
                }
              : i
          )
        );
      } else {
        setIdeas((prev) =>
          prev.map((i) => (i.id === id ? { ...i, status: "pending", error: "Revision failed" } : i))
        );
      }
    } catch (err) {
      setIdeas((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: "pending", error: err.message } : i))
      );
    }
  };

  // ─── API Key Screen ───
  if (!apiKeySet) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: font.heading,
        }}
      >
        <GridOverlay />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 480, padding: 24 }}>
          <h1 style={{ fontSize: 48, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
            VENTURE<span style={{ color: C.accent }}>.ai</span>
          </h1>
          <p style={{ fontFamily: font.mono, fontSize: 12, color: C.dim, marginBottom: 32 }}>
            // autonomous zero-capital business builder
          </p>
          <div style={{ textAlign: "left" }}>
            <label style={{ fontFamily: font.mono, fontSize: 11, color: C.muted, display: "block", marginBottom: 6 }}>
              ANTHROPIC API KEY
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              style={{
                width: "100%",
                padding: "12px 14px",
                background: C.s1,
                border: `1px solid ${C.border}`,
                borderRadius: 4,
                color: C.text,
                fontFamily: font.mono,
                fontSize: 13,
                marginBottom: 14,
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && apiKey.trim()) setApiKeySet(true);
              }}
            />
          </div>
          <Btn
            color={C.accent}
            filled
            onClick={() => apiKey.trim() && setApiKeySet(true)}
            disabled={!apiKey.trim()}
            style={{ width: "100%", justifyContent: "center", padding: "12px 24px", fontSize: 14 }}
          >
            INITIALIZE ENGINE ↯
          </Btn>
          <p style={{ fontFamily: font.mono, fontSize: 10, color: C.dim, marginTop: 16 }}>
            Key is used client-side only. Never stored or transmitted elsewhere.
          </p>
        </div>
      </div>
    );
  }

  // ─── Main App ───
  const tabs = [
    { id: "scanner", label: "Scanner", badge: pendingCount },
    { id: "pipeline", label: "Pipeline", badge: pipelineCount },
    { id: "overview", label: "Overview", badge: null },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font.heading }}>
      <GridOverlay />

      {/* Top bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: `${C.bg}ee`,
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.border}`,
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: 0 }}>
          VENTURE<span style={{ color: C.accent }}>.ai</span>
        </h1>

        <div style={{ display: "flex", gap: 4 }}>
          {tabs.map((t) => (
            <div
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                fontFamily: font.mono,
                fontSize: 12,
                fontWeight: 600,
                padding: "7px 16px",
                borderRadius: 3,
                cursor: "pointer",
                background: tab === t.id ? `${C.accent}15` : "transparent",
                color: tab === t.id ? C.accent : C.muted,
                border: tab === t.id ? `1px solid ${C.accent}30` : "1px solid transparent",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s",
                letterSpacing: 1,
              }}
            >
              {t.label.toUpperCase()}
              {t.badge !== null && t.badge > 0 && (
                <span
                  style={{
                    background: C.accent,
                    color: "#080808",
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "1px 5px",
                    borderRadius: 2,
                    minWidth: 16,
                    textAlign: "center",
                  }}
                >
                  {t.badge}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "24px 20px", position: "relative", zIndex: 1 }}>
        {/* ═══ SCANNER TAB ═══ */}
        {tab === "scanner" && (
          <div>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
              <div>
                <h2 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>
                  AI is hunting for <span style={{ color: C.accent }}>zero-cost</span> ventures.
                </h2>
                <p style={{ fontFamily: font.mono, fontSize: 12, color: C.dim, margin: 0 }}>
                  // scanning global markets, trends & arbitrage gaps
                </p>
              </div>
              <Btn color={C.accent} filled onClick={handleScan} disabled={scanning}>
                {scanning ? (
                  <>
                    <span className="spinner" style={{ display: "inline-block", width: 12, height: 12, border: `2px solid #08080840`, borderTop: `2px solid #080808`, borderRadius: "50%" }} />
                    SCANNING...
                  </>
                ) : (
                  "↯ SCAN NOW"
                )}
              </Btn>
            </div>

            {/* Scan progress */}
            {scanning && (
              <WaveProgress
                currentWave={scanWave}
                scanSignals={scanSignals}
                scanProgress={scanProgress}
              />
            )}

            {/* Error */}
            {error && (
              <Callout borderColor={C.red} bg={`${C.red}10`} style={{ marginBottom: 16 }}>
                <p style={{ fontFamily: font.mono, fontSize: 11, color: C.red, margin: 0 }}>{error}</p>
              </Callout>
            )}

            {/* Idea cards */}
            {ideas.length === 0 && !scanning && (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  border: `1px dashed ${C.border}`,
                  borderRadius: 8,
                }}
              >
                <p style={{ fontFamily: font.mono, fontSize: 14, color: C.dim }}>
                  // no opportunities scanned yet
                </p>
                <p style={{ fontFamily: font.mono, fontSize: 12, color: C.dim, marginTop: 4 }}>
                  Hit SCAN NOW to unleash the AI market scanner
                </p>
              </div>
            )}

            {ideas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                apiKey={apiKey}
                onApprove={handleApprove}
                onDecline={handleDecline}
                onRevise={handleRevise}
              />
            ))}
          </div>
        )}

        {/* ═══ PIPELINE TAB ═══ */}
        {tab === "pipeline" && (
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: "0 0 6px" }}>
              Automation <span style={{ color: C.accent }}>Pipelines</span>
            </h2>
            <p style={{ fontFamily: font.mono, fontSize: 12, color: C.dim, margin: "0 0 24px" }}>
              // approved ventures with full operational playbooks
            </p>

            {ideas.filter((i) => i.status === "approved").length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  border: `1px dashed ${C.border}`,
                  borderRadius: 8,
                }}
              >
                <p style={{ fontFamily: font.mono, fontSize: 14, color: C.dim }}>// no pipelines yet</p>
                <p style={{ fontFamily: font.mono, fontSize: 12, color: C.dim, marginTop: 4 }}>
                  Approve an idea in the Scanner to generate a pipeline
                </p>
              </div>
            ) : (
              ideas
                .filter((i) => i.status === "approved")
                .map((idea) => <PipelineCard key={idea.id} idea={idea} />)
            )}
          </div>
        )}

        {/* ═══ OVERVIEW TAB ═══ */}
        {tab === "overview" && (
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: "0 0 24px" }}>
              System <span style={{ color: C.accent }}>Overview</span>
            </h2>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
              {[
                { label: "IDEAS SCANNED", value: ideas.length, color: C.accent },
                { label: "APPROVED", value: approvedCount, color: C.green },
                { label: "IN PIPELINE", value: pipelineCount, color: C.orange },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: C.s1,
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    padding: 20,
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontFamily: font.mono, fontSize: 10, color: C.dim, marginBottom: 8, letterSpacing: 1 }}>
                    {s.label}
                  </div>
                  <div style={{ fontFamily: font.heading, fontSize: 40, fontWeight: 800, color: s.color }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Process explanation */}
            <div
              style={{
                background: C.s1,
                borderLeft: `3px solid ${C.accent}`,
                borderRadius: "0 6px 6px 0",
                padding: 24,
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginTop: 0, marginBottom: 16 }}>
                How it works
              </h3>
              {[
                {
                  num: "01",
                  title: "AI scans live markets with web search",
                  desc: "Claude searches the web for trending niches, emerging platforms, Reddit communities, and market gaps in real-time.",
                },
                {
                  num: "02",
                  title: "You review and iterate",
                  desc: "Each opportunity is presented with full analysis. Send it back for revision with specific feedback, or approve it.",
                },
                {
                  num: "03",
                  title: "AI builds full automation pipeline",
                  desc: "On approval, Claude researches free tools and builds a complete step-by-step operational playbook.",
                },
                {
                  num: "04",
                  title: "PDF playbook generated for execution",
                  desc: "A professional multi-page PDF document is generated client-side with all details needed to launch.",
                },
              ].map((step) => (
                <div key={step.num} style={{ display: "flex", gap: 14, marginBottom: 16 }}>
                  <div
                    style={{
                      fontFamily: font.mono,
                      fontSize: 20,
                      fontWeight: 700,
                      color: C.accent,
                      minWidth: 36,
                    }}
                  >
                    {step.num}
                  </div>
                  <div>
                    <div style={{ fontFamily: font.heading, fontSize: 14, color: "#fff", fontWeight: 600, marginBottom: 3 }}>
                      {step.title}
                    </div>
                    <p style={{ fontFamily: font.mono, fontSize: 11, color: C.muted, margin: 0, lineHeight: 1.6 }}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
