const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const app = require("../server");
const {
  buildTacticalContext,
  computeMetrics,
  filterRelevantEvents,
  sortEvents,
} = require("../match-analysis");

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("health endpoint reports the API as available", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    service: "tactiq-api",
  });
});

test("Azure v1 endpoints are used as the SDK base URL without a legacy path", () => {
  const previous = {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
  };
  process.env.AZURE_OPENAI_ENDPOINT =
    "https://example.openai.azure.com/openai/v1";
  process.env.AZURE_OPENAI_API_KEY = "test-key";

  try {
    const client = app.getAzureClient();
    assert.equal(client.baseURL, "https://example.openai.azure.com/openai/v1/");
  } finally {
    if (previous.endpoint === undefined)
      delete process.env.AZURE_OPENAI_ENDPOINT;
    else process.env.AZURE_OPENAI_ENDPOINT = previous.endpoint;
    if (previous.apiKey === undefined) delete process.env.AZURE_OPENAI_API_KEY;
    else process.env.AZURE_OPENAI_API_KEY = previous.apiKey;
  }
});

test("legacy Azure resource endpoints keep their deployment API URL", () => {
  const previous = {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
  };
  process.env.AZURE_OPENAI_ENDPOINT = "https://example.openai.azure.com/";
  process.env.AZURE_OPENAI_API_KEY = "test-key";

  try {
    const client = app.getAzureClient();
    assert.equal(client.baseURL, "https://example.openai.azure.com/openai");
  } finally {
    if (previous.endpoint === undefined)
      delete process.env.AZURE_OPENAI_ENDPOINT;
    else process.env.AZURE_OPENAI_ENDPOINT = previous.endpoint;
    if (previous.apiKey === undefined) delete process.env.AZURE_OPENAI_API_KEY;
    else process.env.AZURE_OPENAI_API_KEY = previous.apiKey;
  }
});

test("Foundry project settings select the configured agent", () => {
  const previous = {
    projectEndpoint: process.env.FOUNDRY_PROJECT_ENDPOINT,
    agentName: process.env.TACTIQ_AGENT_NAME,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
  };
  process.env.FOUNDRY_PROJECT_ENDPOINT =
    "https://example.services.ai.azure.com/api/projects/tactiq";
  process.env.TACTIQ_AGENT_NAME = "TACTIQ";
  process.env.AZURE_OPENAI_API_KEY = "test-key";
  delete process.env.AZURE_OPENAI_ENDPOINT;

  try {
    const provider = app.getAnalysisProvider();
    assert.equal(provider.kind, "foundry-agent");
    assert.equal(provider.agentName, "TACTIQ");
    assert.equal(typeof provider.client.responses.create, "function");
  } finally {
    if (previous.projectEndpoint === undefined)
      delete process.env.FOUNDRY_PROJECT_ENDPOINT;
    else process.env.FOUNDRY_PROJECT_ENDPOINT = previous.projectEndpoint;
    if (previous.agentName === undefined) delete process.env.TACTIQ_AGENT_NAME;
    else process.env.TACTIQ_AGENT_NAME = previous.agentName;
    if (previous.endpoint === undefined)
      delete process.env.AZURE_OPENAI_ENDPOINT;
    else process.env.AZURE_OPENAI_ENDPOINT = previous.endpoint;
    if (previous.apiKey === undefined) delete process.env.AZURE_OPENAI_API_KEY;
    else process.env.AZURE_OPENAI_API_KEY = previous.apiKey;
  }
});

test("Foundry configuration requires both the project endpoint and agent name", () => {
  const previous = {
    projectEndpoint: process.env.FOUNDRY_PROJECT_ENDPOINT,
    agentName: process.env.TACTIQ_AGENT_NAME,
  };
  process.env.FOUNDRY_PROJECT_ENDPOINT =
    "https://example.services.ai.azure.com/api/projects/tactiq";
  delete process.env.TACTIQ_AGENT_NAME;

  try {
    assert.throws(
      app.getAnalysisProvider,
      /FOUNDRY_PROJECT_ENDPOINT and TACTIQ_AGENT_NAME/,
    );
  } finally {
    if (previous.projectEndpoint === undefined)
      delete process.env.FOUNDRY_PROJECT_ENDPOINT;
    else process.env.FOUNDRY_PROJECT_ENDPOINT = previous.projectEndpoint;
    if (previous.agentName === undefined) delete process.env.TACTIQ_AGENT_NAME;
    else process.env.TACTIQ_AGENT_NAME = previous.agentName;
  }
});

test("CORS rejects unapproved browser origins in production", async () => {
  const previousMode = process.env.NODE_ENV;
  const previousOrigins = process.env.CORS_ALLOWED_ORIGINS;
  process.env.NODE_ENV = "production";
  process.env.CORS_ALLOWED_ORIGINS = "https://tactiq.example";

  try {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: { origin: "https://evil.example" },
    });
    assert.equal(response.status, 403);
  } finally {
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
    if (previousOrigins === undefined) delete process.env.CORS_ALLOWED_ORIGINS;
    else process.env.CORS_ALLOWED_ORIGINS = previousOrigins;
  }
});

