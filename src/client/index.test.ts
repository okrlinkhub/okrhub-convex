import { describe, expect, test } from "vitest";
import { exposeApi, generateExternalId, validateExternalId } from "./index.js";
import { anyApi, type ApiFromModules } from "convex/server";
import { components, initConvexTest } from "./setup.test.js";

export const { insertObjective, getPendingSyncItems } = exposeApi(components.okrhub, {
  auth: async (ctx, _operation) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
  },
});

const testApi = (
  anyApi as unknown as ApiFromModules<{
    "index.test": {
      insertObjective: typeof insertObjective;
      getPendingSyncItems: typeof getPendingSyncItems;
    };
  }>
)["index.test"];

describe("client API tests", () => {
  test("should insert objective and add to sync queue", async () => {
    const t = initConvexTest().withIdentity({
      subject: "user1",
    });

    const externalId = generateExternalId("test-app", "objective");
    const teamExternalId = generateExternalId("test-app", "team");

    const result = await t.mutation(testApi.insertObjective, {
      objective: {
        externalId,
        title: "Test Objective",
        description: "Test description",
        teamExternalId,
      },
    });

    expect(result.success).toBe(true);
    expect(result.externalId).toBe(externalId);
    expect(result.queueId).toBeDefined();
  });

  test("should get pending sync items", async () => {
    const t = initConvexTest().withIdentity({
      subject: "user1",
    });

    // First insert an objective
    const externalId = generateExternalId("test-app", "objective");
    const teamExternalId = generateExternalId("test-app", "team");

    await t.mutation(testApi.insertObjective, {
      objective: {
        externalId,
        title: "Test Objective",
        description: "Test description",
        teamExternalId,
      },
    });

    // Then get pending items
    const pendingItems = await t.query(testApi.getPendingSyncItems, {
      limit: 10,
    });

    expect(pendingItems.length).toBeGreaterThan(0);
    expect(pendingItems[0].status).toBe("pending");
  });
});

describe("externalId utilities", () => {
  test("should generate valid external IDs", () => {
    const id = generateExternalId("my-app", "objective");
    expect(id).toMatch(/^my-app:objective:[0-9a-f-]{36}$/);
    expect(validateExternalId(id)).toBe(true);
  });

  test("should validate external ID format", () => {
    expect(validateExternalId("my-app:objective:123e4567-e89b-12d3-a456-426614174000")).toBe(true);
    expect(validateExternalId("invalid-format")).toBe(false);
    expect(validateExternalId("")).toBe(false);
  });
});
