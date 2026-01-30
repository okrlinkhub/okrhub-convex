# Guida Sviluppo Componenti PrimoHub

Guida minimale per sviluppare componenti Convex, allineata al template ufficiale.

---

## 🎯 Struttura

```
my-component/
├── src/
│   ├── component/                 # Il componente Convex
│   │   ├── _generated/
│   │   ├── convex.config.ts       # defineComponent("myComponent")
│   │   ├── schema.ts
│   │   └── entities.ts            # Queries e mutations
│   └── client/                    # Wrapper (opzionale)
│       └── index.ts               # Classe MyComponent
├── example/                       # App di test
│   ├── convex/
│   │   ├── convex.config.ts       # app.use(component)
│   │   └── api.ts                 # Re-export con auth
│   └── src/
│       └── App.tsx
├── dist/                          # Build output (generato)
├── package.json                   # ⚠️ Exports configurati
└── tsconfig.build.json
```

---

## 📦 package.json (La Chiave)

Gli exports gestiscono automaticamente la risoluzione `src/` in dev e `dist/` in prod:

```json
{
  "name": "@primohub/my-component",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/client/index.d.ts",
      "default": "./dist/client/index.js"
    },
    "./convex.config": {
      "@convex-dev/component-source": "./src/component/convex.config.ts",
      "default": "./dist/component/convex.config.js"
    },
    "./_generated/component": {
      "types": "./dist/component/_generated/component.d.ts",
      "default": "./dist/component/_generated/component.js"
    }
  },
  "scripts": {
    "dev": "npm-run-all --parallel dev:*",
    "dev:backend": "convex dev --typecheck-components",
    "dev:frontend": "cd example && vite",
    "dev:build": "chokidar 'src/**/*.ts' -c 'npm run build:codegen' --initial",
    "build": "tsc --project ./tsconfig.build.json",
    "build:codegen": "npx convex codegen --component-dir ./src/component && npm run build"
  }
}
```

> **Nota:** `@convex-dev/component-source` dice al bundler Convex di usare `src/` durante lo sviluppo e `dist/` in produzione. Non serve import esplicito da `dist/`.

---

## 📁 1. Componente Backend

### convex.config.ts

```typescript
// src/component/convex.config.ts
import { defineComponent } from "convex/server";

export default defineComponent("myComponent");
```

### schema.ts

```typescript
// src/component/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  entities: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.string(), // userId passato, non ctx.auth
  }).index("by_createdBy", ["createdBy"]),
});
```

### entities.ts

```typescript
// src/component/entities.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    userId: v.string(), // Auth gestita dall'app, non dal componente
  },
  returns: v.id("entities"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("entities", {
      name: args.name,
      description: args.description,
      createdBy: args.userId,
    });
  },
});

export const list = query({
  args: { userId: v.string() },
  returns: v.array(v.object({
    _id: v.id("entities"),
    _creationTime: v.number(),
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.string(),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("entities")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", args.userId))
      .collect();
  },
});
```

---

## 🔌 2. Client Wrapper (Pattern Ufficiale)

Il pattern raccomandato da Convex è usare una **classe** che wrappa il componente:

```typescript
// src/client/index.ts
import type { GenericMutationCtx, GenericQueryCtx, GenericDataModel } from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";

type MutationCtx = GenericMutationCtx<GenericDataModel>;
type QueryCtx = GenericQueryCtx<GenericDataModel>;

interface MyComponentOptions {
  getUserId: (ctx: QueryCtx | MutationCtx) => Promise<string>;
}

export class MyComponent {
  constructor(
    private component: ComponentApi,
    private options: MyComponentOptions
  ) {}

  async createEntity(
    ctx: MutationCtx,
    args: { name: string; description?: string }
  ) {
    const userId = await this.options.getUserId(ctx);
    return await ctx.runMutation(this.component.entities.create, {
      ...args,
      userId,
    });
  }

  async listEntities(ctx: QueryCtx) {
    const userId = await this.options.getUserId(ctx);
    return await ctx.runQuery(this.component.entities.list, { userId });
  }
}

// Re-export types utili
export type { ComponentApi } from "../component/_generated/component.js";
```

---

## 🚀 3. Example App

### convex.config.ts

```typescript
// example/convex/convex.config.ts
import { defineApp } from "convex/server";
import myComponent from "@primohub/my-component/convex.config"; // ✅ Via package exports

const app = defineApp();
app.use(myComponent);
export default app;
```

