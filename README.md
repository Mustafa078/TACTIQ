# TactIQ Studio

TactIQ Studio is an elite, real-time football intelligence engine designed for broadcast studios and tactical analysts. It automates the ingestion, interpretation, and visualization of football match data, turning raw match logs into broadcast-ready tactical insights.

## Core Features

- **Versatile Data Ingestion**: Supports structured JSON and unstructured match narratives via AI-driven parsing.
- **5-Stage Tactical Pipeline**:
  1. **Ingest**: Automated event normalization (passes, shots, pressures).
  2. **Interpret**: Pattern engine computing metrics like xG, pass difficulty, and sprint thresholds (>30km/h).
  3. **Explain**: AI-driven tactical context with event citations ([E#]).
  4. **Render**: Live broadcast HUD overlay for studio commentary.
  5. **Personalize**: Multi-language storytelling and fan-mode personalization.
- **Real-Time Intelligence**: Grounded in live web search data to provide current season stats, fixtures, and news without knowledge cutoffs.
- **Studio-Grade Summaries**: Generates comprehensive, multi-paragraph tactical analyses on command.

## Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, Lucide Icons.
- **Backend**: Express.js (Node.js).
- **AI Brain**: GPT mini from foundry that acts as the brain.
- **Vs Code integrated Co-pilot for creating the whole structure of the application.
- Used Microsoft Azure workflow.
- **AI Integration**: @google/genai for web search grounding.
- **Testing**: Node.js built-in test runner.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables in `.env` (ensure `GEMINI_API_KEY` is set).
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Run unit tests:
   ```bash
   npm test
   ```
