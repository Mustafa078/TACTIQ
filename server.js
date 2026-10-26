const path = require("node:path");
const app = require("./backend/server");

const PORT = 3000;
const HOST = "0.0.0.0";

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
    // Vite dev server middleware for HMR and instant JSX bundling
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: HOST,
        port: PORT,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  return new Promise((resolve) => {
    const server = app.listen(PORT, HOST, () => {
      console.log(`TactIQ Match Intelligence Studio running on http://${HOST}:${PORT}`);
      resolve(server);
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
