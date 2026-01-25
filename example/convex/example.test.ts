import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { initConvexTest } from "./setup.test";
import { api } from "./_generated/api";

describe("OKRHub example", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
  });

  afterEach(async () => {
    vi.useRealTimers();
  });

  test("insertObjective adds to sync queue", async () => {
    const t = initConvexTest();

    const result = await t.mutation(api.example.insertObjective, {
      objective: {
        externalId: "test-app:objective:550e8400-e29b-41d4-a716-446655440000",
        title: "Test Objective",
        description: "A test objective for the OKRHub component",
        teamExternalId: "test-app:team:660e8400-e29b-41d4-a716-446655440001",
      },
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.externalId).toBe(
      "test-app:objective:550e8400-e29b-41d4-a716-446655440000"
    );
    expect(result.queueId).toBeDefined();
  });

  test("createObjectiveExample generates external ID", async () => {
    const t = initConvexTest();

    const result = await t.mutation(api.example.createObjectiveExample, {
      title: "Generated Objective",
      description: "An objective with auto-generated external ID",
      teamExternalId: "test-app:team:770e8400-e29b-41d4-a716-446655440002",
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.externalId).toMatch(/^example-app:objective:[a-f0-9-]{36}$/);
  });

  test("listPendingSync returns queued items", async () => {
    const t = initConvexTest();

    // First add an objective
    await t.mutation(api.example.insertObjective, {
      objective: {
        externalId: "test-app:objective:880e8400-e29b-41d4-a716-446655440003",
        title: "Pending Objective",
        description: "An objective waiting to sync",
        teamExternalId: "test-app:team:990e8400-e29b-41d4-a716-446655440004",
      },
    });

    // Then check the pending items
    const pendingItems = await t.query(api.example.listPendingSync, {});

    expect(pendingItems).toBeDefined();
    expect(pendingItems.length).toBeGreaterThan(0);
    expect(pendingItems[0].entityType).toBe("objective");
    expect(pendingItems[0].status).toBe("pending");
  });
});