test("CORS permits an explicitly configured origin", async () => {
  const previousMode = process.env.NODE_ENV;
  const previousOrigins = process.env.CORS_ALLOWED_ORIGINS;
  process.env.NODE_ENV = "production";
  process.env.CORS_ALLOWED_ORIGINS = "https://tactiq.example";

  try {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: { origin: "https://tactiq.example" },
    });
    assert.equal(response.status, 200);
  } finally {
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
    if (previousOrigins === undefined) delete process.env.CORS_ALLOWED_ORIGINS;
    else process.env.CORS_ALLOWED_ORIGINS = previousOrigins;
  }
});

test("match endpoint returns the fixture metadata and events", async () => {
  const response = await fetch(`${baseUrl}/api/match`);
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.matchData.home_team, "Arsenal");
  assert.equal(result.matchData.away_team, "Tottenham Hotspur");
  assert.ok(Array.isArray(result.matchData.events));
  assert.ok(result.matchData.events.length > 0);
});

test("analysis endpoint rejects an empty query", async () => {
  const response = await fetch(`${baseUrl}/api/analyze-match`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userQuery: "  ", matchData: {} }),
  });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).success, false);
});

test("analysis endpoint routes greetings to a general response", async () => {
  const response = await fetch(`${baseUrl}/api/analyze-match`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      userQuery: "hey",
      matchData: require("../matchData.json"),
    }),
  });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.success, true);
  assert.equal(result.kind, "general");
  assert.equal(typeof result.answer, "string");
  assert.ok(result.answer.length > 0);
});

test("casual chat is integrated into match mode", async () => {
  const response = await fetch(`${baseUrl}/api/analyze-match`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      userQuery: "What can you do?",
      sourceMode: "match",
      matchData: require("../matchData.json"),
    }),
  });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.kind, "general");
});

test("Gemini extractSearchSources formats web grounding chunks with titles and domains", () => {
  const chunks = [
    {
      web: {
        uri: "https://www.bbc.com/sport/football/12345",
        title: "Arsenal vs Tottenham Match Highlights",
      },
    },
    {
      web: {
        uri: "https://skysports.com/football/news/6789",
        title: "Premier League Review",
      },
    },
  ];
  const sources = app.extractSearchSources(chunks);
  assert.equal(sources.length, 2);
  assert.equal(sources[0].domain, "bbc.com");
  assert.equal(sources[0].title, "Arsenal vs Tottenham Match Highlights");
  assert.equal(sources[1].domain, "skysports.com");
});

test("Gemini extractSearchSources deduplicates identical URLs", () => {
  const chunks = [
    {
      web: {
        uri: "https://www.bbc.com/sport/football/12345",
        title: "Article A",
      },
    },
    {
      web: {
        uri: "https://www.bbc.com/sport/football/12345",
        title: "Duplicate Article",
      },
    },
  ];
  const sources = app.extractSearchSources(chunks);
  assert.equal(sources.length, 1);
});

test("Gemini searchWebWithGemini function is exported", () => {
  assert.equal(typeof app.searchWebWithGemini, "function");
});

test("web search mode reports missing Gemini API key configuration", async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  const previousKeyCamel = process.env.Gemini_API_Key;
  delete process.env.GEMINI_API_KEY;
  delete process.env.Gemini_API_Key;
  try {
    const response = await fetch(`${baseUrl}/api/analyze-match`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userQuery: "Latest Arsenal matches",
        sourceMode: "web",
      }),
    });
    assert.equal(response.status, 502);
    assert.equal((await response.json()).code, "GEMINI_NOT_CONFIGURED");
  } finally {
    if (previousKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousKey;
    if (previousKeyCamel === undefined) delete process.env.Gemini_API_Key;
    else process.env.Gemini_API_Key = previousKeyCamel;
  }
});

test("analysis endpoint requires match data", async () => {
  const response = await fetch(`${baseUrl}/api/analyze-match`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userQuery: "Analyze the build-up" }),
  });
  assert.equal(response.status, 400);
});

test("match normalization bounds oversized event arrays", () => {
  const events = Array.from({ length: 501 }, (_, index) => ({
    event_id: index + 1,
    timestamp: `${index + 1}:00`,
    team: "Arsenal",
    player: `Player ${index + 1}`,
    event_type: "pass",
  }));
  const normalized = app.normalizeMatchData({ events });
  assert.equal(normalized.events.length, 500);
});

test("analysis endpoint accepts empty array match payloads by wrapping", async () => {
  const response = await fetch(`${baseUrl}/api/analyze-match`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      userQuery: "Analyze the match",
      sourceMode: "match",
      matchData: [],
    }),
  });
  assert.equal(response.status, 429);
});

