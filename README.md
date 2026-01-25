# @linkhub/okrhub

Convex component for syncing OKR data (Objectives, Key Results, Risks, Initiatives) to LinkHub via secure HMAC-authenticated API.

[![npm version](https://badge.fury.io/js/@linkhub%2Fokrhub.svg)](https://badge.fury.io/js/@linkhub%2Fokrhub)

## Overview

OKRHub is a Convex component that enables external applications to sync their OKR data to LinkHub. It provides:

- **One-way sync**: Data flows from your app to LinkHub
- **Queue-based processing**: Async processing with retry logic
- **HMAC authentication**: Secure API communication with cryptographic signatures
- **External ID mapping**: Use your own IDs, LinkHub handles the mapping
- **Company isolation**: Each API key is scoped to a specific company

## Architecture

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   Your App          │     │   @linkhub/okrhub   │     │      LinkHub        │
│   (Convex)          │     │    (Component)      │     │   (Server)          │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
         │                           │                           │
         │  insertObjective()        │                           │
         │ ────────────────────────► │                           │
         │                           │  Saves to syncQueue       │
         │                           │ ─────────┐                │
         │                           │          │                │
         │                           │ ◄────────┘                │
         │                           │                           │
         │  processSyncQueue()       │                           │
         │ ────────────────────────► │                           │
         │                           │  POST /ingest/okr/v1/*    │
         │                           │  Headers:                 │
         │                           │    X-OKRHub-Signature     │
         │                           │    X-OKRHub-Version       │
         │                           │    X-OKRHub-Key-Prefix    │
         │                           │ ─────────────────────────►│
         │                           │                           │ Verify HMAC
         │                           │                           │ Create/Update entity
         │                           │                           │ Create ID mapping
         │                           │        { success: true }  │
         │                           │ ◄─────────────────────────│
         │                           │                           │
         │  Update syncQueue status  │                           │
         │ ◄──────────────────────── │                           │
```

## Installation

```bash
npm install @linkhub/okrhub convex
```

## Quick Start

### 1. Add the component to your Convex app

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import okrhub from "@linkhub/okrhub/convex.config";

const app = defineApp();
app.use(okrhub);

export default app;
```

### 2. Expose the API in your app

```typescript
// convex/okrhub.ts
import { components } from "./_generated/api";
import { exposeApi } from "@linkhub/okrhub";

export const {
  insertObjective,
  insertKeyResult,
  insertRisk,
  insertInitiative,
  insertIndicator,
  insertMilestone,
  processSyncQueue,
  getPendingSyncItems,
} = exposeApi(components.okrhub, {
  auth: async (ctx, operation) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
  },
});
```

### 3. Set environment variables

Create a `.env.local` file in your project root:

```bash
# LinkHub site endpoint URL
LINKHUB_API_URL=https://your-linkhub.convex.site

# API Key Prefix (first 12 characters of your API key)
LINKHUB_API_KEY_PREFIX=okr_xxxxxxxx

# Signing Secret for HMAC authentication
LINKHUB_SIGNING_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4. Use in your app

```typescript
import { generateExternalId } from "@linkhub/okrhub";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function CreateObjective() {
  const insertObjective = useMutation(api.okrhub.insertObjective);

  const handleCreate = async () => {
    const externalId = generateExternalId("my-app", "objective");
    const teamExternalId = generateExternalId("my-app", "team");
    
    await insertObjective({
      objective: {
        externalId,
        title: "Increase Revenue Q1",
        description: "Focus on expanding sales channels",
        teamExternalId,
      },
    });
  };

  return <button onClick={handleCreate}>Create Objective</button>;
}
```

## Authentication

OKRHub uses HMAC-SHA256 authentication to secure communication with LinkHub.

### How it works

1. **API Key Creation**: In LinkHub, create an API key which generates:
   - `apiKey`: Full API key (e.g., `okr_9d78c3eb...`) - store securely
   - `keyPrefix`: First 12 characters for identification
   - `signingSecret`: HMAC signing secret (e.g., `whsec_...`) - used to sign requests

2. **Request Signing**: Every request is signed using the `signingSecret`:
   ```
   signature = HMAC-SHA256(payload, signingSecret)
   ```

3. **Headers Sent**:
   - `X-OKRHub-Signature`: HMAC signature of the request body
   - `X-OKRHub-Version`: Component version (for compatibility)
   - `X-OKRHub-Key-Prefix`: API key prefix for identification

4. **Server Verification**: LinkHub verifies the signature using the stored `signingSecret`

### Security Best Practices

- Never expose the `signingSecret` in client-side code
- Use environment variables for all credentials
- Rotate API keys periodically
- Use granular permissions when possible

## External ID Format

All entities use external IDs in the format: `{sourceApp}:{entityType}:{uuid}`

Example: `my-app:objective:550e8400-e29b-41d4-a716-446655440000`

```typescript
import { 
  generateExternalId, 
  validateExternalId, 
  parseExternalId 
} from "@linkhub/okrhub";

// Generate a new external ID
const id = generateExternalId("my-app", "objective");
// "my-app:objective:550e8400-e29b-41d4-a716-446655440000"

// Validate format
const isValid = validateExternalId(id); // true

// Parse components
const parsed = parseExternalId(id);
// { sourceApp: "my-app", entityType: "objective", uuid: "..." }
```

### Supported Entity Types

| Entity Type | Description |
|-------------|-------------|
| `objective` | Strategic objectives |
| `keyResult` | Key results linked to objectives |
| `risk` | Risks linked to key results |
| `initiative` | Initiatives to mitigate risks |
| `indicator` | Metrics and KPIs |
| `milestone` | Milestone targets for indicators |
| `team` | Teams (for reference mapping) |
| `user` | Users (for reference mapping) |
| `company` | Companies (for reference mapping) |

## Entity Payloads

### Objective

```typescript
{
  externalId: string;           // Required: unique ID
  title: string;                // Required: objective title
  description: string;          // Required: objective description
  teamExternalId: string;       // Required: reference to team
  createdAt?: number;           // Optional: timestamp
  updatedAt?: number;           // Optional: timestamp
}
```

### Key Result

```typescript
{
  externalId: string;              // Required
  indicatorExternalId: string;     // Required: linked indicator
  teamExternalId: string;          // Required: team reference
  weight: number;                  // Required: weight (0-100)
  objectiveExternalId?: string;    // Optional: linked objective
  impact?: number;                 // Optional
  forecastValue?: number;          // Optional
  targetValue?: number;            // Optional
}
```

### Risk

```typescript
{
  externalId: string;              // Required
  description: string;             // Required
  teamExternalId: string;          // Required
  priority: "lowest" | "low" | "medium" | "high" | "highest";
  keyResultExternalId?: string;    // Optional: linked key result
  indicatorExternalId?: string;    // Optional: linked indicator
  triggerValue?: number;           // Optional
  isRed?: boolean;                 // Optional
}
```

### Initiative

```typescript
{
  externalId: string;              // Required
  description: string;             // Required
  teamExternalId: string;          // Required
  assigneeExternalId: string;      // Required: user reference
  createdByExternalId: string;     // Required: user reference
  priority: "lowest" | "low" | "medium" | "high" | "highest";
  riskExternalId?: string;         // Optional: linked risk
  status?: "ON_TIME" | "OVERDUE" | "FINISHED";
  externalUrl?: string;            // Optional: external link
  notes?: string;                  // Optional
}
```

### Indicator

```typescript
{
  externalId: string;              // Required
  companyExternalId: string;       // Required: company reference
  description: string;             // Required
  symbol: string;                  // Required: unit symbol
  periodicity: "weekly" | "monthly" | "quarterly" | "semesterly" | "yearly";
  assigneeExternalId?: string;     // Optional: responsible user
  isReverse?: boolean;             // Optional: lower is better
  type?: "OUTPUT" | "OUTCOME";     // Optional
}
```

## Processing the Sync Queue

Entities are first stored in a sync queue, then processed asynchronously. Set up a cron job for automatic processing:

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "process okrhub sync queue",
  { minutes: 1 },
  api.okrhub.processSyncQueue,
  { batchSize: 50 }
);

export default crons;
```

Or process manually:

```typescript
// From Dashboard or action
await ctx.runAction(api.okrhub.processSyncQueue, {
  batchSize: 10,
});
```

### Queue States

| Status | Description |
|--------|-------------|
| `pending` | Waiting to be processed |
| `processing` | Currently being sent to LinkHub |
| `success` | Successfully synced |
| `failed` | Failed after max retries |

## Initial Setup

Before syncing entities, you need to set up reference mappings in LinkHub for entities that are referenced by external IDs (teams, users, companies).

### 1. Create API Key in LinkHub

In the LinkHub Convex Dashboard, call `apiKeys:createForSetup`:

```json
{
  "name": "My App Integration",
  "companyId": "your_company_id",
  "createdByUserId": "your_user_id",
  "permissions": ["ingest:all"]
}
```

Save the returned `apiKey`, `keyPrefix`, and `signingSecret`.

### 2. Create Reference Mappings

For each team/user/company referenced by your external IDs, create a mapping in LinkHub using `ingest:createMappingForSetup`:

```json
{
  "externalId": "my-app:team:00000000-0000-0000-0000-000000000001",
  "entityType": "team",
  "convexId": "existing_team_id_in_linkhub",
  "tableName": "teams",
  "sourceApp": "my-app",
  "companyId": "your_company_id"
}
```

### 3. Configure Environment

Add credentials to your `.env.local`:

```bash
LINKHUB_API_URL=https://your-linkhub.convex.site
LINKHUB_API_KEY_PREFIX=okr_xxxxxxxx
LINKHUB_SIGNING_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
```

### 4. Test Sync

Insert an entity and process the queue:

```typescript
// Insert
await insertObjective({
  objective: {
    externalId: generateExternalId("my-app", "objective"),
    title: "Test Objective",
    description: "Testing the sync",
    teamExternalId: "my-app:team:00000000-0000-0000-0000-000000000001",
  },
});

// Process
const result = await processSyncQueue({ batchSize: 10 });
// { processed: 1, succeeded: 1, failed: 0 }
```

## HTTP Routes (Optional)

Register HTTP routes for REST API access:

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { components } from "./_generated/api";
import { registerRoutes } from "@linkhub/okrhub";

const http = httpRouter();
registerRoutes(http, components.okrhub, { pathPrefix: "/api/okrhub" });

export default http;
```

## Payload Validators

All payload types are validated using Convex validators:

```typescript
import {
  objectivePayloadValidator,
  keyResultPayloadValidator,
  riskPayloadValidator,
  initiativePayloadValidator,
  indicatorPayloadValidator,
  milestonePayloadValidator,
} from "@linkhub/okrhub/schema";
```

## Development

```bash
# Install dependencies
npm install

# Run dev server (backend + frontend + build watcher)
npm run dev

# Build
npm run build

# Run tests
npm test

# Type check
npm run typecheck
```

## Example App

The `example/` directory contains a working example app demonstrating the component usage.

```bash
cd example
npm install
npm run dev
```

## Related Packages

- [@linkhub/ui-kit](https://github.com/okrlinkhub/linkhub-ui-kit) - Dumb React components for displaying OKR data

## Troubleshooting

### "Team not found for externalId"

You need to create a mapping for the team before syncing entities that reference it. See [Initial Setup](#initial-setup).

### "Invalid signature"

Check that:
1. `LINKHUB_SIGNING_SECRET` matches the `signingSecret` from API key creation
2. `LINKHUB_API_KEY_PREFIX` matches the `keyPrefix` from API key creation
3. The API key is active and not expired

### "Client version too old"

Update the component: `npm update @linkhub/okrhub`

## License

Apache-2.0
