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

const AUDIENCE_MODES = [
  { id: "analyst", label: "Tactical Analyst", desc: "Data & xG metrics" },
  { id: "casual", label: "Casual Fan", desc: "Storytelling & drama" },
  { id: "broadcast", label: "Broadcast Studio", desc: "Live TV overlays" },
];

const PIPELINE_STAGES = [
  { id: 1, tag: "01", name: "INGEST", label: "Synthetic Feed", desc: "Passes, tackles, pressures & tracking" },
  { id: 2, tag: "02", name: "INTERPRET", label: "Pattern Engine", desc: "Pass difficulty, sprint thresholds & xG" },
  { id: 3, tag: "03", name: "EXPLAIN", label: "Tactical Context", desc: "Control vs Chaos & why moments matter" },
  { id: 4, tag: "04", name: "RENDER", label: "Broadcast Overlay", desc: "Synchronized match graphic overlays" },
  { id: 5, tag: "05", name: "PERSONALIZE", label: "Fan Customization", desc: "Audience mode, player focus & multi-lang" },
];

const SPOTLIGHT_PLAYERS = [
  "Bukayo Saka",
  "Martin Ødegaard",
  "Declan Rice",
  "Kai Havertz",
  "Son Heung-min",
  "James Maddison",
  "Cristian Romero",
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

function popularQuestions(home, away, focusedPlayer, audienceMode) {
  if (focusedPlayer) {
    return [
      `Analyze ${focusedPlayer}'s speed bursts and physical impact`,
      `Evaluate ${focusedPlayer}'s pass difficulty and distribution`,
      `How did ${focusedPlayer} navigate defensive pressure traps?`,
      `Summarize ${focusedPlayer}'s key match contributions`,
    ];
  }
  if (audienceMode === "casual") {
    return [
      "Tell the story of the key turning moments in this match",
      "Which moments got the fans on their feet?",
      "Who was the hero of the first half?",
      "Explain the game flow and momentum in simple terms",
    ];
  }
  if (audienceMode === "broadcast") {
    return [
      "Generate live on-screen studio lower-third takeaways",
      "Produce a 60-second broadcast match recap",
      "Highlight the key tactical shift for the halftime show",
      "Control vs. Chaos summary for post-match analysis",
    ];
  }
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

function normalizeUploadedMatch(data) {
  const fixtureText =
    typeof data.fixture === "string"
      ? data.fixture
      : data.match_id || "Uploaded match";
  const fixtureParts = fixtureText.split(/\s+vs\s+/i);
  const homeTeam = data.home_team || fixtureParts[0] || "Home";
  const awayTeam = data.away_team || fixtureParts[1] || "Away";
  const events = Array.isArray(data.events)
    ? data.events
        .map((event, index) => ({
          ...event,
          event_id: event.event_id ?? index + 1,
          timestamp: event.timestamp || `${index + 1}:00`,
          period: event.period || "Period not provided",
          team: event.team || homeTeam,
          player: event.player || "Player",
          event_type: event.event_type || "event",
        }))
        .sort((left, right) => {
          const seconds = (event) => {
            const match = String(event.timestamp).match(/(\d+)(?::(\d{1,2}))?/);
            if (!match) return Number.MAX_SAFE_INTEGER;
            const halfOffset = /2nd|second/i.test(event.period) ? 45 * 60 : 0;
            return halfOffset + Number(match[1]) * 60 + Number(match[2] || 0);
          };
          return seconds(left) - seconds(right);
        })
    : [];

  return {
    ...data,
    match_id:
      data.match_id ||
      `${homeTeam}-${awayTeam}`
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/-$/, "")
        .toUpperCase(),
    fixture: fixtureText,
    home_team: homeTeam,
    away_team: awayTeam,
    competition:
      data.competition ||
      data.match_metadata?.competition ||
      "Uploaded fixture",
    match_metadata: {
      ...(data.match_metadata || {}),
      stadium: data.match_metadata?.stadium || data.stadium || "Uploaded data",
      minute: data.match_metadata?.minute || data.minute || "—",
    },
    events,
  };
}

function AnalysisCard({
  breakdown,
  controlChaos,
  speedAlerts,
  audienceMode,
  language,
  focusedPlayer,
}) {
  return (
    <div className="analysis-stack">
      {(audienceMode || language || focusedPlayer) && (
        <div className="analysis-personalization-pill-row">
          {audienceMode && (
            <span className="analysis-pill pill-mode">
              <SlidersHorizontal size={11} />
              {audienceMode === "casual"
                ? "Casual Fan View"
                : audienceMode === "broadcast"
                  ? "Broadcast Overlay View"
                  : "Tactical Analyst View"}
            </span>
          )}
          {focusedPlayer && (
            <span className="analysis-pill pill-player">
              <UserCheck size={11} /> {focusedPlayer} Spotlight
            </span>
          )}
          {language && language !== "en" && (
            <span className="analysis-pill pill-lang">
              <Languages size={11} /> {language.toUpperCase()} Output
            </span>
          )}
        </div>
      )}

      {breakdown.map((step, index) => {
        const meta = stepMeta[step.key] || stepMeta.synthesize;
        const Icon = meta.icon;
        return (
          <section
            className={`analysis-step step-${meta.color}`}
            key={step.key}
          >
            <div className="step-rail">
              <div className="step-icon">
                <Icon size={16} strokeWidth={1.8} />
              </div>
              {index < breakdown.length - 1 && <div className="step-line" />}
            </div>
            <div className="step-copy">
              <div className="step-heading">
                <span className="step-number">0{index + 1}</span>
                <h3>{meta.label}</h3>
                <span className="step-tag">ANALYSIS</span>
              </div>
              <p>{step.content}</p>
            </div>
          </section>
        );
      })}

      {controlChaos && (
        <div className="analysis-inline-control-chaos">
          <div className="inline-cc-header">
            <span>
              <Gauge size={12} /> TACTICAL DYNAMICS: CONTROL vs CHAOS
            </span>
            <b>
              {controlChaos.controlScore}% Control / {controlChaos.chaosScore}% Chaos
            </b>
          </div>
          <div className="inline-cc-bar">
            <div
              className="inline-cc-fill-control"
              style={{ width: `${controlChaos.controlScore}%` }}
            />
            <div
              className="inline-cc-fill-chaos"
              style={{ width: `${controlChaos.chaosScore}%` }}
            />
          </div>
          {controlChaos.summary && (
            <p className="inline-cc-summary">{controlChaos.summary}</p>
          )}
        </div>
      )}

      {speedAlerts?.length > 0 && (
        <div className="analysis-inline-speed-alerts">
          <div className="inline-speed-badge">
            <Zap size={12} /> SPRINT THRESHOLD TRIGGERED (&gt;30 km/h)
          </div>
          <div className="inline-speed-list">
            {speedAlerts.slice(0, 3).map((alert, i) => (
              <span key={i} className="inline-speed-chip">
                <strong>{alert.player}</strong>: {alert.speed_kmh} km/h (E{alert.event_id})
              </span>
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
            ? `Pass · Dist ${event.pass_distance_m || 20}m · Diff ${event.pass_difficulty_rating}/10`
            : type === "pressure"
              ? `Pressure (${event.pressure_intensity_rating || 7.5}/10) · ${event.zone || "unmarked"}`
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
  const [matchError, setMatchError] = useState("");
  const [matchLoading, setMatchLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sourceMode, setSourceMode] = useState("match");
  const [matchSourceName, setMatchSourceName] = useState("Synthetic fixture");
  const [matchUploadError, setMatchUploadError] = useState("");
  const [audienceMode, setAudienceMode] = useState("analyst");
  const [language, setLanguage] = useState("en");
  const [focusedPlayer, setFocusedPlayer] = useState(null);
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

  const loadMatch = useCallback(async () => {
    setMatchLoading(true);
    setMatchError("");
    try {
      const response = await fetch("/api/match", {
        signal: AbortSignal.timeout(10000),
      });
      const data = await response.json();
      if (!response.ok || !data.success)
        throw new Error(data.error || "Match data unavailable.");
      setMatch(data.matchData);
    } catch (fetchError) {
      setMatchError(
        fetchError.name === "TimeoutError"
          ? "Match data request timed out. Check that the backend is running."
          : fetchError.message,
      );
    } finally {
      setMatchLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMatch();
  }, [loadMatch]);

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

  async function handleMatchUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 256 * 1024) {
      setMatchUploadError("JSON file must be 256 KB or smaller.");
      event.target.value = "";
      return;
    }
    if (
      !file.name.toLowerCase().endsWith(".json") &&
      file.type !== "application/json"
    ) {
      setMatchUploadError("Choose a .json match data file.");
      event.target.value = "";
      return;
    }
    setMatchUploadError("");
    try {
      const uploaded = JSON.parse(await file.text());
      if (!Array.isArray(uploaded.events) || uploaded.events.length === 0) {
        throw new Error("JSON must contain a non-empty events array.");
      }
      setMatch(normalizeUploadedMatch(uploaded));
      setMatchSourceName(file.name);
      setSourceMode("match");
    } catch (uploadError) {
      setMatchUploadError(
        uploadError.message || "Could not read that JSON file.",
      );
    } finally {
      event.target.value = "";
    }
  }

  async function askQuestion(question = query) {
    const text = question.trim();
    if (!text || loading) return;
    if (sourceMode === "match" && !match) {
      setError("Load match JSON or switch to Football data.");
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
          audienceMode,
          language,
          focusedPlayer,
          matchData: sourceMode === "match" ? match : undefined,
        }),
        signal: AbortSignal.timeout(45000),
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.error || "Analysis failed.");

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
          audienceMode: result.audienceMode || audienceMode,
          language: result.language || language,
          focusedPlayer: result.focusedPlayer || focusedPlayer,
        },
      ]);
    } catch (requestError) {
      setError(
        requestError.name === "TimeoutError"
          ? "Analysis timed out. Check the Azure OpenAI connection and try again."
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
  const commonQuestions = popularQuestions(home, away, focusedPlayer, audienceMode);
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
              <button
                className="mobile-menu icon-button"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open match sidebar"
              >
                <Menu size={19} />
              </button>
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
            <div
              className={`sidebar-backdrop ${sidebarOpen ? "is-open" : ""}`}
              onClick={() => setSidebarOpen(false)}
            />
            <aside
              className={`match-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}
            >
              <div className="sidebar-head">
                <div>
                  <div className="eyebrow">
                    <span className="live-dot" />{" "}
                    {sourceMode === "match"
                      ? matchSourceName === "Synthetic fixture"
                        ? "MATCH CONTEXT"
                        : "UPLOADED DATA"
                      : "WEB CONTEXT"}
                  </div>
                  <h1>
                    {sourceMode === "match"
                      ? matchSourceName === "Synthetic fixture"
                        ? "Synthetic match"
                        : matchSourceName
                      : "Web Intelligence"}
                  </h1>
                </div>
                <button
                  className="icon-button close-sidebar"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close sidebar"
                >
                  <X size={18} />
                </button>
                <span className="live-pill">
                  <i />{" "}
                  {sourceMode === "match"
                    ? matchSourceName === "Synthetic fixture"
                      ? "SYNTHETIC"
                      : "UPLOADED"
                    : "WEB SEARCH"}
                </span>
              </div>

              {sourceMode === "web" ? (
                <section className="sidebar-section web-source-panel">
                  <div className="section-heading">
                    <span className="eyebrow">SEARCH SOURCES</span>
                    <span className="event-count">
                      {String(latestSources.length).padStart(2, "0")} SOURCES
                    </span>
                  </div>
                  {latestSources.length ? (
                    latestSources.map((source, index) => (
                      <a
                        className="source-result web-grounded-item"
                        key={`${source.uri || index}-${index}`}
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="source-index">0{index + 1}</span>
                        <div className="source-info">
                          <strong>{source.title || source.domain}</strong>
                          <small>{source.domain || "Web source"}</small>
                        </div>
                        <ExternalLink size={12} className="source-card-link-icon" />
                      </a>
                    ))
                  ) : (
                    <div className="feed-empty">
                      Live Google Search sources will appear here when you submit a question in Web mode.
                    </div>
                  )}
                </section>
              ) : (
                <>
                  <section className="match-card">
                    <div className="match-card-top">
                      <span>{match?.competition || "MATCH DATA"}</span>
                      <span>{match?.match_id || "MATCH 09"}</span>
                    </div>
                    <div className="scoreboard">
                      <div className="team">
                        <span className="team-crest arsenal">
                          {home.slice(0, 1)}
                        </span>
                        <span>{home}</span>
                      </div>
                      <div className="score">
                        <strong>
                          — <b>:</b> —
                        </strong>
                        <span>{minute}&apos;</span>
                      </div>
                      <div className="team team-away">
                        <span className="team-crest chelsea">
                          {away.slice(0, 1)}
                        </span>
                        <span>{away}</span>
                      </div>
                    </div>
                    <div className="match-card-bottom">
                      <span>
                        <Radio size={12} />{" "}
                        {match?.match_metadata?.stadium || "Synthetic stadium"}
                      </span>
                      <span>
                        {match?.match_metadata?.period || "FULL DATASET"}
                      </span>
                    </div>
                  </section>

                  <section className="sidebar-section">
                    <div className="section-heading">
                      <span className="eyebrow">MATCH EVENTS</span>
                      <span className="event-count">
                        {String(events.length).padStart(2, "0")} EVENTS
                      </span>
                    </div>
                    <div className="event-list">
                      {events.length ? (
                        events.map((event, index) => (
                          <EventRow
                            key={`${event.timestamp}-${index}`}
                            event={event}
                          />
                        ))
                      ) : (
                        <div className="feed-empty">
                          {matchError || "No match events loaded"}
                          {matchError && (
                            <button
                              className="feed-retry"
                              onClick={loadMatch}
                              disabled={matchLoading}
                            >
                              {matchLoading ? "RETRYING…" : "RETRY CONNECTION"}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {events.length > 0 && (
                      <button
                        className="feed-link"
                        onClick={() =>
                          askQuestion(
                            "Summarize the key moments in this synthetic match data.",
                          )
                        }
                      >
                        ANALYZE ALL MOMENTS <ArrowUpRight size={13} />
                      </button>
                    )}
                  </section>

                  <section className="sidebar-section insight-card control-chaos-card">
                    <div className="section-heading">
                      <span className="eyebrow">TACTICAL EXPLAINABILITY</span>
                      <Gauge size={14} className="pulse-icon text-green" />
                    </div>
                    <div className="pulse-main">
                      <span>CONTROL vs CHAOS</span>
                      <strong>
                        {latestControlChaos.controlScore}% <small>CONTROL</small>
                      </strong>
                    </div>
                    <div className="control-chaos-dual-bar">
                      <div
                        className="control-bar-fill"
                        style={{ width: `${latestControlChaos.controlScore}%` }}
                        title={`${latestControlChaos.controlScore}% Structured Control`}
                      />
                      <div
                        className="chaos-bar-fill"
                        style={{ width: `${latestControlChaos.chaosScore}%` }}
                        title={`${latestControlChaos.chaosScore}% Transition Chaos`}
                      />
                    </div>
                    <div className="pulse-notes">
                      <span className="control-label">
                        <Shield size={11} /> {latestControlChaos.controlScore}% POSITIONAL
                      </span>
                      <span className="chaos-label">
                        <Flame size={11} /> {latestControlChaos.chaosScore}% TRANSITION
                      </span>
                    </div>
                    <p className="control-summary-text">
                      {latestControlChaos.summary}
                    </p>
                  </section>

                  <section className="sidebar-section threshold-radar-card">
                    <div className="section-heading">
                      <span className="eyebrow">SPEED &amp; PHYSICAL RADAR</span>
                      <Zap size={14} className="pulse-icon text-amber" />
                    </div>
                    <div className="threshold-metrics-grid">
                      <div className="threshold-metric-box">
                        <small>SPRINT BURST PEAK</small>
                        <strong>33.8 <span className="unit">km/h</span></strong>
                        <span>Threshold &gt; 30 km/h</span>
                      </div>
                      <div className="threshold-metric-box">
                        <small>PASS DIFFICULTY</small>
                        <strong>7.8 <span className="unit">/10</span></strong>
                        <span>Vertical Trajectory</span>
                      </div>
                    </div>
                    <div className="recent-sprints-list">
                      <div className="sprint-entry">
                        <span className="sprint-player">B. Saka</span>
                        <span className="sprint-speed-badge">33.8 km/h</span>
                        <span className="sprint-time">14:22</span>
                      </div>
                      <div className="sprint-entry">
                        <span className="sprint-player">Son H.M.</span>
                        <span className="sprint-speed-badge">32.4 km/h</span>
                        <span className="sprint-time">28:45</span>
                      </div>
                      <div className="sprint-entry">
                        <span className="sprint-player">G. Martinelli</span>
                        <span className="sprint-speed-badge">33.1 km/h</span>
                        <span className="sprint-time">41:09</span>
                      </div>
                    </div>
                  </section>
                </>
              )}

              <div className="sidebar-foot">
                <span className="azure-orbit">✦</span>
                <span>
                  POWERED BY <b>MICROSOFT AZURE AI FOUNDRY</b>
                </span>
              </div>
            </aside>

            <section className="workspace">
              <div className="workspace-heading">
                <div>
                  <div className="eyebrow">
                    <span className="heading-star">
                      <Sparkles size={13} />
                    </span>{" "}
                    PREMIER LEAGUE STUDIO · TACTICAL DESK
                  </div>
                  <h2>
                    Every moment has a <em>pattern.</em>
                  </h2>
                  <p>
                    Autonomous synthetic event ingestion, tactical explainability, and multi-fan personalization.
                  </p>
                </div>
                <div className="workspace-meta">
                  <span className="meta-led" /> AI ENGINE <b>AZURE OPENAI GPT-4o</b>
                </div>
              </div>

              {/* 5-STAGE SYNTHETIC INSIGHTS PIPELINE */}
              <div className="pipeline-strip">
                <div className="pipeline-label">
                  <Layers size={12} />
                  <span>5-STAGE PIPELINE:</span>
                </div>
                <div className="pipeline-steps">
                  {PIPELINE_STAGES.map((stg) => (
                    <button
                      type="button"
                      key={stg.id}
                      className={`pipeline-step-item ${activePipelineStage === stg.id ? "active" : ""}`}
                      onClick={() =>
                        setActivePipelineStage(activePipelineStage === stg.id ? null : stg.id)
                      }
                      title={`${stg.name}: ${stg.desc}`}
                    >
                      <span className="stg-num">{stg.tag}</span>
                      <span className="stg-name">{stg.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              {activePipelineStage && (
                <div className="pipeline-stage-detail-callout">
                  <div className="stage-detail-header">
                    <strong>
                      Stage {PIPELINE_STAGES[activePipelineStage - 1].tag} — {PIPELINE_STAGES[activePipelineStage - 1].name}: {PIPELINE_STAGES[activePipelineStage - 1].label}
                    </strong>
                    <button type="button" onClick={() => setActivePipelineStage(null)}>
                      <X size={12} />
                    </button>
                  </div>
                  <p>{PIPELINE_STAGES[activePipelineStage - 1].desc}</p>
                </div>
              )}

              {/* AUDIENCE & PLAYER PERSONALIZATION HUB */}
              <div className="personalization-bar">
                <div className="audience-mode-pills">
                  <span className="control-group-label">
                    <SlidersHorizontal size={11} /> AUDIENCE:
                  </span>
                  {AUDIENCE_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      className={`audience-pill ${audienceMode === mode.id ? "active" : ""}`}
                      onClick={() => setAudienceMode(mode.id)}
                      title={mode.desc}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>

                <div className="player-focus-pills">
                  <span className="control-group-label">
                    <UserCheck size={11} /> PLAYER FOCUS:
                  </span>
                  <button
                    type="button"
                    className={`player-focus-chip ${focusedPlayer === null ? "active" : ""}`}
                    onClick={() => setFocusedPlayer(null)}
                  >
                    All Match
                  </button>
                  {SPOTLIGHT_PLAYERS.map((pl) => (
                    <button
                      key={pl}
                      type="button"
                      className={`player-focus-chip ${focusedPlayer === pl ? "active" : ""}`}
                      onClick={() => setFocusedPlayer(focusedPlayer === pl ? null : pl)}
                    >
                      {pl.split(" ").pop()}
                    </button>
                  ))}
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
                          <span className="pitch-player arsenal-player player-b">
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
                    <div className="suggestion-list">
                      {(sourceMode === "web"
                        ? webSuggestions
                        : matchSuggestions
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
                            {message.kind === "general" ||
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
                                  audienceMode={message.audienceMode}
                                  language={message.language}
                                  focusedPlayer={message.focusedPlayer}
                                />
                                {message.evidence && (
                                  <div className="analysis-evidence">
                                    <span
                                      className={`evidence-quality quality-${message.evidence.quality}`}
                                    >
                                      EVIDENCE {message.evidence.quality}
                                    </span>
                                    <span className="evidence-label">
                                      SOURCE EVENTS
                                    </span>
                                    <div className="evidence-ids">
                                      {message.evidence.eventIds.map(
                                        (eventId) => (
                                          <span key={eventId}>E{eventId}</span>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </article>
                    ))}
                    {loading && (
                      <div className="thinking">
                        <span className="thinking-icon">
                          <LoaderCircle size={16} className="spin" />
                        </span>
                        <div>
                          <strong>Reading the game</strong>
                          <span>
                            Filtering events · calculating patterns · building
                            context
                          </span>
                        </div>
                        <div className="thinking-bars">
                          <i />
                          <i />
                          <i />
                          <i />
                          <i />
                        </div>
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
                        accept="application/json,.json"
                        hidden
                        onChange={handleMatchUpload}
                      />
                      <span>{matchSourceName}</span>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload size={13} /> Upload JSON
                      </button>
                    </div>
                  )}
                  {matchUploadError && (
                    <div className="source-error">{matchUploadError}</div>
                  )}
                </div>
                {sourceMode === "match" && messages.length > 0 && (
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
                        ? "Ask a question about this match data..."
                        : sourceMode === "web"
                          ? "Ask for fixtures, standings, or current football records..."
                          : "Ask TactIQ anything..."
                    }
                    aria-label="Ask TactIQ"
                    maxLength={1000}
                    disabled={loading || (sourceMode === "match" && !match)}
                  />
                  <span className="composer-shortcut">
                    <CornerDownLeft size={13} /> ENTER
                  </span>
                  <button
                    type="submit"
                    disabled={
                      !query.trim() ||
                      loading ||
                      (sourceMode === "match" && !match)
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
                    <span>PLAYER SPOTLIGHT · {focusedPlayer || "Bukayo Saka"}</span>
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
                    {audienceMode === "casual"
                      ? "FAN NARRATIVE"
                      : audienceMode === "broadcast"
                        ? "ON-AIR TAKEAWAY"
                        : "TACTICAL EXPLAINABILITY"}
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
                  <span className="hud-pill">{audienceMode.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
