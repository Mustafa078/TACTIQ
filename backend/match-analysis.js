const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "before",
  "by",
  "can",
  "did",
  "do",
  "does",
  "for",
  "from",
  "give",
  "hey",
  "hi",
  "hello",
  "how",
  "in",
  "is",
  "it",
  "me",
  "of",
  "on",
  "please",
  "show",
  "summarize",
  "tell",
  "the",
  "their",
  "this",
  "to",
  "thanks",
  "was",
  "what",
  "were",
  "which",
  "who",
  "why",
  "with",
]);

const TOPIC_TYPES = {
  shot: ["shot", "attempt", "finish"],
  pressure: ["pressure", "press"],
  pass: ["pass", "distribution"],
  tackle: ["tackle"],
  interception: ["interception"],
  carry: ["carry", "dribble"],
  goal: ["goal"],
};

function eventSeconds(event) {
  const timestamp = String(event.timestamp || "");
  const match = timestamp.match(/(\d+)(?::(\d{1,2}))?/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const minutes = Number(match[1]);
  const seconds = Number(match[2] || 0);
  const halfOffset = /2nd|second/i.test(String(event.period || ""))
    ? 45 * 60
    : 0;
  return halfOffset + minutes * 60 + seconds;
}

function sortEvents(events) {
  return events
    .map((event, index) => ({ event, index }))
    .sort(
      (a, b) =>
        eventSeconds(a.event) - eventSeconds(b.event) || a.index - b.index,
    )
    .map(({ event }) => event);
}

function searchableText(event) {
  return Object.entries(event)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${key} ${value}`)
    .join(" ")
    .toLocaleLowerCase();
}

function topicMatches(eventType, topic) {
  const type = String(eventType || "").toLocaleLowerCase();
  return type === topic || type.includes(topic);
}

function filterRelevantEvents(userQuery, events, limit = 24) {
  const query = userQuery.toLocaleLowerCase();
  const queryTokens = query.match(/[\p{L}\p{N}]+/gu) || [];
  const tokens = queryTokens.filter(
    (token) => token.length > 1 && !STOP_WORDS.has(token),
  );
  const topics = new Set();

  for (const [topic, aliases] of Object.entries(TOPIC_TYPES)) {
    if (aliases.some((alias) => query.includes(alias))) topics.add(topic);
  }

  const scored = events.map((event, index) => {
    const text = searchableText(event);
    let score = 0;
    if ([...topics].some((topic) => topicMatches(event.event_type, topic)))
      score += 5;

    const player = String(event.player || "").toLocaleLowerCase();
    const team = String(event.team || "").toLocaleLowerCase();
    if (player.length > 2 && query.includes(player)) score += 8;
    if (team.length > 2 && query.includes(team)) score += 6;

    for (const token of tokens) {
      if (text.includes(token)) score += 2;
    }

    return { event, index, score };
  });

  let ranked = scored.filter((item) => item.score > 0);
  if (ranked.length === 0) {
    ranked = scored.map((item) => ({
      ...item,
      score:
        (item.event.goal ? 12 : 0) +
        (topicMatches(item.event.event_type, "goal") ? 10 : 0) +
        (topicMatches(item.event.event_type, "shot") ? 6 : 0) +
        (topicMatches(item.event.event_type, "pressure")
          ? Number(item.event.pressure_intensity_rating) || 0
          : 0),
    }));
  }

  const selected = new Set(
    ranked
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, limit)
      .map((item) => item.index),
  );

  for (const index of [...selected]) {
    if (selected.size >= limit + 6) break;
    if (index > 0) selected.add(index - 1);
    if (index < events.length - 1 && selected.size < limit + 6)
      selected.add(index + 1);
  }

  const filtered = [...selected]
    .sort((a, b) => a - b)
    .map((index) => events[index])
    .slice(0, limit + 6);

  return {
    events: filtered,
    relevantEventIds: filtered.map((event) => event.event_id),
    criteria: {
      queryTerms: tokens,
      eventTypes: [...topics],
      matchedEvents: ranked.filter((item) => item.score > 0).length,
      includedContextNeighbors: Math.max(
        0,
        filtered.length - Math.min(limit, ranked.length),
      ),
    },
  };
}

function average(values) {
  if (!values.length) return null;
  return Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2),
  );
}

function computeMetrics(events) {
  const byTeam = {};
  const byType = {};
  const pressureRatings = [];
  const passDistances = [];
  const passAccuracies = [];
  const passDifficulties = [];
  const speeds = [];
  const playerSpeeds = [];
  const shotSpeeds = [];
  const xgValues = [];
  const speedThresholdAlerts = [];
  let passSuccesses = 0;
  let passesWithOutcome = 0;
  let goals = 0;
  let transitionEvents = 0;
  let controlEvents = 0;

  for (const event of events) {
    const type = String(event.event_type || "unknown").toLocaleLowerCase();
    const team = event.team || "Unspecified team";
    byType[type] = (byType[type] || 0) + 1;
    byTeam[team] ||= { events: 0, shots: 0, goals: 0, passes: 0, pressures: 0 };
    byTeam[team].events += 1;

    if (
      typeof event.player_speed_kmh === "number" &&
      Number.isFinite(event.player_speed_kmh)
    ) {
      playerSpeeds.push(event.player_speed_kmh);
      if (event.player_speed_kmh >= 30.0) {
        speedThresholdAlerts.push({
          eventId: event.event_id,
          timestamp: event.timestamp,
          player: event.player,
          team: event.team,
          speedKmh: event.player_speed_kmh,
          type: "SPRINT_BURST",
        });
      }
    }

    if (
      event.control_chaos_state === "high_tempo_transition" ||
      type === "shot" ||
      (event.player_speed_kmh || 0) >= 28.5
    ) {
      transitionEvents += 1;
    } else {
      controlEvents += 1;
    }

    if (type === "shot") {
      byTeam[team].shots += 1;
      if (typeof event.xg === "number" && Number.isFinite(event.xg))
        xgValues.push(event.xg);
      if (
        typeof event.shot_speed_kmh === "number" &&
        Number.isFinite(event.shot_speed_kmh)
      ) {
        shotSpeeds.push(event.shot_speed_kmh);
      }
      if (event.goal === true) {
        goals += 1;
        byTeam[team].goals += 1;
      }
    }
    if (type === "pass") {
      byTeam[team].passes += 1;
      if (
        typeof event.pass_distance_m === "number" &&
        Number.isFinite(event.pass_distance_m)
      ) {
        passDistances.push(event.pass_distance_m);
      }
      if (
        typeof event.pass_accuracy === "number" &&
        Number.isFinite(event.pass_accuracy)
      ) {
        passAccuracies.push(event.pass_accuracy);
      }
      if (
        typeof event.pass_difficulty_rating === "number" &&
        Number.isFinite(event.pass_difficulty_rating)
      ) {
        passDifficulties.push(event.pass_difficulty_rating);
      }
      if (typeof event.success === "boolean") {
        passesWithOutcome += 1;
        if (event.success) passSuccesses += 1;
      }
    }
    if (type === "pressure") {
      byTeam[team].pressures += 1;
      if (
        typeof event.pressure_intensity_rating === "number" &&
        Number.isFinite(event.pressure_intensity_rating)
      ) {
        pressureRatings.push(event.pressure_intensity_rating);
      }
    }
    if (
      typeof event.ball_speed_kmh === "number" &&
      Number.isFinite(event.ball_speed_kmh)
    ) {
      speeds.push(event.ball_speed_kmh);
    }
  }

  const totalRhythm = controlEvents + transitionEvents || 1;
  const controlScore = Math.round((controlEvents / totalRhythm) * 100);
  const chaosScore = 100 - controlScore;

  return {
    analyzedEventCount: events.length,
    eventCountsByType: byType,
    eventCountsByTeam: byTeam,
    goals,
    expectedGoalsTotal: xgValues.length
      ? Number(xgValues.reduce((sum, value) => sum + value, 0).toFixed(2))
      : null,
    meanShotXg: average(xgValues),
    passOutcomeCompletionRate: passesWithOutcome
      ? Number(((passSuccesses / passesWithOutcome) * 100).toFixed(1))
      : null,
    meanReportedPassAccuracy: average(passAccuracies),
    meanPassDistanceMeters: average(passDistances),
    meanPassDifficulty: average(passDifficulties),
    meanPressureRating: average(pressureRatings),
    highestPressureRating: pressureRatings.length
      ? Math.max(...pressureRatings)
      : null,
    maxBallSpeedKmh: speeds.length ? Math.max(...speeds) : null,
    maxPlayerSpeedKmh: playerSpeeds.length ? Math.max(...playerSpeeds) : null,
    maxShotSpeedKmh: shotSpeeds.length ? Math.max(...shotSpeeds) : null,
    speedThresholdAlerts,
    controlChaosIndex: {
      controlScore,
      chaosScore,
      summary:
        controlScore >= 60
          ? "Controlled possession dominance with structured territorial buildup"
          : controlScore <= 40
            ? "High-intensity transition chaos with rapid counter-pressing"
            : "Balanced contest fluctuating between positional control and explosive transitions",
    },
    metricsAvailability: {
      passOutcomeEvents: passesWithOutcome,
      xgEvents: xgValues.length,
      pressureRatingEvents: pressureRatings.length,
      ballSpeedEvents: speeds.length,
    },
  };
}

function buildTacticalContext(events) {
  return events.map((event, index) => ({
    event_id: event.event_id,
    previous_event_id: events[index - 1]?.event_id ?? null,
    next_event_id: events[index + 1]?.event_id ?? null,
    sequence: `${event.timestamp} ${event.team}: ${event.player} ${event.event_type} in ${event.zone}`,
  }));
}

module.exports = {
  buildTacticalContext,
  computeMetrics,
  eventSeconds,
  filterRelevantEvents,
  sortEvents,
};
