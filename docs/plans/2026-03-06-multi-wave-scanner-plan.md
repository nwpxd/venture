# Multi-Wave Scanner Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 2-call flat scanner with a 3-wave pipeline (sweep, validate, rank) that produces validated, scored, ranked opportunities.

**Architecture:** The `handleScan` function becomes a 3-wave pipeline. Wave 1 sweeps 6 data channels via web search and returns raw signals as JSON. Wave 2 validates top 4 signals in parallel with targeted web searches, killing weak ones. Wave 3 scores survivors on 5 axes and structures into final ranked proposals. New `WaveProgress` component shows real-time progress. `IdeaCard` gains confidence badge, score bars, and expandable validation evidence.

**Tech Stack:** React 18 (via CDN), Claude API with web search tool, single-file JSX app.

---

### Task 1: Add new state variables and WaveProgress component

**Files:**
- Modify: `venture.jsx:1282-1297` (VentureApp state declarations)
- Modify: `venture.jsx:168-183` (after GridOverlay, add WaveProgress component)

**Step 1: Add WaveProgress component after GridOverlay (line 183)**

Insert after the `GridOverlay` component closing (line 183):

```jsx
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
                  {isDone ? "✓" : w.num}
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
```

**Step 2: Add new state variables in VentureApp (after line 1291)**

After `const [scanPhase, setScanPhase] = useState("");` add:

```jsx
const [scanWave, setScanWave] = useState(0);
const [scanSignals, setScanSignals] = useState([]);
const [scanProgress, setScanProgress] = useState("");
```

**Step 3: Verify the app still renders**

Open `index.html` in a browser. Confirm no errors in console, app renders as before.

**Step 4: Commit**

```bash
git add venture.jsx
git commit -m "feat: add WaveProgress component and new scan state variables"
```

---

### Task 2: Replace handleScan with Wave 1 — Broad Trend Sweep

**Files:**
- Modify: `venture.jsx:1298-1362` (replace entire handleScan function)

**Step 1: Replace handleScan with the new 3-wave version**

Replace the `handleScan` function (lines 1299-1362) with:

```jsx
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
```

**Step 2: Verify scan works**

Open app in browser, enter API key, click SCAN NOW. Confirm 3 waves execute and cards appear with scores.

**Step 3: Commit**

```bash
git add venture.jsx
git commit -m "feat: replace handleScan with 3-wave architecture (sweep, validate, rank)"
```

---

### Task 3: Wire WaveProgress into the scanner tab UI

**Files:**
- Modify: `venture.jsx:1655-1663` (replace scan progress section)

**Step 1: Replace the scan progress UI**

Replace the scanning progress section (the block that starts `{scanning && (` around line 1655) with:

```jsx
            {/* Scan progress */}
            {scanning && (
              <WaveProgress
                currentWave={scanWave}
                scanSignals={scanSignals}
                scanProgress={scanProgress}
              />
            )}
```

This replaces the old single progress bar + phase text with the 3-step wave tracker.

**Step 2: Verify wave progress renders during scan**

Open app, start scan, confirm 3-step progress tracker appears with circles transitioning through states.

**Step 3: Commit**

```bash
git add venture.jsx
git commit -m "feat: wire WaveProgress component into scanner tab UI"
```

---

### Task 4: Add confidence badge and score breakdown to IdeaCard

**Files:**
- Modify: `venture.jsx:909-932` (card header area in IdeaCard)
- Modify: `venture.jsx:988-1004` (after metrics grid, before secondary metrics)

**Step 1: Add confidence badge to card header**

In `IdeaCard`, inside the header div (around line 922-932), add the confidence badge after `<StatusChip>`. Replace the status chip line:

```jsx
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
```

**Step 2: Add score breakdown bars after the metrics grid**

After the 4-metric grid (after its closing `</div>` around line 988), and before the secondary metrics grid, add:

```jsx
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
```

**Step 3: Verify badge and bars render on cards**

Open app, scan, confirm cards show confidence badge in header and 5 score bars below metrics.

**Step 4: Commit**

```bash
git add venture.jsx
git commit -m "feat: add confidence badge and score breakdown bars to IdeaCard"
```

---

### Task 5: Add expandable validation evidence section to IdeaCard

**Files:**
- Modify: `venture.jsx:871-874` (add state for expanded validation in IdeaCard)
- Insert after the "First step" callout (around line 1024), before AI revision note

**Step 1: Add toggle state to IdeaCard**

In the IdeaCard component, after the existing state declarations (line 874), add:

```jsx
  const [showValidation, setShowValidation] = useState(false);
```

**Step 2: Add validation evidence section**

After the "First step" callout (after line 1024), before the AI revision note section, add:

```jsx
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
```

**Step 3: Verify expandable section works**

Open app, scan, click "VALIDATION EVIDENCE" on a card. Confirm it expands/collapses showing competitors, TAM, demand proof, timing, tools.

**Step 4: Commit**

```bash
git add venture.jsx
git commit -m "feat: add expandable validation evidence section to IdeaCard"
```

---

### Task 6: Update the Overview tab "How it works" section

**Files:**
- Modify: `venture.jsx:1782-1803` (overview tab steps array)

**Step 1: Update the steps to reflect 3-wave architecture**

Replace the steps array in the overview tab with:

```jsx
              {[
                {
                  num: "01",
                  title: "Wave 1: AI sweeps 6 data channels",
                  desc: "Claude searches Reddit, Product Hunt, Google Trends, X/Twitter, regulatory changes, and seasonal patterns simultaneously.",
                },
                {
                  num: "02",
                  title: "Wave 2: Deep-dive validation",
                  desc: "Top signals get validated in parallel — real competitors, TAM estimates, demand proof, and timing windows. Weak signals are killed.",
                },
                {
                  num: "03",
                  title: "Wave 3: Score & rank",
                  desc: "Survivors are scored on 5 axes (timing, market gap, feasibility, automation, revenue speed) and ranked. Best opportunity surfaces first.",
                },
                {
                  num: "04",
                  title: "You review, iterate, approve",
                  desc: "Each opportunity shows its confidence score and validation evidence. Send it back for revision or approve to generate a full automation pipeline + PDF.",
                },
              ].map((step) => (
```

**Step 2: Verify overview tab text updates**

Open app, navigate to overview tab, confirm new descriptions render.

**Step 3: Commit**

```bash
git add venture.jsx
git commit -m "feat: update overview tab to describe 3-wave scan architecture"
```

---

### Task 7: Final integration test and cleanup

**Files:**
- Review: `venture.jsx` (full file)

**Step 1: Full end-to-end test**

Open `index.html` in browser:
1. Enter API key
2. Click SCAN NOW
3. Verify Wave 1 shows sweep progress with 3-step tracker
4. Verify Wave 2 shows signal tags appearing and sub-progress
5. Verify Wave 3 shows scoring phase
6. Verify cards appear ranked by composite score
7. Verify confidence badge shows on each card
8. Verify score breakdown bars render
9. Click "VALIDATION EVIDENCE" — verify it expands with data
10. Click APPROVE on one card — verify pipeline generation still works
11. Navigate to Pipeline tab — verify pipeline card renders
12. Navigate to Overview tab — verify updated descriptions

**Step 2: Commit final state**

```bash
git add venture.jsx
git commit -m "feat: complete multi-wave scanner — sweep, validate, rank"
```
