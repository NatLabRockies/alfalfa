import fsp from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import bodyParser from "body-parser";
import compression from "compression";
import history from "connect-history-api-fallback";
import express from "express";
import { MongoClient } from "mongodb";
import morgan from "morgan";
import { createClient } from "redis";
import PACERAPI from "./api";
import apiv2 from "./api-v2";

const isProd = process.env.NODE_ENV === "production";

// Utility function to wait for services with retry logic
async function waitForService(serviceName, checkFunction, maxRetries = 30, retryDelay = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempting to connect to ${serviceName} (attempt ${attempt}/${maxRetries})`);
      const result = await checkFunction();
      console.log(`Successfully connected to ${serviceName}`);
      return result;
    } catch (error) {
      console.warn(`Failed to connect to ${serviceName}: ${error.message}`);

      if (attempt < maxRetries) {
        console.log(`Waiting ${retryDelay}ms before retrying ${serviceName}`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }
  throw new Error(`Failed to connect to ${serviceName} after ${maxRetries} attempts`);
}

async function setupRedisConnection() {
  return waitForService("Redis", async () => {
    const redis = createClient({ url: process.env.REDIS_URL });
    redis.on("error", (err) => console.error("Redis Client Error", err));
    await redis.connect();

    // Test the connection
    await redis.ping();
    console.log(`Redis URL: ${process.env.REDIS_URL}`);
    return redis;
  });
}

async function setupMongoConnection() {
  return waitForService("MongoDB", async () => {
    const mongoUrl = process.env.MONGO_URL;
    console.log(`MongoDB URL: ${mongoUrl}`);

    const mongoClient = await MongoClient.connect(mongoUrl, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });

    // Test the connection
    await mongoClient.db().admin().ping();

    return { client: mongoClient, db: mongoClient.db() };
  });
}

(async () => {
  // Setup connections incrementally
  const redis = await setupRedisConnection();
  const { client: mongoClient, db } = await setupMongoConnection();

  const app = express();
  app.disable("x-powered-by");
  app.use(compression({ threshold: 0 }));
  app.locals.api = new PACERAPI(db, redis);

  if (process.env.LOGGING === "true") {
    app.use(morgan("combined"));
  }

  app.use(bodyParser.text({ type: "text/*" }));
  // If you are using JSON instead of ZINC you need this
  app.use((req, res, next) => {
    bodyParser.json()(req, res, (err) => {
      if (err) return res.status(400).json({ error: "Invalid JSON" });
      next();
    });
  });

  let cachedDocs;
  app.get("/redoc", async (req, res) => {
    if (isProd && cachedDocs) {
      return res.type("html").send(cachedDocs);
    }

    const docsPath = path.join(__dirname, "app/redoc-static.html");

    try {
      await fsp.access(docsPath, fsp.constants.F_OK);
      res.sendFile(docsPath);
      if (isProd) cachedDocs = await fsp.readFile(docsPath, "utf-8");
    } catch (e) {
      res.status(404).type("txt").send("Documentation has not been generated");
    }
  });

  app.use("/api/v2/", apiv2({ api: app.locals.api }));

  // Redirect incomplete and nonexistent API URLs to /docs
  app.get("/api/*", (req, res) => {
    res.redirect(301, "/docs");
  });

  app.use(history());
  app.use("/", express.static(path.join(__dirname, "app")));

  const server = app.listen(80, () => {
    let { address: host, port } = server.address();
    if (host.length === 0 || host === "::") host = "localhost";

    console.log(`PACER Webservice listening at http://${host}:${port}`);
  });
})();
