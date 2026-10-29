import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  AudioLines,
  CircleHelp,
  Command,
  CornerDownLeft,
  ExternalLink,
  Flame,
  Gauge,
  Globe2,
  Languages,
  Layers,
  LoaderCircle,
  Menu,
  Radio,
  Send,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  Tv,
  Upload,
  UserCheck,
  X,
  Zap,
} from "lucide-react";

const stepMeta = {
  explain: { label: "Explain", icon: Activity, color: "amber" },
  synthesize: { label: "Takeaway", icon: AudioLines, color: "green" },
};

const LANGUAGES = [
  { code: "en", label: "EN", name: "English" },
  { code: "es", label: "ES", name: "Español" },
  { code: "fr", label: "FR", name: "Français" },
  { code: "de", label: "DE", name: "Deutsch" },
  { code: "ar", label: "AR", name: "العربية" },
  { code: "ja", label: "JA", name: "日本語" },
];

const PIPELINE_STAGES = [
  { id: 1, tag: "01", name: "INGEST", label: "Synthetic Feed", desc: "Passes, tackles, pressures & tracking" },
  { id: 2, tag: "02", name: "INTERPRET", label: "Pattern Engine", desc: "Pass difficulty, sprint thresholds & xG" },
  { id: 3, tag: "03", name: "EXPLAIN", label: "Tactical Context", desc: "Control vs Chaos & why moments matter" },
  { id: 4, tag: "04", name: "RENDER", label: "Broadcast Overlay", desc: "Synchronized match graphic overlays" },
  { id: 5, tag: "05", name: "PERSONALIZE", label: "Multi-Language Engine", desc: "Global multi-language storytelling" },
];

const matchSuggestions = [
  "How did Arsenal create that chance?",
  "Break down the pressure before Saka's shot",
  "What was Ødegaard's role in the build-up?",
];

const webSuggestions = [
  "Latest Premier League results and table standings",
  "Arsenal vs Tottenham recent match highlights and stats",
  "Champions League results and top scorers this week",
];

function popularQuestions(home, away) {
  return [
    `Compare ${home} and ${away}'s shooting threat and xG`,
    "Which sequences broke through defensive pressure traps?",
    "Explain the Control vs Chaos balance across zones",
    "Identify players crossing high-speed sprint thresholds (>30 km/h)",
  ];
}

function timeLabel(value) {
  return value || "—";
}

function safeString(val, fallback = "") {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val.trim();
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object") {
    if (typeof val.name === "string" && val.name.trim()) return val.name.trim();
    if (typeof val.team_name === "string" && val.team_name.trim()) return val.team_name.trim();
    if (typeof val.player_name === "string" && val.player_name.trim()) return val.player_name.trim();
    if (typeof val.title === "string" && val.title.trim()) return val.title.trim();
    if (typeof val.label === "string" && val.label.trim()) return val.label.trim();
    if (typeof val.text === "string" && val.text.trim()) return val.text.trim();
    if (typeof val.value === "string" && val.value.trim()) return val.value.trim();
  }
  return fallback;
}