### api.ts

```typescript
// example/convex/api.ts
import { mutation, query } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";
import { MyComponent } from "@primohub/my-component";

// Inizializza il client con auth
const myComponent = new MyComponent(components.myComponent, {
  getUserId: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    return identity.tokenIdentifier;
  },
});

// Re-export funzioni per l'app
export const createEntity = mutation({
  args: { name: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, args) => myComponent.createEntity(ctx, args),
});

export const listEntities = query({
  args: {},
  handler: async (ctx) => myComponent.listEntities(ctx),
});
```

### App.tsx

```typescript
// example/src/App.tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export function App() {
  const entities = useQuery(api.api.listEntities);
  const createEntity = useMutation(api.api.createEntity);

  return (
    <div>
      <h1>My Entities</h1>
      <button onClick={() => createEntity({ name: "New Entity" })}>
        Create
      </button>
      <ul>
        {entities?.map((e) => <li key={e._id}>{e.name}</li>)}
      </ul>
    </div>
  );
}
```

---

## ⚠️ Regole Componente

Il componente è **isolato**. Non può accedere a risorse dell'app:

| ❌ Non usare | ✅ Alternativa |
|-------------|---------------|
| `ctx.auth` | Passa `userId` come argomento |
| `process.env` | Passa config come argomento al wrapper |
| Tabelle dell'app | Solo le proprie tabelle in `schema.ts` |

```typescript
// ❌ SBAGLIATO
export const create = mutation({
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity(); // ❌
    const apiKey = process.env.API_KEY; // ❌
  },
});

// ✅ CORRETTO
export const create = mutation({
  args: { 
    userId: v.string(),    // Passato dall'app
    apiKey: v.string(),    // Passato dall'app
  },
  handler: async (ctx, args) => {
    // Usa args.userId e args.apiKey
  },
});
```

---

## 🚨 Anti-Pattern: "Backend Fasullo"

### Il Rischio

Lo sviluppatore può mettere la logica in `example/convex/api.ts` invece che in `src/component/`. Funziona durante lo sviluppo, ma il consumer esterno riceve un componente vuoto.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ❌ ANTI-PATTERN                                                             │
│                                                                              │
│  src/component/entities.ts     example/convex/api.ts                        │
│  ┌────────────────────┐        ┌────────────────────┐                       │
│  │ // vuoto o minimo  │        │ createEntity()     │ ← Logica QUI          │
│  │ export const x = 1 │        │ validateData()     │ ← Anche QUI           │
│  │                    │        │ calculateScore()   │ ← E QUI               │
│  └────────────────────┘        └────────────────────┘                       │
│                                         │                                   │
│                                         ▼                                   │
│                              Sviluppatore testa, funziona ✓                 │
│                              Pubblica su npm                                │
│                              Consumer installa → ❌ COMPONENTE VUOTO        │
└─────────────────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ✅ PATTERN CORRETTO                                                         │
│                                                                              │
│  src/component/entities.ts     example/convex/api.ts                        │
│  ┌────────────────────┐        ┌────────────────────┐                       │
│  │ createEntity()     │        │ // Solo wrapper    │                       │
│  │ validateData()     │        │ myComponent.create │ ← Delega al componente│
│  │ calculateScore()   │        │                    │                       │
│  │ listEntities()     │        │                    │                       │
│  └────────────────────┘        └────────────────────┘                       │
│           │                                                                 │
│           ▼                                                                 │
│  TUTTA la logica nel componente → Consumer riceve tutto ✓                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Convenzione: "Logica nel Componente"

| File | Cosa deve contenere |
|------|---------------------|
| `src/component/*.ts` | **TUTTA** la logica di business |
| `example/convex/api.ts` | **SOLO** wrapper con auth + re-export |

### CI/CD: Verifica Automatica

Aggiungi questo check al workflow per bloccare se la logica è nel posto sbagliato:

