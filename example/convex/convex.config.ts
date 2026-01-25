import { defineApp } from "convex/server";
import okrhub from "../../src/component/convex.config.js";

const app = defineApp();
app.use(okrhub);

export default app;
