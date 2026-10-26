# Google Gemini Search Grounding & Web Intelligence Integration

Replace the external API-Football dependency with native Google Gemini 3.8 Flash real-time Google Search Grounding for live football and fixture queries, while retaining Azure OpenAI for structured tactical match event analysis.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed during the interactive clarification phase:

- **Web Mode Data Provider**: Google Gemini 3.8 Flash with live Google Search grounding (`tools: [{ googleSearch: {} }]`), deprecating and removing API-Football (`API_FOOTBALL_KEY` and RapidAPI dependency).
- **Match Mode Reasoning**: Retain Azure AI (Foundry Agent / Azure OpenAI) as the primary engine for analyzing structured match event timelines, preserving the 4-stage pipeline (Filter, Compute, Explain, Synthesize).
- **Source Display Experience**: Rich, interactive source cards in the analysis view displaying publisher titles, verified source domains, and outbound links alongside the grounded synthesis.

---

## 1. Overview & Core Concept

- **What It Does**: Upgrades TactIQ's Web search mode from a rigid API-Football fixture lookup to an open, live football intelligence engine. Users can ask questions about live matches, recent results, team news, tactical trends, and transfer updates. Gemini browses current web sources and returns verified answers with citations and clickable web cards.
- **Target Audience**: Match analysts, broadcasters, and football fans looking for real-time match context and verified post-match news.
- **Key Value**: Eliminates fragile third-party API rate limits and key constraints by leveraging Google Search grounding directly through the official `@google/genai` SDK on the server.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Mode Switch**: User clicks the "Web Search" mode tab in the top query bar. The studio adapts its suggestion chips to live football questions (e.g., *"Real Madrid vs Barcelona recent match breakdown"*, *"Premier League table and top scorers"*, *"Injury report ahead of North London derby"*).
2. **Query Submission**: User submits a query. The UI transitions into a pulse loading state indicating *"Searching live football sources..."*.
3. **Grounded Narrative**: The answer is rendered in clean broadcast prose with numerical or inline citations.
4. **Interactive Source Cards**: Directly beneath the response, a grid of structured source cards displays the publisher favicon/domain, article headline, and outbound link with hover elevation.

### Visual Identity & Theme
- **Theme**: High-density broadcast studio aesthetic matching existing dark slate canvas (`#080b10` background, `#121824` cards, `#1e293b` subtle hairline borders).
- **Typography Pairing**: `DM Sans` for body reading paired with `Space Grotesk` for headlines and display elements; `font-mono tabular-nums` for match scores and minutes.
- **Source Card Component**:
  - Unboxed metadata with subtle dot separators (`Domain · Live Search Source`).
  - Single-line title truncation to avoid awkward wrap.
  - Hover transition (`translate-y-[-1px]`, border glow).
  - External link icon from `lucide-react`.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Full-Stack Gemini Google Search Grounding**
  - *Chosen Approach*: Execute `@google/genai` `models.generateContent` with `{ tools: [{ googleSearch: {} }] }` strictly on the backend (`server.js`).
  - *Why*: Protects `GEMINI_API_KEY` from browser exposure, supports robust grounding metadata parsing, and formats sources before sending them to the client.
  - *Alternatives Considered*: Client-side search or REST scraping. Discarded due to security violations and bot-blocking.

- **Decision 2: Separation of Web Mode vs. Match Mode**
  - *Chosen Approach*: Web mode uses Gemini Search Grounding. Match mode continues to use Azure OpenAI / Foundry Agent to evaluate recorded synthetic events (`[E12]`, pass distance, xG), with our built-in deterministic fallback if Azure credentials are unconfigured.
  - *Why*: Honors user requirement to keep Azure OpenAI for match data while upgrading web search to Gemini.

- **Decision 3: Complete Removal of API-Football**
  - *Chosen Approach*: Strip all RapidAPI / API-Football network routines, headers, and environment variables from `.env.example`, `server.js`, and test suites.
  - *Why*: Removes dead code, eliminates 502 RapidAPI downtime errors, and simplifies deployment.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   TactIQ Frontend                      │
│        (React SPA + Tailwind CSS + Lucide Icons)       │
└──────────────────────────┬─────────────────────────────┘
                           │ POST /api/analyze-match
                           │ { userQuery, sourceMode }
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Express Server                       │
│                   (/backend/server.js)                 │
└────────────┬─────────────────────────────┬─────────────┘
             │                             │
    sourceMode === "web"          sourceMode === "match"
             │                             │
             ▼                             ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│     @google/genai        │  │     Azure OpenAI         │
│   (gemini-3.8-flash)     │  │   (Foundry Agent / GPT)  │
│  tools: [googleSearch]   │  │   4-Stage Pipeline       │
└────────────┬─────────────┘  └────────────┬─────────────┘
             │                             │
             ▼                             ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│  Grounding Chunks & Web  │  │  Tactical Breakdown      │
│  Sources + Narrative     │  │  (Explain + Synthesize)  │
└────────────┬─────────────┘  └────────────┬─────────────┘
             │                             │
             └─────────────┬───────────────┘
                           │ JSON Response
                           ▼
┌────────────────────────────────────────────────────────┐
│               Interactive Studio UI                    │
│      (Grounded Source Cards + Tactical Analysis)       │
└────────────────────────────────────────────────────────┘
```

### Data Structures

#### Web Analysis Response
```json
{
  "success": true,
  "kind": "web",
  "answer": "Arsenal defeated Tottenham 3-2 in a thrilling contest...",
  "sources": [
    {
      "title": "Arsenal vs Tottenham Hotspur - Match Report",
      "uri": "https://www.bbc.com/sport/football/...",
      "domain": "bbc.com"
    }
  ]
}
```

### Modified Components
- **`backend/server.js`**:
  - Remove `apiFootballQuery`, `sanitizeApiFootballSearch`, `findTeam`, `teamSearchCandidates`.
  - Add `searchWebWithGemini(userQuery)` utilizing `@google/genai` and `googleSearch`.
  - Return formatted `sources` extracted from `groundingMetadata.groundingChunks`.
- **`src/App.jsx`**:
  - Update `AnalysisCard` to render interactive web source cards when `kind === "web"`.
  - Remove API-Football references in descriptions and placeholder suggestions.
- **`backend/test/server.test.js`**:
  - Replace API-Football mock tests with Gemini search grounding tests and contract verification.
- **`.env.example`**:
  - Clean out `API_FOOTBALL_KEY` and `API_FOOTBALL_HOST`.
