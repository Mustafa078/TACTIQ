# TactIQ Studio

TactIQ is a Premier League match-intelligence studio. The React dashboard sends
questions and the current match dataset to an Express API, which asks an Azure
OpenAI GPT-4o deployment for a strict four-stage analysis: Filter, Compute,
Explain, and Synthesize.

## Requirements

- Node.js 22 or newer
- A Microsoft Foundry project with a configured TactIQ agent, or an Azure
  OpenAI resource with a deployed GPT-4o model

## Configure Azure OpenAI

Copy `backend/.env.example` to `backend/.env`. The recommended Foundry-agent
configuration uses `FOUNDRY_PROJECT_ENDPOINT` and `TACTIQ_AGENT_NAME`.
Authenticate locally with `az login`, or set the service-principal variables
`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, and `AZURE_CLIENT_SECRET` in the private
`.env` file. The signed-in identity needs permission to use the project and
agent.

Alternatively, configure `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, and
`AZURE_DEPLOYMENT_NAME` to call a model deployment directly. Both a resource
root and an endpoint ending in `/openai/v1` are supported. The deployment name
must exactly match the name shown in Azure AI Foundry. Keep populated `.env`
files private.

## Run locally

In one terminal:

```powershell
cd backend
npm install
npm start
```

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`). Vite proxies
`/api` requests to the backend on port 5000; set `PORT` in `backend/.env` if
the backend should use another port and update the proxy in `frontend/vite.config.js`.

## Experience

TACTIQ opens through a scroll-scrub scene. The sticky `100dvh` video stage
reveals the studio as the user scrolls. Casual conversation is available from
both source modes:

- Match data analyzes uploaded or bundled synthetic event JSON.
- Football data retrieves structured fixtures and standings from API-Football.
- Greetings and casual conversation remain integrated inside Match data and Web.

The scrub uses `frontend/public/match-play.mp4`; restore that media file from
the original asset when setting up another machine.

## API

- `GET /api/health` — backend health check.
- `GET /api/match` — bundled synthetic match fixture.
- `POST /api/analyze-match` — accepts `{ "userQuery": "...", "sourceMode": "match|web", "matchData": {} }`.
  Match mode requires JSON event data. Web mode does not. Casual prompts are
  handled conversationally within either selected source mode.

The request body is limited to 1 MB and questions are limited to 1,000
characters. API-Football requires `API_FOOTBALL_KEY` and optional
`API_FOOTBALL_HOST` in `backend/.env`. Never expose the provider key with a
browser-facing `VITE_` variable.

## Match analysis pipeline

The backend sorts events chronologically, selects query-relevant events plus
nearby sequence context, and computes available match metrics deterministically
before calling Azure OpenAI. GPT-4o is used for tactical explanation and the
broadcast-ready summary, not for arithmetic. Responses include the selected
source event IDs and an evidence-quality indicator; unsupported event citations
are removed. Missing source fields are reported as unavailable rather than
estimated.

The chat also offers common match questions as one-click shortcuts after the
first question has been sent. The shortcuts adapt to the fixture's team names.

## Checks

```powershell
cd backend
npm test
```

```powershell
cd frontend
npm run build
```
