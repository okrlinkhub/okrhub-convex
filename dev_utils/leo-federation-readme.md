@l_ego/federation
Near-real-time data federation component for Convex. Synchronize data between multiple Convex deployments with automatic conflict resolution using Last-Writer-Wins (LWW).

Features
Direct Dispatch - Events sent immediately via scheduler.runAfter(0), not polling
LWW Conflict Resolution - Automatic version-based conflict handling
Factory Functions - Minimal boilerplate in host applications
Dynamic Entity Mapping - Register entities at runtime via UI or API
Isolated Database - Component has its own tables, doesn't pollute your schema
Installation
npm install @l_ego/federation
Quick Start
1. Mount the Component
// convex/convex.config.ts
import { defineApp } from "convex/server";
import federation from "@l_ego/federation/convex.config";

const app = defineApp();
app.use(federation);
export default app;
2. Set Environment Variable
In your Convex dashboard → Settings → Environment Variables:

FEDERATION_SECRET=your-shared-secret-key-min-32-chars
⚠️ Use the same secret on all federated deployments.

3. Create API Wrappers
// convex/federation.ts
import { query, mutation } from "./_generated/server";
import { components } from "./_generated/api";
import { makeFederationApiWrappers } from "@l_ego/federation";

const w = makeFederationApiWrappers(components.federation);

// Entity Management
export const registerEntity = mutation(w.registerEntity);
export const listEntities = query(w.listEntities);
export const toggleEntity = mutation(w.toggleEntity);
export const removeEntity = mutation(w.removeEntity);

// Connection Management
export const addConnection = mutation(w.addConnection);
export const listConnections = query(w.listConnections);
export const removeConnection = mutation(w.removeConnection);
export const testConnection = mutation(w.testConnection);
export const getConnection = query(w.getConnection);

// Event Management
export const listEvents = query(w.listEvents);
export const getEventStats = query(w.getEventStats);
export const retryEvent = mutation(w.retryEvent);
export const clearOldEvents = mutation(w.clearOldEvents);

// Manual Sync
export const syncNow = mutation(w.syncNow);
4. Wrap Your Mutations
// convex/users.ts
import { mutation, query } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";
import { makeSyncedHandlers } from "@l_ego/federation";

const { syncedCreate, syncedUpdate, syncedDelete } = makeSyncedHandlers(components.federation);

export const createUser = mutation({
  args: { email: v.string(), name: v.string() },
  handler: syncedCreate("User", async (ctx, args) => {
    return await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      version: 1,
      updatedAt: Date.now(),
    });
  }),
});

export const updateUser = mutation({
  args: { userId: v.id("users"), name: v.string() },
  handler: syncedUpdate("User", async (ctx, { userId, name }) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    
    await ctx.db.patch(userId, {
      name,
      version: (user.version || 0) + 1,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(userId);
  }),
});

export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: syncedDelete("User", async (ctx, { userId }) => {
    await ctx.db.delete(userId);
    return { _id: userId };
  }),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});
5. Create Federation Handler
// convex/federationHandler.ts
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { makeFederationDataHandler } from "@l_ego/federation";

export const applyFederatedData = internalMutation({
  args: {
    entityName: v.string(),
    tableName: v.string(),
    operation: v.union(v.literal("create"), v.literal("update"), v.literal("delete")),
    data: v.any(),
    version: v.number(),
    localId: v.optional(v.string()),
  },
  handler: makeFederationDataHandler(),
});
6. Create HTTP Routes
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { components, internal } from "./_generated/api";
import {
  makeFederationHttpHandler,
  makeFederationHealthHandler,
} from "@l_ego/federation";

const http = httpRouter();

http.route({
  path: "/federation/receive",
  method: "POST",
  handler: httpAction(
    makeFederationHttpHandler(
      components.federation,
      internal.federationHandler.applyFederatedData,
      "my-app"
    )
  ),
});

http.route({
  path: "/federation/health",
  method: "GET",
  handler: httpAction(makeFederationHealthHandler("my-app")),
});

export default http;
How It Works
Direct Dispatch (Not Polling!)
When you call a synced mutation:

Your handler executes normally
enqueueEvent creates a federation event
Immediately schedules sendEvent via ctx.scheduler.runAfter(0, ...)
Event is sent to all active connections in milliseconds
The cron job runs every 5 minutes only to retry failed events, not for normal dispatch.

Outbound Flow
createUser() → syncedCreate() → enqueueEvent → scheduler.runAfter(0) → sendEvent → HTTP POST
Inbound Flow
HTTP POST /federation/receive → validateEvent → applyFederatedData → recordEventApplied
Sync Strategies
Strategy	Behavior
push	Send local changes to remote instances only
pull	Receive changes from remote instances only
bidirectional	Both send and receive changes
Required Table Schema
Your federated tables must include version fields for LWW:

// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    // Required for federation:
    version: v.number(),
    updatedAt: v.number(),
  }),
});
Architecture
┌─────────────────────────────────────────────────────────────┐
│                      Host Application                       │
│                                                             │
│  ┌─────────────────┐     ┌──────────────────────────────┐  │
│  │ convex/users.ts │     │ convex/federation.ts         │  │
│  │ syncedCreate()  │     │ API wrappers for frontend    │  │
│  │ syncedUpdate()  │     └──────────────────────────────┘  │
│  │ syncedDelete()  │                                       │
│  └────────┬────────┘                                       │
│           │                                                │
│  ┌────────▼─────────────────────────────────────────────┐  │
│  │              Federation Component                     │  │
│  │                                                       │  │
│  │  enqueueEvent → scheduler.runAfter(0) → sendEvent    │  │
│  │        (IMMEDIATE DISPATCH - NOT POLLING)            │  │
│  │                                                       │  │
│  │  Tables: federation_events, federation_entities,      │  │
│  │          federation_connections, federation_id_map    │  │
│  │                                                       │  │
│  │  Cron: retryFailedEvents (every 5 min, fallback only)│  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ convex/http.ts → /federation/receive                 │  │
│  │ convex/federationHandler.ts → writes to YOUR tables  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
               HTTP POST /federation/receive (immediate)
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Remote Application                       │
└─────────────────────────────────────────────────────────────┘
API Reference
Factory Functions
All factory functions are imported from @l_ego/federation:

Function	Purpose
makeFederationApiWrappers(component)	Generate API wrappers for frontend
makeSyncedHandlers(component)	Wrap CRUD mutations for auto-sync
makeFederationDataHandler()	Handle incoming federated data
makeFederationHttpHandler(component, mutation, appName)	HTTP endpoint handler
makeFederationHealthHandler(appName)	Health check endpoint
Synced Handlers
const { syncedCreate, syncedUpdate, syncedDelete } = makeSyncedHandlers(components.federation);

// syncedCreate(entityName, handler) - wraps create operations
// syncedUpdate(entityName, handler) - wraps update operations
// syncedDelete(entityName, handler) - wraps delete operations
API Functions (via wrappers)
Function	Description
registerEntity({ name, table, strategy })	Register entity for federation
listEntities()	List all entities
toggleEntity({ entityId, enabled })	Enable/disable entity
removeEntity({ entityId })	Remove entity
addConnection({ projectId, url, secret })	Add connection
listConnections()	List connections
getConnection({ projectId })	Get specific connection
removeConnection({ connectionId })	Remove connection
testConnection({ connectionId })	Test connection
listEvents({ limit?, status?, entityName? })	List events
getEventStats()	Get statistics
retryEvent({ eventId })	Retry failed event
clearOldEvents({ olderThanDays })	Clean up old events
syncNow({ entityName?, entityId? })	Manual sync trigger
TypeScript Types
The package exports useful types:

import type {
  ComponentApi,
  EventOperation,
  FederationDataArgs,
  FederationDataResult,
  FederationEntity,
  FederationConnection,
  FederationEvent,
  FederationEventStats,
} from "@l_ego/federation";
Setup Checklist
For each federated deployment:

[ ] Install @l_ego/federation
[ ] Mount component in convex/convex.config.ts
[ ] Set FEDERATION_SECRET environment variable (same on all deployments)
[ ] Create convex/federation.ts with API wrappers
[ ] Wrap mutations with syncedCreate/Update/Delete
[ ] Create convex/federationHandler.ts
[ ] Create convex/http.ts with federation routes
[ ] Register entities via registerEntity()
[ ] Add connections via addConnection() (URL must be .convex.site)
Troubleshooting
Events not syncing?
Check entity is registered and enabled: listEntities()
Check connections are online: listConnections()
Check for failed events: listEvents({ status: "failed" })
Verify FEDERATION_SECRET is identical on all deployments
Signature verification failed?
FEDERATION_SECRET must be exactly the same (check whitespace)
Minimum 32 characters recommended
HTTP 404 on /federation/receive?
Ensure convex/http.ts exports the router as default
URL must use .convex.site (not .convex.cloud)
Component not mounting?
Run npx convex dev to regenerate types
Check _generated/api.d.ts includes components.federation
License
MIT

Readme
Keywords
convexfederationsyncreal-timereplicationdistributedmulti-tenant