# Software Requirements Specification (SRS) - TactIQ Studio v1.0

## 1. Introduction

### 1.1 Purpose
This document outlines the functional and non-functional requirements for TactIQ Studio, an automated football intelligence and broadcasting platform.

### 1.2 Scope
TactIQ Studio automates the ingestion of raw match data (structured or unstructured), performs complex tactical pattern recognition, generates context-aware narratives via generative AI, and provides a real-time broadcast HUD overlay.

### 1.3 Definitions and Acronyms
- **AI**: Artificial Intelligence (Generative).
- **HUD**: Heads-Up Display (Broadcast Overlay).
- **xG**: Expected Goals metric.
- **Normalization**: Converting diverse data inputs into a unified schema.

---

## 2. Overall Description

### 2.1 Product Perspective
TactIQ Studio is an intelligent middleware designed for professional broadcast environments. It bridges raw data feeds with human-readable tactical narratives.

### 2.2 User Characteristics
- **Tactical Analysts**: Require rigorous metric-driven insights.
- **Broadcast Producers**: Require punchy, concise, visual takeaways.
- **Casual Fans**: Require engaging, narrative-driven storytelling.

### 2.3 Operating Environment
- Web-based browser environment.
- Backend: Node.js/Express server in a cloud containerized environment.

### 2.4 Constraints
- Strict API usage constraints (rate limits).
- High demand for real-time processing and low latency.

---

## 3. Functional Requirements

### 3.1 Data Ingestion & Normalization
- **REQ-INGEST-01**: System shall support JSON, CSV, Excel, Word, and raw text paragraph uploads.
- **REQ-INGEST-02**: System shall utilize LLM-based parsing to extract structured events (`event_id`, `timestamp`, `team`, `player`, `event_type`, `zone`) from raw unstructured text.
- **REQ-INGEST-03**: System shall create synthetic "unstructured_log" events for data that cannot be parsed into structured format.
- **REQ-INGEST-04**: System shall normalize all events into a unified internal schema, sanitizing inputs of control characters and malicious scripts.

### 3.2 Computational Analytics
- **REQ-COMP-01**: System shall calculate Pass Completion Rate, Pass Distance, Pressure Intensity, and Player Speed (km/h) for every event batch.
- **REQ-COMP-02**: System shall compute an "xG" (Expected Goals) value for all shots.
- **REQ-COMP-03**: System shall calculate a Control vs. Chaos score based on event tempo.
- **REQ-COMP-04**: System shall trigger alerts for sprint bursts exceeding 30 km/h.
- **REQ-COMP-05**: All computational metrics shall return safe numerical defaults (0) in the event of missing input data.

### 3.3 AI Analysis & Reasoning
- **REQ-AI-01**: System shall synthesize a multi-stage analysis (Explain/Synthesize) using provided filtered events.
- **REQ-AI-02**: AI responses shall cite specific Event IDs [E#] used in the analysis.
- **REQ-AI-03**: System shall utilize real-time Google Search grounding for non-match queries to provide current, up-to-date football intelligence.
- **REQ-AI-04**: System shall implement a failover mechanism if the primary AI service (Azure) returns 404/Authentication errors, falling back to Gemini.
- **REQ-AI-05**: AI reasoning shall be constrained by a strict JSON schema directive.

### 3.4 Broadcast Interface (UI)
- **REQ-UI-01**: The UI shall provide a 5-stage pipeline strip indicating the status of the match data.
- **REQ-UI-02**: The UI shall be crash-proof; all components must utilize optional chaining and default value fallbacks for rendering.
- **REQ-UI-03**: The UI shall support dynamic language toggling for narrative generation.
- **REQ-UI-04**: The UI shall render a broadcast HUD overlay.

---

## 4. Non-Functional Requirements

### 4.1 Latency
- **REQ-LAT-01**: The total match analysis pipeline (from query to rendered JSON response) must complete within 90 seconds.

### 4.2 Reliability
- **REQ-REL-01**: The system must report actionable error messages (e.g., 429 Rate Limit) rather than failing silently or crashing.

### 4.3 Scalability
- **REQ-SCALE-01**: The API shall enforce a rate limit of 30 analysis requests per minute per IP address.

---

## 5. External Interfaces
- **API Endpoints**: `/api/health`, `/api/match`, `/api/analyze-match`.
- **Formatting**: All analysis responses must be strictly formatted JSON with `explain` and `synthesize` breakdown fields.
