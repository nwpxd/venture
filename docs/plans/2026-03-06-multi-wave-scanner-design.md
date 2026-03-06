# Multi-Wave Market Scanner Design

## Problem

The current scanner does 2 API calls (broad research, structure into JSON) and produces 2 generic proposals with no validation or ranking. Opportunities lack hard evidence and arrive unscored.

## Solution: 3-Wave Scan Architecture

Replace the 2-call flow with a 3-wave pipeline that sweeps, validates, and ranks.

## Wave 1 — Broad Trend Sweep

Single API call with web search. Scans 6 data channels simultaneously:

| Channel | What it looks for |
|---------|-------------------|
| Reddit/Communities | Subreddits with monetization gaps, growing communities with unmet needs |
| Product Hunt/Launches | New tools creating ecosystem opportunities, APIs just released |
| Google Trends | Spiking search terms with low competition |
| X/Twitter | Viral pain points, complaints about existing solutions |
| Regulatory/Policy | New laws or policy changes creating market openings |
| Seasonal/Timing | Upcoming events, cyclical demand windows |

**Output:** JSON array of 6-8 raw signals, each with `signal_name`, `channel_source`, `raw_evidence`, `opportunity_hint`, `urgency` (1-10).

## Wave 2 — Deep-Dive Validation

Up to 4 parallel API calls with web search. Takes the top 4 signals by urgency from Wave 1. Each call does targeted research:

- Real competitor names + pricing/weaknesses
- TAM estimate with actual data points
- Demand proof: community sizes, search volumes, spending signals
- Timing window: why this works now
- Zero-capital feasibility with specific free tools

**Output per signal:**
```json
{
  "signal": "original signal name",
  "validated": true/false,
  "competitors": [{"name": "...", "weakness": "..."}],
  "tamEstimate": "$2.3B growing 18% YoY",
  "demandProof": ["r/solopreneur 340k members asking for X", "Google Trends +240% in 90 days"],
  "timingWindow": "Platform Y just opened API access 2 weeks ago",
  "freeTools": ["tool1", "tool2"],
  "killReason": null
}
```

Signals with `validated: false` are killed. Only survivors proceed.

## Wave 3 — Scoring & Ranking

Single API call, no web search. Scores validated opportunities on 5 axes (0-100 each):

| Axis | Measures |
|------|----------|
| Timing Urgency | How quickly the window closes |
| Market Gap Size | How underserved the space is |
| Zero-Capital Feasibility | How truly free to start |
| Automation Potential | How much can run hands-off |
| Revenue Speed | How fast first euro arrives |

Structures into final business proposals with existing schema plus:
- `compositeScore` — weighted average of 5 axes
- `scoreBreakdown` — the 5 individual scores
- `validationData` — evidence from Wave 2
- `rank` — position (1 = best)

Output sorted by `compositeScore` descending. Typically 3-4 opportunities survive.

## UI Changes

### Scan Progress Tracker

Replaces single progress bar with 3-step visual:

```
[1 SWEEP ●━━] → [2 VALIDATE ○───] → [3 RANK ○───]
```

- Grey circle when pending
- Pulsing accent circle when active with phase text
- Green checkmark when complete
- Wave 2 shows sub-progress: `validating signal 2/4...`

### Card Enhancements

- `CONFIDENCE: 87` badge (accent color) top-right of each card
- Score breakdown as 5 mini horizontal bars below existing stats
- Expandable "Validation Evidence" section showing competitors, demand signals, timing window
- Cards render in rank order (highest score first)

### No Changes

Approve/decline/revise flow, pipeline tab, overview tab, PDF generation all stay as-is.

## State Changes

New state in `VentureApp`:

```
scanWave     — 0 (idle), 1, 2, or 3
scanSignals  — raw signals from Wave 1
scanProgress — "2/4" sub-progress for Wave 2
```

Existing `scanning`, `scanPhase`, `error` stay. Each idea object gains: `compositeScore`, `scoreBreakdown`, `validationData`.

## Error Handling

- **Wave 1 fails:** Full error, same as current
- **Wave 2 individual signal fails:** Signal dropped, others continue. All fail = error
- **Wave 3 fails:** Fall back to Wave 2 results unranked (scored at 50)
- **JSON parse failures:** Same retry mechanism (retry once, then error)

## API Cost

6 calls per scan (1 + 4 + 1) vs current 2. Roughly 3x cost but dramatically higher quality output.

## Scan Duration

~30-45 seconds vs ~15 seconds. Wave progress UI makes the wait feel purposeful.
