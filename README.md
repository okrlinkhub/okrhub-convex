# @linkhub/okrhub

Convex component for syncing OKR data (Objectives, Key Results, Risks, Initiatives) to LinkHub via secure HMAC-authenticated API.

[![npm version](https://badge.fury.io/js/@linkhub%2Fokrhub.svg)](https://badge.fury.io/js/@linkhub%2Fokrhub)

## Features

- **One-way sync**: Send OKR data from external apps to LinkHub
- **HMAC authentication**: Secure API communication
- **Version control**: Automatic version checking with graceful degradation
- **External ID mapping**: Use your own IDs, LinkHub handles the mapping
- **Batch operations**: Send multiple entities in a single request

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

```bash
LINKHUB_API_URL=https://your-linkhub.convex.site
LINKHUB_API_KEY=okr_your_api_key_here
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
    
    await insertObjective({
      objective: {
        externalId,
        title: "Increase Revenue Q1",
        description: "Focus on expanding sales channels",
        teamExternalId: "my-app:team:abc123",
      },
    });
  };

  return <button onClick={handleCreate}>Create Objective</button>;
}
```

## External ID Format

All entities use external IDs in the format: `{sourceApp}:{entityType}:{uuid}`

Example: `my-app:objective:550e8400-e29b-41d4-a716-446655440000`

```typescript
import { generateExternalId, validateExternalId, parseExternalId } from "@linkhub/okrhub";

// Generate a new external ID
const id = generateExternalId("my-app", "objective");

// Validate format
const isValid = validateExternalId(id); // true

// Parse components
const parsed = parseExternalId(id);
// { sourceApp: "my-app", entityType: "objective", uuid: "..." }
```

## Supported Entity Types

| Entity Type | Description |
|------------|-------------|
| `objective` | Strategic objectives |
| `keyResult` | Key results linked to objectives |
| `risk` | Risks/KPIs linked to key results |
| `initiative` | Initiatives to mitigate risks |
| `indicator` | Metrics and KPIs |
| `milestone` | Milestone targets for indicators |

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

## Processing the Sync Queue

The component uses a queue for async processing. Set up a cron job:

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

## Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build
npm run build

# Run tests
npm test
```

## Related Packages

- [@linkhub/ui-kit](https://www.npmjs.com/package/@linkhub/ui-kit) - Dumb React components for displaying OKR data

## License

Apache-2.0