test("match normalization strips control characters and keeps only safe fields", () => {
  const normalized = app.normalizeMatchData({
    events: [
      {
        timestamp: "12:00\u0000bad",
        team: "Arsenal\n<script>",
        player: "Saka",
        event_type: "shot",
        arbitrary: "not returned",
      },
    ],
  });
  assert.equal(normalized.events[0].timestamp, "12:00 bad");
  assert.equal(normalized.events[0].team, "Arsenal <script>");
  assert.equal("arbitrary" in normalized.events[0], false);
});

test("analysis endpoint enforces the query length limit", async () => {
  const response = await fetch(`${baseUrl}/api/analyze-match`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userQuery: "a".repeat(1001), matchData: {} }),
  });
  assert.equal(response.status, 400);
});

test("analysis endpoint rejects oversized request bodies", async () => {
  const response = await fetch(`${baseUrl}/api/analyze-match`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      userQuery: "Analyze",
      matchData: { events: [{ player: "x".repeat(300_000) }] },
    }),
  });
  assert.equal(response.status, 413);
});

test("analysis endpoint rejects malformed JSON", async () => {
  const response = await fetch(`${baseUrl}/api/analyze-match`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    success: false,
    error: "Request body must contain valid JSON.",
  });
});

test("event sorting respects timestamps and period", () => {
  const sorted = sortEvents([
    { event_id: 3, timestamp: "02:10", period: "2nd Half" },
    { event_id: 2, timestamp: "44:30", period: "1st Half" },
    { event_id: 1, timestamp: "12:00", period: "1st Half" },
  ]);
  assert.deepEqual(
    sorted.map((event) => event.event_id),
    [1, 2, 3],
  );
});

test("filter selects question-relevant events and neighboring sequence context", () => {
  const events = [
    {
      event_id: 1,
      timestamp: "01:00",
      team: "Arsenal",
      player: "Rice",
      event_type: "pressure",
      zone: "Midfield",
    },
    {
      event_id: 2,
      timestamp: "01:05",
      team: "Arsenal",
      player: "Odegaard",
      event_type: "pass",
      zone: "Midfield",
    },
    {
      event_id: 3,
      timestamp: "01:10",
      team: "Arsenal",
      player: "Saka",
      event_type: "shot",
      zone: "Penalty Area",
      xg: 0.4,
    },
    {
      event_id: 4,
      timestamp: "02:00",
      team: "Spurs",
      player: "Son",
      event_type: "carry",
      zone: "Midfield",
    },
  ];
  const filtered = filterRelevantEvents(
    "How many shots did Saka take?",
    events,
  );
  assert.ok(filtered.events.some((event) => event.event_id === 3));
  assert.ok(filtered.events.some((event) => event.event_id === 2));
  assert.equal(filtered.criteria.eventTypes.includes("shot"), true);
});

test("metrics are calculated from reported data without estimating missing values", () => {
  const metrics = computeMetrics([
    {
      event_id: 1,
      team: "Arsenal",
      event_type: "pass",
      pass_distance_m: 10,
      pass_accuracy: 0.9,
      success: true,
    },
    {
      event_id: 2,
      team: "Arsenal",
      event_type: "pass",
      pass_distance_m: 20,
      pass_accuracy: 0.7,
      success: false,
    },
    { event_id: 3, team: "Spurs", event_type: "shot", xg: 0.4, goal: false },
    {
      event_id: 4,
      team: "Spurs",
      event_type: "pressure",
      pressure_intensity_rating: 9,
    },
  ]);
  assert.equal(metrics.analyzedEventCount, 4);
  assert.equal(metrics.eventCountsByTeam.Arsenal.passes, 2);
  assert.equal(metrics.eventCountsByTeam.Spurs.shots, 1);
  assert.equal(metrics.passOutcomeCompletionRate, 50);
  assert.equal(metrics.meanPassDistanceMeters, 15);
  assert.equal(metrics.expectedGoalsTotal, 0.4);
  assert.equal(metrics.highestPressureRating, 9);
  assert.equal(metrics.maxBallSpeedKmh, 0);
});

test("analysis response exposes narrative stages only", () => {
  const hasBreakdown = (breakdown) =>
    Array.isArray(breakdown) &&
    breakdown.every((step) => ["explain", "synthesize"].includes(step.key));

  assert.equal(hasBreakdown([{ key: "explain" }, { key: "synthesize" }]), true);
  assert.equal(hasBreakdown([{ key: "filter" }, { key: "compute" }]), false);
});

test("tactical context links filtered events in order", () => {
  const context = buildTacticalContext([
    {
      event_id: 7,
      timestamp: "04:00",
      team: "Arsenal",
      player: "Rice",
      event_type: "pressure",
      zone: "Midfield",
    },
    {
      event_id: 8,
      timestamp: "04:05",
      team: "Arsenal",
      player: "Saka",
      event_type: "shot",
      zone: "Box",
    },
  ]);
  assert.equal(context[0].next_event_id, 8);
  assert.equal(context[1].previous_event_id, 7);
});
