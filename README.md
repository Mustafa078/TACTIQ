# TactIQ Studio - Match Intelligence & Web Search
- Node.js 20+ / Express backend (`backend/server.js`)
- React + Vite frontend (`src/App.jsx`)
- Google Gemini API Search Grounding (`@google/genai`)

## Deployment on Vercel
This repository is fully configured for Vercel deployment via `vercel.json`.
Set your environment variables in Vercel Project Settings:
- `GEMINI_API_KEY`: Your Google Gemini API key (starts with AIzaSy...)
- `AZURE_OPENAI_ENDPOINT` (optional): For Azure OpenAI match analysis mode