```yaml
# .github/workflows/component-check.yml
name: Component Check
on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Type check
        run: npx tsc --noEmit
      
      - name: Verifica logica nel componente
        run: |
          # Conta linee di codice (escludi _generated)
          COMPONENT_LINES=$(find src/component -name "*.ts" -not -path "*/_generated/*" -exec cat {} + | wc -l)
          EXAMPLE_API_LINES=$(cat example/convex/api.ts 2>/dev/null | wc -l || echo "0")
          
          echo "📊 Linee in src/component/: $COMPONENT_LINES"
          echo "📊 Linee in example/convex/api.ts: $EXAMPLE_API_LINES"
          
          # La logica deve essere prevalentemente nel componente
          if [ "$COMPONENT_LINES" -lt "$EXAMPLE_API_LINES" ]; then
            echo "❌ ERRORE: Più codice nell'example app ($EXAMPLE_API_LINES) che nel componente ($COMPONENT_LINES)"
            echo "   Sposta la logica in src/component/"
            exit 1
          fi
          
          # Il componente deve avere almeno 50 linee di logica
          if [ "$COMPONENT_LINES" -lt 50 ]; then
            echo "❌ ERRORE: Componente troppo piccolo ($COMPONENT_LINES linee)"
            echo "   Assicurati che la logica sia in src/component/, non in example/"
            exit 1
          fi
          
          echo "✅ OK: Logica prevalentemente nel componente"
```

### Smoke Test Obbligatorio

Aggiungi un test che **fallisce se il componente è vuoto**:

```typescript
// example/convex/smoke.test.ts
import { test, expect } from "vitest";
import { convexTest } from "convex-test";
import { components } from "./_generated/api";

test("componente ha funzioni funzionanti", async () => {
  const t = convexTest();
  
  // Questo test fallisce se le funzioni sono vuote o non esistono
  const entityId = await t.run(async (ctx) => {
    return await ctx.runMutation(components.myComponent.entities.create, {
      name: "Test Entity",
      userId: "test_user",
    });
  });
  
  expect(entityId).toBeDefined();
  
  const entities = await t.run(async (ctx) => {
    return await ctx.runQuery(components.myComponent.entities.list, {
      userId: "test_user",
    });
  });
  
  expect(entities.length).toBeGreaterThan(0);
  expect(entities[0].name).toBe("Test Entity");
});
```

### Regola Pratica

> **Se `example/convex/api.ts` ha più di 30 linee, stai sbagliando.**
> 
> Dovrebbe contenere SOLO:
> - Inizializzazione della classe wrapper con auth
> - Re-export delle funzioni (1 riga per funzione)

Esempio corretto di `example/convex/api.ts` (max 20-30 linee):

```typescript
import { mutation, query } from "./_generated/server";
import { components } from "./_generated/api";
import { v } from "convex/values";
import { MyComponent } from "@primohub/my-component";

const myComponent = new MyComponent(components.myComponent, {
  getUserId: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    return identity.tokenIdentifier;
  },
});

// Solo wrapper, nessuna logica
export const createEntity = mutation({
  args: { name: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, args) => myComponent.createEntity(ctx, args),
});

export const listEntities = query({
  args: {},
  handler: async (ctx) => myComponent.listEntities(ctx),
});
```

---

## 👥 Sviluppo Parallelo tra Team

Quando più team lavorano su componenti diversi che dipendono l'uno dall'altro, **nessuno deve aspettare**.

### Il Problema

```
Team Prescrizioni (lento, 3 settimane)     Team Calendario (veloce, 1 settimana)
───────────────────────────────────────     ──────────────────────────────────────
Backend complesso, validazioni              Deve mostrare: "Appuntamento con 
integrazioni farmacie                       prescrizione: ???"

                                            Senza soluzione: BLOCCATO 3 settimane
```

### La Soluzione: Modalità "Dati Finti"

Ogni componente pubblica **subito** una versione minimale con una modalità "finta" che ritorna dati plausibili.

```typescript
// src/client/index.ts
export class MyComponent {
  constructor(
    private component: ComponentApi,
    private options: {
      getUserId: (ctx: any) => Promise<string>;
      useDummyData?: boolean; // 👈 Modalità finta
    }
  ) {}

  async getEntity(ctx: any, args: { entityId: string }) {
    // Se modalità finta, non chiama il database
    if (this.options.useDummyData) {
      return {
        _id: args.entityId,
        name: "Entità di esempio",
        description: "⚠️ DATO FINTO - Componente non ancora pronto",
        createdAt: Date.now(),
      };
    }

    // Altrimenti, chiama il vero backend
    return ctx.runQuery(this.component.entities.get, args);
  }
}
```

### Come si Usa

