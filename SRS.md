# Software Requirements Specification (SRS): TactIQ Studio

## 1. Introduction
TactIQ Studio is a platform designed to provide elite-level tactical football analysis for broadcast media and professional scouts. It bridges the gap between raw data and understandable, broadcast-quality storytelling.

## 2. Overall Description
TactIQ acts as an intelligent middleware between raw match events and the broadcast desk. It processes varied input formats, calculates high-level tactical metrics, and allows users to query this data via natural language.

## 3. Functional Requirements

### 3.1 Data Ingestion
- **Requirement**: The system shall accept match data in JSON, CSV, Excel, Word, or unstructured text formats.
- **Requirement**: The system shall automatically normalize diverse input into a unified internal event JSON structure.

### 3.2 Tactical Analysis Pipeline
- **Requirement**: The system shall compute metrics including Pass Difficulty, Pressure Intensity, Sprint Speed (km/h), and Expected Goals (xG).
- **Requirement**: The system shall generate tactical narratives including "Explain" and "Synthesize" components.

### 3.3 Natural Language Querying
- **Requirement**: Users shall query the match data using natural language.
- **Requirement**: The system shall provide citations ([E#]) for tactical claims based on underlying match events.

### 3.4 Live Grounding
- **Requirement**: The system shall perform real-time web searches to provide current season context (standings, scores, fixtures).

## 4. Non-Functional Requirements

### 4.1 Reliability & Resilience
- **Requirement**: The system shall be crash-proof against malformed or missing data fields using optional chaining and default fallback values.
- **Requirement**: The system shall implement multi-provider failover (Gemini) to ensure availability if primary providers fail.

### 4.2 Performance
- **Requirement**: Tactical analysis queries shall return a response within 90 seconds.
- **Requirement**: The system shall enforce rate limiting to manage API quota consumption.

## 5. System Constraints
- **Environment**: Node.js backend with Express, Vite frontend.
- **AI Model**: Gemini 3.8 Flash for text generation and search grounding.
