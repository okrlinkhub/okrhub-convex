import { httpRouter } from "convex/server";
import { registerRoutes } from "../../src/client/index.js";
import { components } from "./_generated/api";

const http = httpRouter();

// Register HTTP routes for the OKRHub component
// This exposes endpoints like /okrhub/health and /okrhub/queue/pending
registerRoutes(http, components.okrhub, {
  pathPrefix: "/okrhub",
});

export default http;