**Team che dipende da un componente non pronto:**

```typescript
// primoup-core/convex/api.ts
import { MyComponent } from "@primohub/my-component";

const myComponent = new MyComponent(components.myComponent, {
  getUserId: getAuthUserId,
  useDummyData: process.env.MY_COMPONENT_FINTO === "true", // 👈 Attiva finte
});
```

```bash
# .env.local (sviluppo)
MY_COMPONENT_FINTO=true

# Quando il componente è pronto
MY_COMPONENT_FINTO=false
```

### Timeline di Sviluppo

```
Giorno 1: Kickoff
───────────────────────────────────────────────────────────────────
Team Componente A              Team Componente B              Team Core
────────────────               ────────────────               ─────────
Pubblica v0.1                  Pubblica v0.1                  npm install
├─ Schema base                 ├─ Schema base                 Attiva *_FINTO=true
├─ 2 query                     ├─ 2 query                     Sviluppa UI
└─ Dati finti                  └─ Dati finti

Giorno 5: Feedback
───────────────────────────────────────────────────────────────────
Team Componente A ◄── "Manca campo 'scadenza'" ── Team Core
                                   │
                                   ▼
                    Aggiorna schema, pubblica v0.2

Giorno 15: Pronto
───────────────────────────────────────────────────────────────────
Team Core toglie i flag *_FINTO, usa dati reali
```

### Regole per i Dati Finti

| ✅ Fare | ❌ Non fare |
|---------|-------------|
| Dati realistici (nomi, date plausibili) | Dati palesemente fake ("test123") |
| Stessa struttura dei dati reali | Struttura diversa |
| Note che indicano "⚠️ DATO FINTO" | Nascondere che sono finti |
| Console.log per debug | Silenzio totale |

```typescript
// ✅ CORRETTO - Dati finti realistici
return {
  _id: "finta_1",
  farmaco: "Amoxicillina 500mg",           // Nome reale
  dosaggio: "1 compressa ogni 8 ore",      // Formato reale
  data: Date.now() - 86400000,             // Data plausibile
  note: "⚠️ DATO FINTO - Prescrizioni v0.1",
};

// ❌ SBAGLIATO - Dati inutili
return {
  _id: "test",
  farmaco: "farmaco",
  dosaggio: "dosaggio",
  data: 0,
};
```

### Checklist Team

**Team che sviluppa il componente:**
```
□ Pubblica v0.1 entro 2 giorni (anche se fa poco)
□ Aggiungi useDummyData nel client wrapper
□ Dati finti realistici e con stessa struttura
□ Documenta: quali campi arriveranno in v0.2, v0.3
```

**Team che usa il componente:**
```
□ Installa subito, non aspettare che sia completo
□ Attiva *_FINTO=true nel .env.local
□ Sviluppa assumendo che i dati siano "quasi veri"
□ Feedback rapido: "serve campo X" entro 24h
```

### Vantaggi

| Prima (bloccati) | Ora (paralleli) |
|------------------|-----------------|
| Team B aspetta Team A | Team B usa dati finti, procede |
| "È pronto?" ogni giorno | Feedback strutturato su campi mancanti |
| Codice fake sparso ovunque | Dati finti centralizzati nei client |
| Integrazione a fine progetto | Integrazione incrementale |

---

## 📋 Checklist

```
□ src/component/ con convex.config.ts e schema.ts
□ Nessun ctx.auth o process.env nel componente
□ TUTTA la logica in src/component/, non in example/
□ example/convex/api.ts ha < 30 linee (solo wrapper + auth)
□ package.json con exports e @convex-dev/component-source
□ Classe wrapper in src/client/ con opzione useDummyData
□ Dati finti realistici per sviluppo parallelo
□ example/ che importa da "@your-package/convex.config"
□ Smoke test che chiama funzioni del componente
□ npm run build genera dist/ senza errori
```

---

## 🏗️ Workflow

```bash
# 1. Crea componente da template
npx create-convex@latest --component

# 2. Sviluppa
npm run dev

# 3. Build
npm run build

# 4. Pubblica
npm publish
```

---

## 📚 Risorse

- **Template Ufficiale**: `npx create-convex@latest --component`
- **Documentazione**: `dev_utils/component-convex-docs.md`
- **Componenti Directory**: https://convex.dev/components

---

**Ultimo aggiornamento:** Gennaio 2026
