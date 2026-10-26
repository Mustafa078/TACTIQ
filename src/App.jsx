import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  AudioLines,
  CircleHelp,
  Command,
  CornerDownLeft,
  LoaderCircle,
  Menu,
  Radio,
  Upload,
  Globe2,
  ExternalLink,
  Send,
  Shield,
  Sparkles,
  Target,
  X,
} from "lucide-react";

const stepMeta = {
  explain: { label: "Explain", icon: Activity, color: "amber" },
  synthesize: { label: "Takeaway", icon: AudioLines, color: "green" },
};

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
    `Compare ${home} and ${away}'s shooting threat`,
    "Which players created the most chances?",
    "When and where was the pressure highest?",
    "What were the key sequences before shots?",
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

function AnalysisCard({ breakdown }) {
  return (
    <div className="analysis-stack">
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
    </div>
  );
}

function EventRow({ event }) {
  const type = event.event_type || "event";
  const icon =
    type === "shot" ? Target : type === "pressure" ? Shield : ArrowUpRight;
  const Icon = icon;
  return (
    <div className="event-row">
      <span className={`event-mark event-${type}`}>
        <Icon size={13} />
      </span>
      <div className="event-copy">
        <span className="event-title">{event.player || "Match event"}</span>
        <span className="event-detail">
          {type === "pass" && event.target_player
            ? `Pass to ${event.target_player}`
            : type === "pressure"
              ? `Pressure · ${event.zone || "unmarked"}`
              : type === "shot"
                ? `Shot · ${event.xg != null ? `${event.xg} xG` : "attempt"}`
                : type}
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
    let renderedTime = 0;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const updateScrub = () => {
      const sceneRect = scene.getBoundingClientRect();
      const distance = scene.offsetHeight - window.innerHeight;
      targetProgress =
        distance > 0 ? Math.max(0, Math.min(1, -sceneRect.top / distance)) : 0;
      renderedProgress +=
        (targetProgress - renderedProgress) * (reducedMotion ? 0.32 : 0.16);
      const easedProgress =
        renderedProgress * renderedProgress * (3 - 2 * renderedProgress);
      if (Number.isFinite(video.duration) && video.duration > 0) {
        const targetTime = video.duration * easedProgress;
        renderedTime +=
          (targetTime - renderedTime) * (reducedMotion ? 0.45 : 0.22);
        const seekDelta = renderedTime - video.currentTime;
        if (Math.abs(seekDelta) > 0.012) {
          video.currentTime = Math.max(
            0,
            Math.min(video.duration, video.currentTime + seekDelta * 0.55),
          );
        }
      }
      const reveal = Math.max(0, Math.min(1, (renderedProgress - 0.82) / 0.18));
      studio.style.opacity = String(reveal);
      studio.style.visibility = reveal > 0.02 ? "visible" : "hidden";
      studio.style.pointerEvents = reveal > 0.9 ? "auto" : "none";
      cue.style.opacity = String(1 - reveal * 1.4);
      frame = window.requestAnimationFrame(updateScrub);
    };
    const syncTarget = () => {
      const sceneRect = scene.getBoundingClientRect();
      const distance = scene.offsetHeight - window.innerHeight;
      targetProgress =
        distance > 0 ? Math.max(0, Math.min(1, -sceneRect.top / distance)) : 0;
    };

    const initializeScrub = () => {
      renderedProgress = targetProgress;
      renderedTime = video.duration * targetProgress;
      video.currentTime = renderedTime;
    };

    video.pause();
    syncTarget();
    frame = window.requestAnimationFrame(updateScrub);
    if (video.readyState >= 1) initializeScrub();
    else
      video.addEventListener("loadedmetadata", initializeScrub, { once: true });
    window.addEventListener("scroll", syncTarget, { passive: true });
    window.addEventListener("resize", syncTarget);
    return () => {
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
          matchData: sourceMode === "match" ? match : undefined,
        }),
        signal: AbortSignal.timeout(45000),
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.error || "Analysis failed.");
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

                  <section className="sidebar-section insight-card">
                    <div className="section-heading">
                      <span className="eyebrow">MATCH PULSE</span>
                      <Activity size={14} className="pulse-icon" />
                    </div>
                    <div className="pulse-main">
                      <span>TACTICAL TEMPO</span>
                      <strong>
                        —<small>/ 100</small>
                      </strong>
                    </div>
                    <div className="pulse-meter">
                      <i />
                    </div>
                    <div className="pulse-notes">
                      <span>
                        <ArrowUpRight size={12} /> PRESSURE
                      </span>
                      <span>
                        <ArrowDownRight size={12} /> POSSESSION
                      </span>
                    </div>
                    <p>
                      Ask TactIQ to uncover the patterns behind the numbers.
                    </p>
                  </section>
                </>
              )}

              <div className="sidebar-foot">
                <span className="azure-orbit">✦</span>
                <span>
                  POWERED BY <b>MICROSOFT AZURE AI</b>
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
                    YOUR TACTICAL DESK
                  </div>
                  <h2>
                    Every moment has a <em>pattern.</em>
                  </h2>
                  <p>
                    Ask the match a question. Get the insight behind the action.
                  </p>
                </div>
                <div className="workspace-meta">
                  <span className="meta-led" /> ANALYSIS ENGINE <b>GPT-4o</b>
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
                                <AnalysisCard breakdown={message.breakdown} />
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
      </section>
    </main>
  );
}