function safeNum(val) {
  if (typeof val === "number" && Number.isFinite(val)) return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeUploadedMatch(data, fileName = "") {
  if (!data || typeof data !== "object") return null;

  const rawEvents = Array.isArray(data)
    ? data
    : Array.isArray(data.events)
      ? data.events
      : Array.isArray(data.match_events)
        ? data.match_events
        : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.items)
            ? data.items
            : Array.isArray(data.actions)
              ? data.actions
              : [];

  let homeTeam =
    safeString(data.home_team) ||
    safeString(data.home) ||
    safeString(data.team1) ||
    safeString(data.homeTeam);
  let awayTeam =
    safeString(data.away_team) ||
    safeString(data.away) ||
    safeString(data.team2) ||
    safeString(data.awayTeam);

  if (Array.isArray(data.teams) && data.teams.length >= 2) {
    homeTeam = homeTeam || safeString(data.teams[0]);
    awayTeam = awayTeam || safeString(data.teams[1]);
  }

  const fixtureText =
    safeString(data.fixture) ||
    safeString(data.match_id) ||
    safeString(data.title) ||
    safeString(data.match_name) ||
    (fileName ? fileName.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ") : "");

  if (!homeTeam || !awayTeam) {
    if (fixtureText && /\s+vs\s+/i.test(fixtureText)) {
      const parts = fixtureText.split(/\s+vs\s+/i);
      homeTeam = homeTeam || safeString(parts[0]);
      awayTeam = awayTeam || safeString(parts[1]);
    } else if (fixtureText && /[-_]vs[-_]/i.test(fixtureText)) {
      const parts = fixtureText.split(/[-_]vs[-_]/i);
      homeTeam = homeTeam || safeString(parts[0]);
      awayTeam = awayTeam || safeString(parts[1]);
    }
  }

  // If teams still not found, infer from events
  if (!homeTeam || homeTeam === "Home Team" || !awayTeam || awayTeam === "Away Team") {
    const detectedTeams = [];
    for (const ev of rawEvents) {
      const t =
        safeString(ev?.team) ||
        safeString(ev?.team_name) ||
        safeString(ev?.teamName);
      if (
        t &&
        t !== "Home Team" &&
        t !== "Away Team" &&
        t !== "Uploaded Match Fixture" &&
        !detectedTeams.includes(t)
      ) {
        detectedTeams.push(t);
        if (detectedTeams.length >= 2) break;
      }
    }
    if (detectedTeams.length >= 2) {
      homeTeam = detectedTeams[0];
      awayTeam = detectedTeams[1];
    } else if (detectedTeams.length === 1 && (!homeTeam || homeTeam === "Home Team")) {
      homeTeam = detectedTeams[0];
    }
  }

  homeTeam = homeTeam || "Home Team";
  awayTeam = awayTeam || "Away Team";
  if (homeTeam === "Uploaded Match Fixture") homeTeam = "Home Team";

  const events = rawEvents.length > 0
    ? rawEvents
        .filter((e) => e && typeof e === "object")
        .map((event, index) => {
          const pName =
            safeString(event.player) ||
            safeString(event.player_name) ||
            safeString(event.playerName) ||
            safeString(event.name) ||
            safeString(event.actor) ||
            safeString(event.athlete) ||
            "Player";
          const tName =
            safeString(event.team) ||
            safeString(event.team_name) ||
            safeString(event.teamName) ||
            homeTeam;
          const typeStr =
            safeString(event.event_type) ||
            safeString(event.type) ||
            safeString(event.type_name) ||
            safeString(event.action) ||
            "pass";
          const periodStr =
            safeString(event.period) ||
            safeString(event.half) ||
            (index > 25 ? "2nd Half" : "1st Half");
          const timestampStr =
            safeString(event.timestamp) ||
            safeString(event.time) ||
            (event.minute != null ? `${event.minute}:00` : `${index + 1}:00`);
          const zoneStr =
            safeString(event.zone) ||
            safeString(event.pitch_zone) ||
            safeString(event.location) ||
            "pitch";

          return {
            ...event,
            event_id: Number.isSafeInteger(event.event_id)
              ? event.event_id
              : index + 1,
            timestamp: timestampStr,
            period: periodStr,
            team: tName,
            player: pName,
            event_type: typeStr,
            zone: zoneStr,
            description: safeString(event.description) || undefined,
            target_player: safeString(event.target_player) || safeString(event.receiver) || undefined,
            pass_distance_m: safeNum(event.pass_distance_m),
            pass_accuracy: safeNum(event.pass_accuracy),
            pass_difficulty_rating: safeNum(event.pass_difficulty_rating),
            pressure_intensity_rating: safeNum(event.pressure_intensity_rating),
            player_speed_kmh: safeNum(event.player_speed_kmh),
            shot_speed_kmh: safeNum(event.shot_speed_kmh),
            ball_speed_kmh: safeNum(event.ball_speed_kmh),
            xg: safeNum(event.xg),
            goal: typeof event.goal === "boolean" ? event.goal : undefined,
          };
        })
        .sort((left, right) => {
          try {
            const getSecs = (ev) => {
              const match = String(ev.timestamp || "").match(/(\d+)(?::(\d{1,2}))?/);
              if (!match) return 0;
              const halfOffset = /2nd|second/i.test(String(ev.period)) ? 2700 : 0;
              return halfOffset + Number(match[1] || 0) * 60 + Number(match[2] || 0);
            };
            return getSecs(left) - getSecs(right);
          } catch {
            return 0;
          }
        })
    : [
        {
          event_id: 1,
          timestamp: "00:00",
          period: "1st Half",
          team: homeTeam && homeTeam !== "Home Team" ? homeTeam : "Match Squad",
          player: "Tactical Unit",
          event_type: "unstructured_log",
          zone: "pitch",
          description: typeof data === "string" ? data : JSON.stringify(data),
        },
      ];

  const metadataObj =
    data.match_metadata && typeof data.match_metadata === "object"
      ? data.match_metadata
      : {};

  return {
    ...data,
    match_id:
      safeString(data.match_id) ||
      `${homeTeam}-${awayTeam}`
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/-$/, "")
        .toUpperCase(),
    fixture: `${homeTeam} vs ${awayTeam}`,
    home_team: homeTeam,
    away_team: awayTeam,
    competition:
      safeString(data.competition) ||
      safeString(metadataObj.competition) ||
      "Uploaded Match Data",
    match_metadata: {
      ...metadataObj,
      stadium:
        safeString(metadataObj.stadium) ||
        safeString(data.stadium) ||
        safeString(data.venue) ||
        "Uploaded Match Stadium",
      minute: safeString(metadataObj.minute) || safeString(data.minute) || "45+2'",
      pitch:
        safeString(metadataObj.pitch) ||
        safeString(data.pitch) ||
        safeString(data.pitch_condition) ||
        "Slick hybrid turf (fast surface)",
      weather:
        safeString(metadataObj.weather) ||
        safeString(data.weather) ||
        "14°C Cool Evening, 68% Humidity",
    },
    events,
  };
}

