const fs = require("fs");
const path = require("path");

const playersHome = [
  "Martin Ødegaard",
  "Bukayo Saka",
  "Declan Rice",
  "William Saliba",
  "Kai Havertz",
  "Gabriel Martinelli",
];
const playersAway = [
  "James Maddison",
  "Son Heung-min",
  "Dejan Kulusevski",
  "Cristian Romero",
  "Yves Bissouma",
  "Pedro Porro",
];
const eventTypes = [
  "pass",
  "pressure",
  "tackle",
  "shot",
  "carry",
  "interception",
];
const zones = [
  "Defensive Third",
  "Midfield Third",
  "Attacking Third",
  "Penalty Area",
];

function generateMatchEvents(count = 100) {
  const events = [];
  const playerDistance = {};
  [...playersHome, ...playersAway].forEach((p) => {
    playerDistance[p] = parseFloat((Math.random() * 2 + 1.5).toFixed(2));
  });

  for (let i = 1; i <= count; i++) {
    const isHome = Math.random() > 0.44;
    const team = isHome ? "Arsenal" : "Tottenham";
    const playerPool = isHome ? playersHome : playersAway;
    const player = playerPool[Math.floor(Math.random() * playerPool.length)];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const minute = Math.min(90, Math.max(1, Math.floor((i / count) * 90) + 1));
    const seconds = Math.floor(Math.random() * 60)
      .toString()
      .padStart(2, "0");

    // Track distance
    playerDistance[player] = parseFloat(
      (playerDistance[player] + Math.random() * 0.12).toFixed(2),
    );

    // Realistic player speeds: base movement 16-24 km/h; occasional high sprint 30.0 - 34.5 km/h
    const isSprintBurst = Math.random() > 0.78;
    const playerSpeed = isSprintBurst
      ? parseFloat((Math.random() * 4.5 + 30.1).toFixed(1))
      : parseFloat((Math.random() * 8 + 18).toFixed(1));

    // Tactical rhythm: Control vs Chaos
    const zone = zones[Math.floor(Math.random() * zones.length)];
    const isTransition =
      zone === "Attacking Third" || zone === "Penalty Area" || isSprintBurst;
    const controlChaosState = isTransition
      ? "high_tempo_transition"
      : "controlled_possession";

    let eventDetails = {
      event_id: i,
      timestamp: `${minute < 10 ? "0" + minute : minute}:${seconds}`,
      period: minute <= 45 ? "1st Half" : "2nd Half",
      team,
      player,
      event_type: eventType,
      zone,
      player_speed_kmh: playerSpeed,
      speed_threshold_triggered: playerSpeed >= 30.0,
      cumulative_distance_km: playerDistance[player],
      control_chaos_state: controlChaosState,
    };

    // Metric-specific attributes
    if (eventType === "pass") {
      eventDetails.pass_distance_m = parseFloat(
        (Math.random() * 32 + 6).toFixed(1),
      );
      eventDetails.pass_accuracy = parseFloat(
        (Math.random() * 0.28 + 0.72).toFixed(2),
      );
      eventDetails.pass_difficulty_rating = parseFloat(
        (Math.random() * 4.5 + 5.5).toFixed(1),
      );
      eventDetails.ball_speed_kmh = parseFloat(
        (Math.random() * 25 + 40).toFixed(1),
      );
      eventDetails.success = Math.random() > 0.16;
    } else if (eventType === "pressure") {
      eventDetails.pressure_intensity_rating = parseFloat(
        (Math.random() * 4 + 6).toFixed(1),
      );
    } else if (eventType === "shot") {
      const shotSpeed = parseFloat((Math.random() * 35 + 85).toFixed(1));
      eventDetails.shot_speed_kmh = shotSpeed;
      eventDetails.ball_speed_kmh = shotSpeed;
      eventDetails.xg = parseFloat((Math.random() * 0.52 + 0.06).toFixed(2));
      eventDetails.goal = Math.random() > 0.82;
    } else if (eventType === "carry") {
      eventDetails.carry_distance_m = parseFloat(
        (Math.random() * 18 + 4).toFixed(1),
      );
    }

    events.push(eventDetails);
  }

  // Sort chronologically
  events.sort((a, b) => {
    const parse = (ts) => {
      const [m, s] = ts.split(":").map(Number);
      return m * 60 + s;
    };
    return parse(a.timestamp) - parse(b.timestamp);
  });
  events.forEach((ev, idx) => {
    ev.event_id = idx + 1;
  });

  return {
    match_id: "SYN-PL-2026-NLD01",
    fixture: "Arsenal vs Tottenham Hotspur",
    competition: "Premier League (Synthetic Feed)",
    total_events_count: count,
    events,
  };
}

const targetPath = path.join(__dirname, "matchData.json");
const dataset = generateMatchEvents(100);
fs.writeFileSync(targetPath, JSON.stringify(dataset, null, 2));
console.log(
  `Successfully generated ${dataset.events.length} rich synthetic match events in matchData.json!`,
);
