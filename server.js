const path = require("node:path");
const app = require("./backend/server");

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const HOST = process.env.HOST || "0.0.0.0";

async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    const express = require("express");
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    // Vite dev server middleware without HMR websocket port conflict
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  process.on("unhandledRejection", (reason) => {
    console.warn("Handled promise rejection:", reason?.message || reason);
  });

  process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err?.message || err);
  });

  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, HOST, () => {
      console.log(`TactIQ Match Intelligence Studio running on http://${HOST}:${PORT}`);
      resolve(server);
    });
    server.on("error", (err) => {
      console.error("Server error:", err);
      reject(err);
    });
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}

module.exports = { startServer, app };