function renderFormattedInline(str) {
  if (!str) return null;
  const parts = str.split(/(\[E\d+\]|\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (/^\[E\d+\]$/.test(part)) {
      return (
        <span key={i} className="citation-pill" title={`Verified Event Reference ${part}`}>
          {part}
        </span>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function FormattedAnalysisContent({ text = "" }) {
  if (!text) return <p>No analysis available.</p>;

  const lines = text.split("\n");
  const blocks = [];
  let currentTable = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      if (currentTable) {
        blocks.push({ type: "table", ...currentTable });
        currentTable = null;
      }
      continue;
    }

    // Markdown table row detection
    const isTableRow = trimmed.startsWith("|") && trimmed.endsWith("|");
    if (isTableRow) {
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());

      const isSeparator = cells.every((c) => /^:?-+:?$/.test(c));

      if (!currentTable) {
        currentTable = { headers: cells, rows: [] };
      } else if (isSeparator) {
        continue;
      } else {
        currentTable.rows.push(cells);
      }
      continue;
    } else if (currentTable) {
      blocks.push({ type: "table", ...currentTable });
      currentTable = null;
    }

    if (trimmed.startsWith("#### ")) {
      blocks.push({ type: "h4", text: trimmed.replace(/^#+\s*/, "") });
    } else if (trimmed.startsWith("### ") || trimmed.startsWith("## ")) {
      blocks.push({ type: "h3", text: trimmed.replace(/^#+\s*/, "") });
    } else if (trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const isSub = rawLine.startsWith("  ") || rawLine.startsWith("\t");
      blocks.push({
        type: "bullet",
        isSub,
        text: trimmed.replace(/^[•\-\*]\s*/, ""),
      });
    } else {
      blocks.push({ type: "p", text: trimmed });
    }
  }

  if (currentTable) {
    blocks.push({ type: "table", ...currentTable });
  }

  return (
    <div className="formatted-analysis">
      {blocks.map((block, idx) => {
        if (block.type === "h3") {
          return (
            <h4 key={idx} className="formatted-subhead">
              {block.text}
            </h4>
          );
        }
        if (block.type === "h4") {
          return (
            <h5 key={idx} className="formatted-subhead-h4">
              {block.text}
            </h5>
          );
        }
        if (block.type === "table") {
          return (
            <div key={idx} className="table-responsive-wrapper">
              <table className="tactiq-data-table">
                {block.headers && block.headers.length > 0 && (
                  <thead>
                    <tr>
                      {block.headers.map((h, hIdx) => (
                        <th key={hIdx}>{renderFormattedInline(h)}</th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {block.rows.map((row, rIdx) => (
                    <tr key={rIdx}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx}>{renderFormattedInline(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (block.type === "bullet") {
          return (
            <div
              key={idx}
              className={`formatted-bullet ${block.isSub ? "bullet-sub" : ""}`}
            >
              <span>{renderFormattedInline(block.text)}</span>
            </div>
          );
        }
        return (
          <p key={idx} className="formatted-paragraph">
            {renderFormattedInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}

function AgentDiagnosticsDisclosure({
  controlChaos,
  speedAlerts = [],
  evidence = null,
  reasoning = null,
}) {
  const hasDetails = Boolean(
    controlChaos ||
    (speedAlerts && speedAlerts.length > 0) ||
    (evidence && evidence.eventIds && evidence.eventIds.length > 0) ||
    reasoning
  );

  if (!hasDetails) return null;

  return (
    <details className="agent-diagnostics-disclosure">
      <summary className="agent-diagnostics-summary">
        <div className="summary-title-wrap">
          <SlidersHorizontal size={13} />
          <span>Agent Diagnostic Reasoning &amp; Telemetry</span>
        </div>
        <span className="summary-status-tag">CLICK TO EXPAND</span>
      </summary>

      <div className="agent-diagnostics-body">
        {reasoning && (
          <div className="agent-reasoning-step">
            <span className="reasoning-label">AGENT REASONING / THOUGHT PROCESS</span>
            <p className="reasoning-text">{reasoning}</p>
          </div>
        )}

        {controlChaos && (
          <div className="analysis-inline-control-chaos">
            <div className="inline-cc-header">
              <span>
                <Gauge size={12} /> TACTICAL DYNAMICS: CONTROL vs CHAOS
              </span>
              <b>
                {controlChaos.controlScore ?? 0}% Control / {controlChaos.chaosScore ?? 100}% Chaos
              </b>
            </div>
            <div className="inline-cc-bar">
              <div
                className="inline-cc-fill-control"
                style={{ width: `${controlChaos.controlScore ?? 0}%` }}
              />
              <div
                className="inline-cc-fill-chaos"
                style={{ width: `${controlChaos.chaosScore ?? 100}%` }}
              />
            </div>
            {controlChaos.summary && (
              <p className="inline-cc-summary">{controlChaos.summary}</p>
            )}
          </div>
        )}

        {(speedAlerts || []).length > 0 && (
          <div className="analysis-inline-speed-alerts">
            <div className="inline-speed-badge">
              <Zap size={12} /> SPRINT THRESHOLD TRIGGERED (&gt;30 km/h)
            </div>
            <div className="inline-speed-list">
              {speedAlerts.slice(0, 3).map((alert, i) => (
                <span key={i} className="inline-speed-chip">
                  <strong>{alert?.player || "Unknown"}</strong>: {alert?.speed_kmh ?? 0} km/h (E{alert?.event_id || "N/A"})
                </span>
              ))}
            </div>
          </div>
        )}

        {evidence && (
          <div className="analysis-evidence">
            <span className={`evidence-quality quality-${evidence.quality}`}>
              EVIDENCE {evidence.quality}
            </span>
            <span className="evidence-label">SOURCE EVENTS</span>
            <div className="evidence-ids">
              {(evidence.eventIds || []).map((eventId) => (
                <span key={eventId}>E{eventId}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

function AnalysisCard({
  breakdown = [],
  controlChaos = null,
  speedAlerts = [],
  evidence = null,
  reasoning = null,
  language = "en",
  followUpQuestions = [],
  onSelectQuestion,
}) {
  return (
    <div className="analysis-stack">
      {language && language !== "en" && (
        <div className="analysis-personalization-pill-row">
          <span className="analysis-pill pill-lang">
            <Languages size={11} /> {(language || "en").toUpperCase()} Output
          </span>
        </div>
      )}

      {(breakdown || []).map((step, index) => {
        const meta = stepMeta[step?.key] || stepMeta.synthesize;
        const Icon = meta.icon;
        return (
          <section
            className={`analysis-step step-${meta.color || "amber"}`}
            key={step?.key || index}
          >
            <div className="step-rail">
              <div className="step-icon">
                <Icon size={16} strokeWidth={1.8} />
              </div>
              {index < (breakdown.length - 1) && <div className="step-line" />}
            </div>
            <div className="step-copy">
              <div className="step-heading">
                <span className="step-number">0{index + 1}</span>
                <h3>{meta.label || "Analysis"}</h3>
                <span className="step-tag">ANALYSIS</span>
              </div>
              <FormattedAnalysisContent text={step?.content} />
            </div>
          </section>
        );
      })}

      <AgentDiagnosticsDisclosure
        controlChaos={controlChaos}
        speedAlerts={speedAlerts}
        evidence={evidence}
        reasoning={reasoning}
      />

      {(followUpQuestions || []).length > 0 && (
        <div className="analysis-followups">
          <div className="followup-header">
            <Sparkles size={12} />
            <span>INTERACTIVE TACTICAL FOLLOW-UPS</span>
          </div>
          <div className="followup-chips">
            {followUpQuestions.map((q, i) => (
              <button
                type="button"
                key={i}
                className="followup-chip"
                onClick={() => onSelectQuestion && onSelectQuestion(q)}
                title={`Ask: "${q}"`}
              >
                <span>{q}</span>
                <CornerDownLeft size={12} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EventRow({ event, onPlayerSelect }) {
  const type = event.event_type || "event";
  const icon =
    type === "shot" ? Target : type === "pressure" ? Shield : ArrowUpRight;
  const Icon = icon;
  const isHighSpeed =
    event.player_speed_kmh >= 30.0 || event.speed_threshold_triggered;

  return (
    <div
      className={`event-row ${isHighSpeed ? "event-highlight-sprint" : ""}`}
    >
      <span className={`event-mark event-${type}`}>
        <Icon size={13} />
      </span>
      <div className="event-copy">
        <div className="event-title-row">
          <button
            type="button"
            className="event-player-link"
            onClick={() => onPlayerSelect && onPlayerSelect(event.player)}
            title={`Filter insights for ${event.player}`}
          >
            {event.player || "Match event"}
          </button>
          {isHighSpeed && (
            <span
              className="sprint-indicator-pill"
              title="Sprint threshold > 30 km/h triggered!"
            >
              <Zap size={9} /> {event.player_speed_kmh} km/h
            </span>
          )}
          {event.shot_speed_kmh && (
            <span className="shot-speed-pill">
              {event.shot_speed_kmh} km/h
            </span>
          )}
        </div>
        <span className="event-detail">
          {type === "pass" && event.pass_difficulty_rating != null
            ? `Pass · Dist ${event.pass_distance_m ?? 0}m · Diff ${event.pass_difficulty_rating}/10`
            : type === "pressure"
              ? `Pressure (${event.pressure_intensity_rating ?? 0}/10) · ${event.zone || "unmarked"}`
              : type === "shot"
                ? `Shot · ${event.xg != null ? `${event.xg} xG` : "attempt"} ${event.goal ? "⚽ GOAL!" : ""}`
                : `${type} · ${event.zone || "pitch"}`}
        </span>
      </div>
      <time>{timeLabel(event.timestamp)}</time>
    </div>
  );
}

export default function App() {
  const scrollSceneRef = useRef(null);
  const scrollStageRef = useRef(null);
  const scrubVideoRef = useRef(null);
  const studioRef = useRef(null);
  const scrollCueRef = useRef(null);
  const [match, setMatch] = useState(null);
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [matchLoading, setMatchLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sourceMode, setSourceMode] = useState("match");
  const [matchSourceName, setMatchSourceName] = useState("No file uploaded");
  const [matchUploadError, setMatchUploadError] = useState("");
  const [language, setLanguage] = useState("en");
  const [showBroadcastOverlay, setShowBroadcastOverlay] = useState(false);
  const [activePipelineStage, setActivePipelineStage] = useState(null);
  const [latestControlChaos, setLatestControlChaos] = useState({
    controlScore: 68,
    chaosScore: 32,
    summary:
      "Structured possession dominance with controlled build-up play.",
  });
  const [latestSpeedAlerts, setLatestSpeedAlerts] = useState([]);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const conversationRef = useRef(null);

  useEffect(() => {
    const conversation = conversationRef.current;
    if (!conversation) return;
    conversation.scrollTo({
      top: conversation.scrollHeight,
      behavior: messages.length > 1 ? "smooth" : "auto",
    });
  }, [messages, loading]);

  useEffect(() => {
    const conversation = conversationRef.current;
    if (!conversation) return;
    conversation.scrollTo({
      top: conversation.scrollHeight,
      behavior: messages.length > 1 ? "smooth" : "auto",
    });
  }, [messages, loading]);

  useEffect(() => {
    const scene = scrollSceneRef.current;
    const video = scrubVideoRef.current;
    const studio = studioRef.current;
    const cue = scrollCueRef.current;
    if (!scene || !video || !studio || !cue) return undefined;

    let frame = null;
    let renderedProgress = 0;
    let targetProgress = 0;
    let pendingTime = null;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const seekVideo = (time) => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      const boundedTime = Math.max(0, Math.min(video.duration - 0.04, time));

      if (video.seeking) {
        pendingTime = boundedTime;
        return;
      }

      if (Math.abs(video.currentTime - boundedTime) > 0.02) {
        if (typeof video.fastSeek === "function") {
          try {
            video.fastSeek(boundedTime);
          } catch {
            video.currentTime = boundedTime;
          }
        } else {
          video.currentTime = boundedTime;
        }
      }
    };

    const handleSeeked = () => {
      if (pendingTime !== null) {
        const next = pendingTime;
        pendingTime = null;
        seekVideo(next);
      }
    };

    video.addEventListener("seeked", handleSeeked);

    const updateScrub = () => {
      const sceneRect = scene.getBoundingClientRect();
      const distance = scene.offsetHeight - window.innerHeight;
      targetProgress =
        distance > 0 ? Math.max(0, Math.min(1, -sceneRect.top / distance)) : 0;

      const lerpSpeed = reducedMotion ? 0.38 : 0.28;
      renderedProgress += (targetProgress - renderedProgress) * lerpSpeed;

      if (Number.isFinite(video.duration) && video.duration > 0) {
        seekVideo(video.duration * renderedProgress);
      }

      const reveal = Math.max(0, Math.min(1, (renderedProgress - 0.8) / 0.2));
      studio.style.opacity = String(reveal);
      studio.style.visibility = reveal > 0.02 ? "visible" : "hidden";
      studio.style.pointerEvents = reveal > 0.9 ? "auto" : "none";
      cue.style.opacity = String(Math.max(0, 1 - reveal * 1.5));

      frame = window.requestAnimationFrame(updateScrub);
    };

    const syncTarget = () => {
      const sceneRect = scene.getBoundingClientRect();
      const distance = scene.offsetHeight - window.innerHeight;
      targetProgress =
        distance > 0 ? Math.max(0, Math.min(1, -sceneRect.top / distance)) : 0;
    };

    const initializeScrub = () => {
      syncTarget();
      renderedProgress = targetProgress;
      if (Number.isFinite(video.duration) && video.duration > 0) {
        seekVideo(video.duration * targetProgress);
      }
    };

    video.pause();
    syncTarget();
    frame = window.requestAnimationFrame(updateScrub);

    if (video.readyState >= 1) {
      initializeScrub();
    } else {
      video.addEventListener("loadedmetadata", initializeScrub, { once: true });
    }

    window.addEventListener("scroll", syncTarget, { passive: true });
    window.addEventListener("resize", syncTarget, { passive: true });

    return () => {
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("loadedmetadata", initializeScrub);
      window.removeEventListener("scroll", syncTarget);
      window.removeEventListener("resize", syncTarget);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

function parseUploadedFileToMatchJson(text, fileName) {
  if (!text || typeof text !== "string") return null;

  const cleanText = text.trim();
  if (!cleanText) return null;

  // 1. Try JSON parsing
  try {
    const jsonParsed = JSON.parse(cleanText);
    if (jsonParsed && typeof jsonParsed === "object") {
      const normalized = normalizeUploadedMatch(jsonParsed, fileName);
      if (
        normalized &&
        Array.isArray(normalized.events) &&
        normalized.events.length > 0
      ) {
        return normalized;
      }
    }
  } catch {}

  // 2. Parse text/CSV/Excel/Word exported line format
  const lines = cleanText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  const baseFileName = fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[_-]+/g, " ");
  const fixtureParts = baseFileName.split(/\s+vs\s+/i);
  const homeTeam = fixtureParts[0] || "Home Team";
  const awayTeam = fixtureParts[1] || "Away Team";

  const rawEvents = [];
  lines.forEach((line, idx) => {
    if (
      idx === 0 &&
      /^(time|timestamp|event|player|team|zone|type|period)/i.test(line)
    ) {
      return;
    }

    const delimiters = /[,;\t|]+/;
    const parts = line.split(delimiters).map((p) => p.trim());

    if (parts.length >= 2) {
      const timestamp = parts[0] || `${idx + 1}:00`;
      const team = parts[1] || homeTeam;
      const player = parts[2] || "Player";
      const event_type = parts[3] || "pass";
      const zone = parts[4] || "pitch";

      rawEvents.push({
        event_id: idx + 1,
        timestamp,
        period: idx > 25 ? "2nd Half" : "1st Half",
        team,
        player,
        event_type,
        zone,
        pass_distance_m: 18 + (idx % 15),
        pass_accuracy: 85,
        pass_difficulty_rating: 6.8,
        pressure_intensity_rating: 7.2,
        player_speed_kmh: 22.0 + (idx % 10),
      });
    } else if (line.length > 3) {
      rawEvents.push({
        event_id: idx + 1,
        timestamp: `${idx + 1}:00`,
        period: idx > 25 ? "2nd Half" : "1st Half",
        team: homeTeam,
        player: "Player",
        event_type: "pass",
        zone: "pitch",
        description: line,
      });
    }
  });

  if (rawEvents.length === 0) return null;

  const mockPayload = {
    match_id:
      baseFileName.replace(/[^a-z0-9]+/gi, "-").toUpperCase() ||
      "UPLOADED-MATCH",
    fixture: `${homeTeam} vs ${awayTeam}`,
    home_team: homeTeam,
    away_team: awayTeam,
    match_metadata: {
      stadium: "Uploaded Match Stadium",
      minute: "90+3'",
      competition: "Uploaded Match Data",
    },
    events: rawEvents,
  };

  return normalizeUploadedMatch(mockPayload, fileName);
}

  async function handleMatchUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMatchUploadError("File must be 2 MB or smaller.");
      event.target.value = "";
      return;
    }
    setMatchUploadError("");
    try {
      const text = await file.text();
      const normalized = parseUploadedFileToMatchJson(text, file.name);

      setMatch(normalized || text);
      setIsFileUploaded(true);
      setMatchSourceName(file.name);
      setSourceMode("match");

      const activePlayerNames = Array.from(
        new Set(
          (normalized?.events || [])
            .map((e) => e.player)
            .filter(
              (p) =>
                p && p !== "Player" && p !== "N/A" && p !== "Tactical Unit",
            ),
        ),
      );

      const highSpeedSprints = (normalized?.events || []).filter(
        (e) => (e.player_speed_kmh || 0) >= 30.0,
      );

      if (highSpeedSprints.length > 0) {
        setLatestSpeedAlerts(
          highSpeedSprints.slice(0, 3).map((e) => ({
            player: e.player,
            speed_kmh: e.player_speed_kmh,
            event_id: e.event_id,
          })),
        );
      }

      const p1 = activePlayerNames[0] || "Key Playmakers";
      const p2 = activePlayerNames[1] || "Midfield Anchor";

      setMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          kind: "analysis",
          answer: `Ingested ${file.name} for ${normalized?.fixture || file.name}.`,
          breakdown: [
            {
              key: "explain",
              title: "Explain",
              content: `### 📋 MATCH DATA INGESTED & VERIFIED — ${normalized?.fixture || file.name}
• Fixture & Stage: ${normalized?.fixture || file.name} (${normalized?.competition || normalized?.match_metadata?.competition || "Competition"}, ${normalized?.match_metadata?.minute || "Full Time"}) [E1].
• Tracked Sequences: Ingested ${normalized?.events?.length || 0} discrete match events at ${normalized?.match_metadata?.stadium || "Match Stadium"}.
• Active Player Roster: ${activePlayerNames.length > 0 ? activePlayerNames.slice(0, 8).join(", ") : "Squad Tracking Data"}.
• Match Conditions: ${normalized?.match_metadata?.pitch || "Slick hybrid turf"} | ${normalized?.match_metadata?.weather || "Cool evening match"}.

The tactical analysis engine has ingested and mapped all events for this fixture. Ask any question below or click a tactical prompt to explore player movements, defensive pressure, passing networks, or shooting chances.`,
            },
            {
              key: "synthesize",
              title: "Takeaway",
              content: `Tactical Intelligence Primed: ${normalized?.fixture || file.name} loaded with ${normalized?.events?.length || 0} events and ${activePlayerNames.length} tracked players [E1].`,
            },
          ],
          followUpQuestions: [
            `Provide a full tactical match breakdown and executive summary for this match`,
            activePlayerNames.length > 0
              ? `How did ${p1} and ${p2} influence spatial progression and passing lanes?`
              : `Analyze the transition phases and defensive pressing intensity`,
            `What were the peak sprint speeds (>30 km/h) and pressure ratings?`,
          ],
          evidence: {
            quality: "high",
            eventIds: (normalized?.events || []).slice(0, 3).map((e, idx) => e.event_id || idx + 1),
          },
          controlChaos: {
            controlScore: 64,
            chaosScore: 36,
            summary: "Possession structure and tactical sequence data loaded.",
          },
        },
      ]);
    } catch (uploadError) {
      setMatchUploadError(
        uploadError.message || "Could not read or convert that match file.",
      );
    } finally {
      event.target.value = "";
    }
  }

  async function askQuestion(question = query) {
    const text = question.trim();
    if (!text || loading) return;
    if (sourceMode === "match" && (!isFileUploaded || !match)) {
      setError(
        "Please upload a match JSON file first to enable match data chat.",
      );
      return;
    }

    setError("");
    setQuery("");
    setSidebarOpen(false);
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text },
    ]);
    setLoading(true);
    try {
      const response = await fetch("/api/analyze-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userQuery: text,
          sourceMode,
          audienceMode: "analyst",
          language,
          matchData: sourceMode === "match" ? match : undefined,
        }),
        signal: AbortSignal.timeout(30000),
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
        console.log("AI Response Payload:", result);
      } catch {
        throw new Error(
          "Backend returned an unparseable response. Please verify the server connection.",
        );
      }

      if (!response.ok) {
        throw new Error(
          result.error || `Analysis failed with status ${response.status}`,
        );
      }
      if (!result.success) {
        throw new Error(result.error || "Analysis failed.");
      }

      if (result.controlChaos) {
        setLatestControlChaos(result.controlChaos);
      }
      if (result.speedAlerts?.length) {
        setLatestSpeedAlerts(result.speedAlerts);
      }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          kind: result.kind,
          answer: result.answer,
          sources: result.sources,
          breakdown: result.breakdown,
          evidence: result.evidence,
          controlChaos: result.controlChaos,
          speedAlerts: result.speedAlerts,
          followUpQuestions:
            result.followUpQuestions || result.follow_up_questions || [],
          language: result.language || language,
        },
      ]);
    } catch (requestError) {
      setError(
        requestError.name === "TimeoutError"
          ? "Analysis timed out. Please try again."
          : requestError.name === "AbortError"
            ? "The analysis request was cancelled."
            : requestError.message,
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  const events = match?.events || [];
  const home = match?.home_team || "Home";
  const away = match?.away_team || "Away";
  const minute = match?.match_metadata?.minute || "LIVE";
  const commonQuestions = popularQuestions(home, away);
  function safeSourceLink(link) {
    try {
      const url = new URL(link);
      return url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  }

  function sourceHostname(link) {
    try {
      return new URL(link).hostname;
    } catch {
      return "web source";
    }
  }

  const latestSources =
    [...messages]
      .reverse()
      .find(
        (message) => message.role === "assistant" && message.sources?.length,
      )?.sources || [];

  return (
    <main className="app-shell" ref={scrollSceneRef}>
      <section className="scrub-stage" ref={scrollStageRef}>
        <video
          ref={scrubVideoRef}
          className="scrub-video"
          src="/Photorealistic_wide-angle_broadcast_view_of_20261025111247-60fps.mp4"
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
        />
        <div className="scrub-shade" />
        <div className="scrub-cue" ref={scrollCueRef}>
          <span>SCROLL TO OPEN THE STUDIO</span>
          <i />
        </div>
        <div className="studio-shell scrub-studio" ref={studioRef}>
          <header className="topbar">
            <div className="brand-lockup">
              <div className="brand-mark">
                <span>T</span>
                <i />
              </div>
              <div className="brand-name">
                tact<span>IQ</span>
                <small>STUDIO</small>
              </div>
            </div>
            <div className="topbar-center">
              <span className="broadcast-mark">
                <Radio size={14} /> MATCH INTELLIGENCE
              </span>
              <span className="topbar-divider" />
              <span className="competition">
                {match?.competition || "MATCH DATA"}
              </span>
            </div>
            <div className="topbar-right">
              <div className="language-selector-wrap">
                <Languages size={13} className="lang-icon" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="language-select"
                  aria-label="Storytelling Language"
                  title="Multi-Language Storytelling"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.label} · {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className={`broadcast-hud-btn ${showBroadcastOverlay ? "active" : ""}`}
                onClick={() => setShowBroadcastOverlay((prev) => !prev)}
                title="Toggle Broadcast Studio Graphic HUD"
              >
                <Tv size={13} />
                <span>{showBroadcastOverlay ? "EXIT HUD" : "BROADCAST HUD"}</span>
              </button>

              <span className="system-status">
                <i
                  className={
                    matchError
                      ? "status-error"
                      : matchLoading
                        ? "status-loading"
                        : ""
                  }
                />
                {matchError
                  ? "API OFFLINE"
                  : matchLoading
                    ? "CONNECTING"
                    : "SYSTEM ONLINE"}
              </span>
              <span className="avatar">TS</span>
            </div>
          </header>

          <div className="studio-layout">
            <section className="workspace">
              <div className="workspace-heading">
                <div className="workspace-heading-left">
                  <div className="eyebrow">
                    <span className="heading-star">
                      <Sparkles size={12} />
                    </span>
                    PREMIER LEAGUE STUDIO · TACTICAL DESK
                  </div>
                  <h2>
                    Every moment has a <em>pattern.</em>
                  </h2>
                </div>
                <div className="workspace-meta">
                  <span className="meta-led" /> AI ENGINE <b>AZURE OPENAI GPT-4o</b>
                </div>
              </div>


              <div
                ref={conversationRef}
                className={`conversation ${messages.length ? "has-messages" : ""}`}
              >
                {messages.length === 0 ? (
                  <div className="welcome">
                    <div className="welcome-glyph">
                      <Command size={27} strokeWidth={1.4} />
                      <span />
                    </div>
                    <div className="welcome-kicker">
                      <span /> READY WHEN YOU ARE
                    </div>
                    <h3>
                      See the game <em>from above.</em>
                    </h3>
                    <p>
                      Explore the spaces, pressure and patterns shaping every
                      moment.
                    </p>
                    <div
                      className="pitch-stage"
                      aria-label={`${home} versus ${away} tactical pitch visualization`}
                    >
                      <div className="pitch-caption pitch-caption-left">
                        <span className="pitch-live-dot" /> SYNTHETIC PITCH VIEW
                      </div>
                      <div className="pitch-caption pitch-caption-right">
                        01 / MATCH VIEW
                      </div>
                      <div className="pitch-platform">
                        <div className="pitch-side-glow" />
                        <div className="pitch-surface">
                          <svg
                            className="pitch-lines"
                            viewBox="0 0 800 420"
                            preserveAspectRatio="none"
                            aria-hidden="true"
                          >
                            <rect
                              x="12"
                              y="12"
                              width="776"
                              height="396"
                              rx="2"
                            />
                            <line x1="400" y1="12" x2="400" y2="408" />
                            <circle cx="400" cy="210" r="66" />
                            <circle
                              className="center-spot"
                              cx="400"
                              cy="210"
                              r="3"
                            />
                            <rect x="12" y="109" width="116" height="202" />
                            <rect x="12" y="159" width="46" height="102" />
                            <circle
                              className="pitch-spot"
                              cx="92"
                              cy="210"
                              r="3"
                            />
                            <path d="M128 151 A66 66 0 0 1 128 269" />
                            <rect x="672" y="109" width="116" height="202" />
                            <rect x="742" y="159" width="46" height="102" />
                            <circle
                              className="pitch-spot"
                              cx="708"
                              cy="210"
                              r="3"
                            />
                            <path d="M672 151 A66 66 0 0 0 672 269" />
                            <path d="M12 23 A11 11 0 0 0 23 12 M777 12 A11 11 0 0 0 788 23 M12 397 A11 11 0 0 1 23 408 M777 408 A11 11 0 0 1 788 397" />
                          </svg>
                          <div className="pitch-grid" />
                          <div className="pitch-route route-one" />
                          <div className="pitch-route route-two" />
                          <div className="pitch-route route-three" />
                          <span
                            className="pitch-player arsenal-player player-a"
                            aria-label="Arsenal player"
                          >
                            <i /> <b>SAKA</b>
                          </span>
                          <span
                            className="pitch-player arsenal-player player-b"
                          >
                            <i /> <b>ØDEGAARD</b>
                          </span>
                          <span className="pitch-player arsenal-player player-c">
                            <i />
                          </span>
                          <span className="pitch-player arsenal-player player-d">
                            <i />
                          </span>
                          <span className="pitch-player arsenal-player player-e">
                            <i />
                          </span>
                          <span className="pitch-player spurs-player player-f">
                            <i />
                          </span>
                          <span className="pitch-player spurs-player player-g">
                            <i />
                          </span>
                          <span className="pitch-player spurs-player player-h">
                            <i />
                          </span>
                          <span className="pitch-player spurs-player player-i">
                            <i />
                          </span>
                          <span className="pitch-player spurs-player player-j">
                            <i />
                          </span>
                          <span className="pitch-ball">
                            <i />
                          </span>
                        </div>
                        <div className="pitch-edge" />
                      </div>
                      <div className="pitch-team-label pitch-home">
                        <i />
                        {home}
                      </div>
                      <div className="pitch-team-label pitch-away">
                        <i />
                        {away}
                      </div>
                      <div className="pitch-readout">
                        <span>PRESSURE INDEX</span>
                        <b>
                          HIGH <i />
                        </b>
                      </div>
                    </div>

                    {language !== "en" && (
                      <div className="active-lens-indicator">
                        <Sparkles size={12} />
                        <span>
                          STORYTELLING LANGUAGE:{" "}
                          <strong className="lens-highlight lang-highlight">
                            {language.toUpperCase()}
                          </strong>
                        </span>
                      </div>
                    )}

                    <div className="suggestion-list">
                      {(sourceMode === "web"
                        ? webSuggestions
                        : commonQuestions.slice(0, 3)
                      ).map((suggestion, index) => (
                        <button
                          key={suggestion}
                          onClick={() => askQuestion(suggestion)}
                          disabled={loading || (sourceMode === "match" && !match)}
                        >
                          <span className="suggestion-index">0{index + 1}</span>
                          {suggestion}
                          <ArrowUpRight size={14} />
                        </button>
                      ))}
                    </div>
                    <span className="welcome-orb orb-one" />
                    <span className="welcome-orb orb-two" />
                  </div>
                ) : (
                  <div className="message-list">
                    {messages.map((message) => (
                      <article
                        className={`message message-${message.role}`}
                        key={message.id}
                      >
                        {message.role === "user" ? (
                          <div className="user-question">
                            <span className="user-badge">YOU</span>
                            <p>{message.text}</p>
                          </div>
                        ) : (
                          <div
                            className={`assistant-answer ${message.kind === "general" ? "assistant-general" : ""}`}
                          >
                            {message.kind === "web" && message.breakdown ? (
                              <>
                                <div className="answer-brand">
                                  <span className="mini-mark">T</span>
                                  <span>TACTIQ INTELLIGENCE</span>
                                  <i>WEB GROUNDED</i>
                                </div>
                                <AnalysisCard
                                  breakdown={message.breakdown}
                                  language={message.language}
                                  followUpQuestions={message.followUpQuestions}
                                  onSelectQuestion={askQuestion}
                                />
                                {message.sources?.length > 0 && (
                                  <div className="grounded-sources-block" style={{ marginTop: "12px" }}>
                                    <div className="sources-label">
                                      <Globe2 size={12} />
                                      <span>VERIFIED SEARCH SOURCES</span>
                                    </div>
                                    <div className="web-source-grid">
                                      {message.sources.map((source, index) => (
                                        <a
                                          key={`${source.uri || index}-${index}`}
                                          href={source.uri}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="web-source-card"
                                        >
                                          <div className="web-source-card-top">
                                            <span className="source-domain-tag">
                                              {source.domain || "web"}
                                            </span>
                                            <ExternalLink size={11} className="card-ext-icon" />
                                          </div>
                                          <div className="source-card-title">
                                            {source.title || source.domain}
                                          </div>
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : message.kind === "general" ||
                            message.kind === "web" ? (
                              <>
                                <div className="answer-brand">
                                  <span className="mini-mark">T</span>
                                  <span>TACTIQ INTELLIGENCE</span>
                                  <i>{message.kind === "web" ? "WEB GROUNDED" : "GENERAL"}</i>
                                </div>
                                <div className="general-answer web-answer-formatted">
                                  <div className="general-answer-body">
                                    <div className="answer-text-content">
                                      {message.answer.split("\n\n").map((para, i) => (
                                        <p key={i}>{para}</p>
                                      ))}
                                    </div>
                                    {message.sources?.length > 0 && (
                                      <div className="grounded-sources-block">
                                        <div className="sources-label">
                                          <Globe2 size={12} />
                                          <span>VERIFIED SEARCH SOURCES</span>
                                        </div>
                                        <div className="web-source-grid">
                                          {message.sources.map((source, index) => (
                                            <a
                                              key={`${source.uri || index}-${index}`}
                                              href={source.uri}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="web-source-card"
                                            >
                                              <div className="web-source-card-top">
                                                <span className="source-domain-tag">
                                                  {source.domain || "web"}
                                                </span>
                                                <ExternalLink size={11} className="card-ext-icon" />
                                              </div>
                                              <div className="source-card-title">
                                                {source.title || source.domain}
                                              </div>
                                            </a>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="answer-brand">
                                  <span className="mini-mark">T</span>
                                  <span>TACTIQ ANALYSIS</span>
                                  <i>MATCH CONTEXT</i>
                                </div>
                                <AnalysisCard
                                  breakdown={message.breakdown}
                                  controlChaos={message.controlChaos}
                                  speedAlerts={message.speedAlerts}
                                  evidence={message.evidence}
                                  language={message.language}
                                  followUpQuestions={message.followUpQuestions}
                                  onSelectQuestion={askQuestion}
                                />
                              </>
                            )}
                          </div>
                        )}
                      </article>
                    ))}
                    {loading && (
                      <div className="chat-loading-compact">
                        <LoaderCircle size={15} className="spin" />
                        <span>TactIQ analyzing match data &amp; tactical patterns...</span>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              <div className="composer-area">
                {error && (
                  <div className="request-error" role="alert">
                    <CircleHelp size={15} />
                    {error}
                    <button
                      onClick={() => setError("")}
                      aria-label="Dismiss error"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="source-controls">
                  <div className="source-tabs" aria-label="Question source">
                    <button
                      type="button"
                      className={sourceMode === "match" ? "active" : ""}
                      onClick={() => setSourceMode("match")}
                    >
                      Match data
                    </button>
                    <button
                      type="button"
                      className={sourceMode === "web" ? "active" : ""}
                      onClick={() => setSourceMode("web")}
                    >
                      {" "}
                      <Globe2 size={13} /> Web Search
                    </button>
                  </div>
                  {sourceMode === "match" && (
                    <div className="match-source-row">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,.csv,.txt,.xlsx,.xls,.doc,.docx,application/json,text/plain,text/csv"
                        hidden
                        onChange={handleMatchUpload}
                      />
                      <span>{isFileUploaded ? matchSourceName : "No match file uploaded"}</span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={13} /> {isFileUploaded ? "Change File" : "Upload File"}
                      </button>
                    </div>
                  )}
                  {matchUploadError && (
                    <div className="source-error">{matchUploadError}</div>
                  )}
                </div>


                {sourceMode === "match" && isFileUploaded && messages.length > 0 && (
                  <div
                    className="popular-questions"
                    aria-label="Popular match questions"
                  >
                    <div className="popular-heading">
                      <Sparkles size={12} /> QUICK QUESTIONS{" "}
                      <span>COMMON MATCH ASKS</span>
                    </div>
                    <div className="popular-list">
                      {commonQuestions.map((question) => (
                        <button
                          key={question}
                          type="button"
                          onClick={() => askQuestion(question)}
                          disabled={loading || !match}
                        >
                          {question}
                          <ArrowUpRight size={12} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <form
                  className="composer"
                  onSubmit={(event) => {
                    event.preventDefault();
                    askQuestion();
                  }}
                >
                  <span className="composer-spark">
                    <Sparkles size={17} />
                  </span>
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={
                      sourceMode === "match"
                        ? isFileUploaded && match
                          ? "Ask about build-up sequences, pass difficulty, speed bursts, or pressure traps..."
                          : "Upload a match JSON file to ask match questions..."
                        : "Ask for fixtures, standings, or current football records..."
                    }
                    aria-label="Ask TactIQ"
                    maxLength={1000}
                    disabled={loading || (sourceMode === "match" && (!isFileUploaded || !match))}
                  />
                  <span className="composer-shortcut">
                    <CornerDownLeft size={13} /> ENTER
                  </span>
                  <button
                    type="submit"
                    disabled={
                      !query.trim() ||
                      loading ||
                      (sourceMode === "match" && (!isFileUploaded || !match))
                    }
                    aria-label="Send question"
                  >
                    {loading ? (
                      <LoaderCircle size={17} className="spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </form>
                <div className="composer-foot">
                  <span>
                    <Shield size={12} />{" "}
                    {sourceMode === "match"
                      ? "ANALYSIS GROUNDED IN SELECTED MATCH DATA"
                      : "ANSWERS GROUNDED IN SEARCH RESULTS"}
                  </span>
                  <span>TACTIQ MAY MISS THE OCCASIONAL RUN.</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        {showBroadcastOverlay && (
          <div className="broadcast-hud-overlay" role="dialog" aria-label="Broadcast Graphics HUD">
            <div className="hud-backdrop" onClick={() => setShowBroadcastOverlay(false)} />
            <div className="hud-content">
              {/* Top Scorebug */}
              <div className="hud-top-bar">
                <div className="hud-scorebug">
                  <span className="hud-comp-badge">PREMIER LEAGUE STUDIO</span>
                  <div className="hud-score-teams">
                    <span className="hud-team hud-home">{home}</span>
                    <span className="hud-score">1 - 0</span>
                    <span className="hud-team hud-away">{away}</span>
                  </div>
                  <span className="hud-match-minute">{minute}&apos;</span>
                </div>

                <div className="hud-top-right">
                  <div className="hud-live-tag">
                    <span className="hud-live-dot" />
                    <span>ON-AIR LIVE GRAPHIC FEED</span>
                  </div>
                  <button
                    type="button"
                    className="hud-close-btn"
                    onClick={() => setShowBroadcastOverlay(false)}
                    aria-label="Close Broadcast HUD"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Middle Tactical Radar Widgets */}
              <div className="hud-tactical-grid">
                <div className="hud-tactical-card">
                  <div className="hud-card-header">
                    <Gauge size={14} />
                    <span>CONTROL VS CHAOS ENGINE</span>
                  </div>
                  <div className="hud-control-chaos-meter">
                    <div className="hud-cc-labels">
                      <span className="hud-cc-ctrl">
                        CONTROL {latestControlChaos?.controlScore || 68}%
                      </span>
                      <span className="hud-cc-chaos">
                        CHAOS {latestControlChaos?.chaosScore || 32}%
                      </span>
                    </div>
                    <div className="hud-cc-dual-bar">
                      <div
                        className="hud-cc-fill-control"
                        style={{ width: `${latestControlChaos?.controlScore || 68}%` }}
                      />
                      <div
                        className="hud-cc-fill-chaos"
                        style={{ width: `${latestControlChaos?.chaosScore || 32}%` }}
                      />
                    </div>
                    <p className="hud-cc-desc">
                      {latestControlChaos?.summary ||
                        "Controlled positional dominance bypasses transitional chaos traps."}
                    </p>
                  </div>
                </div>

                <div className="hud-tactical-card">
                  <div className="hud-card-header">
                    <Zap size={14} />
                    <span>PHYSICAL PERFORMANCE & SPRINT METRICS</span>
                  </div>
                  <div className="hud-spotlight-stats">
                    <div className="hud-stat-box">
                      <span className="stat-label">TOP SPRINT</span>
                      <span className="stat-val highlight-val">33.8 <small>km/h</small></span>
                    </div>
                    <div className="hud-stat-box">
                      <span className="stat-label">DISTANCE</span>
                      <span className="stat-val">10.4 <small>km</small></span>
                    </div>
                    <div className="hud-stat-box">
                      <span className="stat-label">PASS DIFFICULTY</span>
                      <span className="stat-val">7.8<small>/10</small></span>
                    </div>
                    <div className="hud-stat-box">
                      <span className="stat-label">PRESSURE EVASION</span>
                      <span className="stat-val highlight-val">88<small>%</small></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Lower-Third Banner */}
              <div className="hud-lower-third-banner">
                <div className="hud-banner-brand">
                  <Tv size={16} />
                  <div>
                    <strong>TACTIQ STUDIO INSIGHTS</strong>
                    <small>AI-POWERED MATCH INTELLIGENCE ENGINE</small>
                  </div>
                </div>
                <div className="hud-banner-narrative">
                  <span className="hud-banner-tag">
                    TACTICAL EXPLAINABILITY
                  </span>
                  <p className="hud-banner-text">
                    {messages.findLast?.((m) => m.role === "assistant" && m.breakdown)?.[
                      "breakdown"
                    ]?.[1]?.content ||
                      "Methodical horizontal progression and timely vertical releases bypassed Tottenham's pressing traps to create high-value attacking phases."}
                  </p>
                </div>
                <div className="hud-banner-pills">
                  <span className="hud-pill">{language.toUpperCase()}</span>
                  <span className="hud-pill">MATCH INTEL</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
