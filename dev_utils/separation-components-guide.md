# Linee Guida per lo Sviluppo di Componenti Chiave di PrimoHub

Questo documento definisce le best practices per sviluppare nuovi componenti chiave di PrimoHub, garantendo separazione tra backend e frontend, riutilizzabilità e manutenibilità.

## 🎯 Principio Fondamentale

**Ogni componente chiave deve essere sviluppato come due parti obbligatorie + una opzionale:**

1. **Backend Component** (obbligatorio) - Componente Convex isolato e riutilizzabile
2. **[nome-stand-alone-app]** (obbligatorio) - App stand-alone per sviluppo, testing e utilizzo con utenti reali nel 2026
3. **Frontend Package** (opzionale) - Pacchetto npm con componenti React puri

### Approccio Semplificato: UI nella Stand-Alone App

Per semplificare lo sviluppo, puoi scegliere di **NON creare un pacchetto UI separato**. In questo caso:

- La **[stand-alone-app]** contiene l'UI del componente
- Le **app consumer** (che installano il componente) **riscrivono la propria UI** ispirandosi a quella della stand-alone-app
- L'unica regola: la **[stand-alone-app] DEVE usare la logica backend dal `dist/`** del componente, non importare direttamente da `src/component/`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      APPROCCIO SEMPLIFICATO                                  │
│                                                                              │
│   ┌─────────────────────────┐      ┌─────────────────────────┐             │
│   │  my-component/          │      │  app-consumer/          │             │
│   │  ├── src/component/     │      │  ├── convex/            │             │
│   │  ├── dist/              │◄─────│  │   └── uses component │             │
│   │  └── [stand-alone-app]/ │      │  └── src/               │             │
│   │      └── src/           │      │      └── UI riscritta   │             │
│   │          └── UI         │      │          (ispirata)     │             │
│   └─────────────────────────┘      └─────────────────────────┘             │
│                                                                              │
│   La stand-alone-app importa da dist/, non da src/component/                 │
│   Le app consumer riscrivono la UI, non la importano                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Vantaggi:**
- ✅ Meno overhead: nessun pacchetto npm UI da mantenere
- ✅ Flessibilità: ogni app ha la sua UI ottimizzata
- ✅ Meno dipendenze: le app consumer non dipendono da un pacchetto UI esterno

**Svantaggi:**
- ❌ Duplicazione: la UI viene riscritta per ogni app consumer
- ❌ Drift: le UI possono divergere nel tempo
- ❌ Più lavoro per i consumer: devono costruire la propria UI

**Regola Critica:** La [stand-alone-app] **DEVE** importare il componente come farebbe un consumer esterno:

```typescript
// ✅ CORRETTO: [stand-alone-app]/convex/convex.config.ts
import myComponent from "../dist/component/convex.config.js"; // Da dist/

// ❌ SBAGLIATO: Import diretto da src/
import myComponent from "../src/component/convex.config.js"; // NON FARE
```

Questo garantisce che la stand-alone-app e i consumer parlino la stessa "lingua".

---

## 📦 1. Backend: Componente Convex

### Struttura Obbligatoria

Ogni componente backend deve seguire la struttura standard dei componenti Convex:

```
my-component/
├── src/
│   ├── component/              # Componente isolato
│   │   ├── convex.config.ts    # Configurazione componente
│   │   ├── schema.ts           # Schema database del componente
│   │   ├── entities/           # Entità del dominio
│   │   │   ├── entity1.ts
│   │   │   └── entity2.ts
│   │   └── lib/                # Utilities interne
│   ├── client/                 # API wrapper per app consumer
│   │   └── index.ts           # Funzioni exposeApi, registerRoutes, ecc.
│   └── react/                 # Hook React (opzionale)
│       └── index.ts
├── dist/                       # Build output (generato)
│   └── component/             # Componente compilato
├── [nome-stand-alone-app]/     # App stand-alone (OBBLIGATORIA)
│   ├── convex/
│   │   └── convex.config.ts   # Importa da ../dist/component/ (NON da src!)
│   └── src/                   # UI + Auth0
└── package.json
```

> **Nota:** Se decidi di creare anche un pacchetto UI separato, aggiungi una cartella `../my-component-ui/` come repo separata.

### Regole di Sviluppo

✅ **FARE:**
- Seguire la documentazione in `component-convex-docs.md`
- Isolare completamente il componente: nessun accesso diretto a tabelle/app esterne
- Esporre API pulite tramite `exposeApi()` in `src/client/index.ts`
- Usare validatori Convex per tutti gli argomenti e valori di ritorno
- Documentare tutte le funzioni pubbliche
- Gestire errori in modo type-safe (vedi regole Convex)

❌ **NON FARE:**
- Accedere direttamente a `ctx.auth` nel componente (passare `userId` come argomento)
- Accedere a `process.env` nel componente (passare config come argomento)
- Esporre tabelle direttamente (solo tramite API)
- Creare dipendenze circolari tra componenti

### External IDs: Quando Usarli (Regola Condizionale)

Gli `externalId` **NON sono sempre obbligatori**. La decisione dipende dal caso d'uso del componente.

#### ✅ externalId OBBLIGATORIO quando:

| Scenario | Motivo |
|----------|--------|
| **Sync/Federation** tra deployment Convex diversi | Gli `_id` sono diversi tra deployment |
| **Export** verso sistemi esterni (AWS EventBridge, webhook) | I dati devono mantenere relazioni fuori da Convex |
| **Import** da sistemi esterni (CRM, ERP) | Serve mappare ID esterni a entità interne |
| **Tabelle read-only** replicate in altre app | Le relazioni devono essere preservate |
| **Integrazione multi-app** con dati condivisi | Serve un identificatore universale |

#### ❌ externalId OPZIONALE quando:

| Scenario | Motivo |
|----------|--------|
| **Componente solo interno** alla stessa app | Gli `_id` sono validi in tutto il deployment |
| **Nessun sync/export** previsto | I dati non escono mai dal contesto Convex |
| **Integrazione solo via API** (non replica tabelle) | Non serve duplicare dati |
| **Componente semplice** senza relazioni complesse | La complessità aggiuntiva non è giustificata |

#### Formato externalId

Se decidi di usare gli externalId, il formato è:
```
{sourceApp}:{tableName}:{uuid}
```

**Esempio con externalId (per componenti con sync/export):**
```typescript
// src/component/schema.ts
export default defineSchema({
  entities: defineTable({
    externalId: v.string(), // Formato: "my-app:entities:550e8400-..."
    name: v.string(),
    parentExternalId: v.optional(v.string()), // Riferimento con externalId
  })
    .index("by_externalId", ["externalId"])
    .index("by_parentExternalId", ["parentExternalId"]),
});
```

**Esempio senza externalId (per componenti solo interni):**
```typescript
// src/component/schema.ts
export default defineSchema({
  entities: defineTable({
    name: v.string(),
    parentId: v.optional(v.id("entities")), // Riferimento con _id (OK per uso interno)
  })
    .index("by_parentId", ["parentId"]),
});
```

#### Utilities per External IDs

Se usi externalId, prendi spunto da `okrhub-convex/src/component/externalId.ts`:

```typescript
import { 
  generateExternalId, 
  validateExternalId, 
  parseExternalId 
} from "./lib/externalId";

// Genera un nuovo external ID
const externalId = generateExternalId("my-app", "entities");
// Risultato: "my-app:entities:550e8400-e29b-41d4-a716-446655440000"

// Valida formato
const isValid = validateExternalId(externalId); // true

// Parse componenti
const parsed = parseExternalId(externalId);
// { sourceApp: "my-app", entityType: "entities", uuid: "..." }
```

#### Trade-off da Considerare

| Con externalId | Senza externalId |
|----------------|------------------|
| ✅ Future-proof: facile aggiungere sync/export in futuro | ✅ Più semplice: meno boilerplate |
| ✅ Dati portabili tra deployment | ✅ Query più veloci con `v.id()` |
| ❌ Più complesso: serve gestire generazione e validazione | ❌ Refactor costoso se in futuro serve sync |
| ❌ Index aggiuntivi sulle stringhe | ❌ Dati non esportabili con relazioni intatte |

**Raccomandazione:** Se c'è anche una minima possibilità che in futuro il componente debba esportare dati o integrarsi con altri sistemi, usa externalId fin dall'inizio. Il costo del refactor successivo è molto più alto.

### Esempio di Struttura

```typescript
// src/component/convex.config.ts
import { defineComponent } from "convex/server";

export default defineComponent("myComponent");

// src/client/index.ts
export function exposeApi(
  component: ComponentApi,
  options?: ExposeApiOptions
) {
  return {
    createEntity: mutationGeneric({
      args: { /* validators */ },
      handler: async (ctx, args) => {
        if (options?.auth) {
          await options.auth(ctx, { type: "create", entityType: "entity" });
        }
        return await ctx.runMutation(component.myComponent.entities.create, args);
      },
    }),
    // ... altre funzioni
  };
}
```

---

## 🎨 2. Frontend: Pacchetto npm Installabile (OPZIONALE)

> **Nota:** Questa sezione è rilevante solo se decidi di creare un pacchetto UI separato. 
> Vedi "Approccio Semplificato" sopra per l'alternativa senza pacchetto UI.

### Quando creare un pacchetto UI separato

| Crea pacchetto UI se... | NON creare se... |
|------------------------|------------------|
| Molte app useranno esattamente la stessa UI | Ogni app avrà UI personalizzata |
| Vuoi consistenza UI garantita | Preferisci flessibilità totale |
| Hai risorse per mantenere 2 pacchetti npm | Vuoi minimizzare overhead |
| La UI è complessa e costosa da riscrivere | La UI è semplice e veloce da rifare |

### Struttura (se decidi di creare il pacchetto)

Il frontend deve essere un pacchetto npm completamente separato, simile a `linkhub-ui-kit`:

```
my-component-ui/
├── src/
│   ├── components/            # Componenti React puri
│   │   ├── EntitySection.tsx
│   │   ├── EntityCard.tsx
│   │   └── modals/
│   │       └── EditEntityModal.tsx
│   ├── hooks/                # Hook React (senza Convex)
│   │   └── usePagination.ts
│   ├── types.ts              # TypeScript types
│   └── index.ts              # Export pubblici
├── dev/                      # App showcase per sviluppo
│   └── src/
│       └── App.tsx          # Mostra tutti i componenti
├── package.json
└── tsup.config.ts
```

### Regole di Sviluppo

✅ **FARE:**
- Componenti "dumb": ricevono dati via props, nessuna chiamata Convex diretta
- Zero dipendenze Convex nel pacchetto (solo React come peer dependency)
- Stili inline o CSS modules (massima portabilità)
- Exportare tutti i tipi TypeScript necessari
- Fornire componenti composabili e personalizzabili

❌ **NON FARE:**
- Importare `convex/react` o `@convex/_generated/api`
- Chiamare direttamente `useQuery` o `useMutation` nei componenti del pacchetto
- Hardcodare logica di business specifica dell'app
- Creare dipendenze da librerie UI specifiche (usare props per customizzazione)

### Esempio di Componente

```typescript
// src/components/EntitySection.tsx
import type { Entity } from '../types';

interface EntitySectionProps {
  entities: Entity[];
  selectedEntityId?: string;
  onEntitySelect: (id: string) => void;
  onCreate: () => void;
  onEdit: (entity: Entity) => void;
  isLoading?: boolean;
}

export function EntitySection({
  entities,
  selectedEntityId,
  onEntitySelect,
  onCreate,
  onEdit,
  isLoading,
}: EntitySectionProps) {
  // Componente puro, nessuna chiamata Convex
  return (
    <div>
      {/* UI implementation */}
    </div>
  );
}
```

### Uso nell'App

```typescript
// In linkhub-w4 o altra app
import { EntitySection } from '@primohub/my-component-ui';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@convex/_generated/api';

function MyAppEntitySection({ teamId }: { teamId: string }) {
  // Hook Convex nell'app, non nel pacchetto UI
  const entities = useQuery(api.myComponent.getEntities, { teamId });
  const createEntity = useMutation(api.myComponent.createEntity);
  
  return (
    <EntitySection
      entities={entities ?? []}
      onCreate={() => createEntity({ /* ... */ })}
      onEdit={(entity) => {/* ... */}}
    />
  );
}
```

---

## 🚀 2. [nome-stand-alone-app]: App Stand-Alone (OBBLIGATORIA)

### Scopo

L'app stand-alone è **obbligatoria** e serve a:
- **Sviluppare e testare il componente backend** in isolamento
- **Visualizzare e testare la UI** durante lo sviluppo
- **Utilizzo con utenti reali nel 2026** per raccogliere feedback e validare funzionalità
- Fornire **esempio di integrazione** per altri sviluppatori
- **Reference implementation** della UI (che i consumer possono riscrivere)

### ⚠️ REGOLA CRITICA: Import da `dist/`

La [stand-alone-app] **DEVE** importare il componente come farebbe un consumer esterno, cioè dalla cartella `dist/`:

```typescript
// ✅ CORRETTO: Import da dist/
// [stand-alone-app]/convex/convex.config.ts
import myComponent from "../../dist/component/convex.config.js";

// ❌ SBAGLIATO: Import diretto da src/
import myComponent from "../../src/component/convex.config.js";
```

**Perché?**
- Garantisce che la stand-alone-app usi esattamente lo stesso codice che useranno i consumer
- Evita discrepanze tra sviluppo (src/) e produzione (dist/)
- Forza il build prima di testare, catturando errori di compilazione

### ⚠️ IMPORTANTE: Autenticazione Auth0

L'autenticazione Auth0 deve essere implementata **SOLO** nell'app stand-alone:
- Il componente backend rimane agnostico rispetto al sistema di autenticazione
- La UI (sia nella stand-alone che riscritta dai consumer) non contiene logica auth
- Ogni app consumer può scegliere il proprio sistema di autenticazione

### Struttura

```
my-component/
├── [nome-stand-alone-app]/
│   ├── convex/
│   │   ├── convex.config.ts   # Installa il componente
│   │   ├── schema.ts          # Schema app (minimo, solo per auth se necessario)
│   │   ├── auth.ts            # Configurazione Auth0 (SOLO QUI)
│   │   └── api.ts             # Re-export API del componente
│   └── src/
│       ├── App.tsx            # Usa componenti UI + Auth0
│       ├── auth/               # Componenti Auth0 (SOLO QUI)
│       └── main.tsx
└── package.json
```

### Configurazione

```typescript
// [nome-stand-alone-app]/convex/convex.config.ts
import { defineApp } from "convex/server";
import myComponent from "../../src/component/convex.config.js";

const app = defineApp();
app.use(myComponent);
export default app;

// [nome-stand-alone-app]/convex/auth.ts
// ⚠️ Auth0 config SOLO nell'app stand-alone, non nel componente
import { defineAuth } from "convex/server";
import { Auth0 } from "convex/server";

export const { auth, signIn, signOut } = defineAuth({
  providers: [Auth0],
});

// [nome-stand-alone-app]/convex/api.ts
import { components } from "./_generated/api";
import { exposeApi } from "../../src/client/index.js";

export const {
  createEntity,
  getEntities,
  // ... altre funzioni
} = exposeApi(components.myComponent, {
  auth: async (ctx) => {
    // Auth nell'app stand-alone, non nel componente
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    return identity.tokenIdentifier;
  },
});
```

```typescript
// [nome-stand-alone-app]/src/App.tsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { EntitySection } from "@primohub/my-component-ui";
import { useAuth0 } from "./auth/useAuth0"; // Auth0 SOLO nell'app stand-alone

export function App() {
  const { isAuthenticated, login, logout } = useAuth0(); // Auth0 hook
  
  const entities = useQuery(api.api.getEntities, {});
  const createEntity = useMutation(api.api.createEntity);
  
  if (!isAuthenticated) {
    return <button onClick={login}>Login with Auth0</button>;
  }
  
  return (
    <div>
      <button onClick={logout}>Logout</button>
      <EntitySection
        entities={entities ?? []}
        onCreate={() => createEntity({ /* ... */ })}
      />
    </div>
  );
}
```

---

## 📌 Versioning dopo Pubblicazione

Dopo la pubblicazione iniziale su npm, entrambi i pacchetti (backend component e frontend package) devono seguire [Semantic Versioning](https://semver.org/).

### Formato Versione

```
MAJOR.MINOR.PATCH
```

**Esempi:**
- `1.0.0` - Prima release pubblica
- `1.0.1` - Bugfix retrocompatibile
- `1.1.0` - Nuova funzionalità retrocompatibile
- `2.0.0` - Breaking change

### Regole di Incremento

#### PATCH (1.2.3 → 1.2.4)
- Bugfix che non cambiano l'API pubblica
- Correzioni di sicurezza
- Miglioramenti delle performance senza cambiare comportamento
- Aggiornamenti di dipendenze minori

#### MINOR (1.2.3 → 1.3.0)
- Nuove funzionalità retrocompatibili
- Nuove funzioni nell'API pubblica
- Nuovi componenti UI
- Deprecazioni (senza rimuovere funzionalità esistenti)

#### MAJOR (1.2.3 → 2.0.0)
- Breaking changes nell'API
- Rimozione di funzionalità deprecate
- Cambiamenti significativi nel comportamento
- Cambiamenti nello schema del database che richiedono migrazioni

### Best Practices

✅ **FARE:**
- Documentare breaking changes nel CHANGELOG
- Mantenere retrocompatibilità quando possibile
- Usare deprecazioni prima di rimuovere funzionalità
- Testare aggiornamenti di versione nell'app stand-alone

❌ **NON FARE:**
- Incrementare MAJOR per bugfix
- Cambiare API senza aggiornare versione
- Rimuovere funzionalità senza deprecazione previa

### Esempio di Workflow

```bash
# Bugfix dopo pubblicazione
npm version patch  # 1.0.0 → 1.0.1
npm publish

# Nuova funzionalità retrocompatibile
npm version minor  # 1.0.1 → 1.1.0
npm publish

# Breaking change
npm version major  # 1.1.0 → 2.0.0
npm publish
```

---

## 🔧 Setup Workspace (Opzionale ma Consigliato)

### Usare Cursor Workspace per Sviluppo Integrato

Per sviluppare backend e frontend insieme, puoi creare un workspace Cursor che includa entrambe le repository:

```json
// .cursor/workspace.json (nella repo del componente)
{
  "folders": [
    {
      "path": ".",
      "name": "my-component-backend"
    },
    {
      "path": "../my-component-ui",
      "name": "my-component-ui"
    }
  ]
}
```

**Vantaggi:**
- ✅ Navigazione facile tra backend e frontend
- ✅ Refactoring cross-repo più semplice
- ✅ Context sharing tra i due progetti
- ✅ Testing integrato più facile

**Quando NON serve:**
- Se lavori solo su backend o solo su frontend
- Se le repo sono molto grandi e il workspace diventa lento
- Se preferisci lavorare su una repo alla volta

**Raccomandazione:** Usa il workspace quando sviluppi nuove funzionalità che toccano entrambe le parti. Per bugfix o feature isolate, lavora su una singola repo.

---

## 🔗 Federation: Quando Usarla vs Chiamate API

La **Federation** (`@l_ego/federation`) permette di sincronizzare dati tra deployment Convex diversi. Ma non è sempre la scelta giusta.

### Architettura: Federation vs Chiamate API

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FEDERATION (Replica Dati)                          │
│                                                                              │
│   ┌─────────────────┐         Sync Events         ┌─────────────────┐       │
│   │     App A       │ ───────────────────────────►│     App B       │       │
│   │  (dati master)  │                             │ (copia locale)  │       │
│   │                 │ ◄─────────────────────────── │                 │       │
│   └─────────────────┘         LWW Merge           └─────────────────┘       │
│                                                                              │
│   Pro: Latenza bassa, resilienza, offline-capable                           │
│   Contro: Duplicazione dati, complessità, potenziali conflitti              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           CHIAMATE API (Dati Live)                           │
│                                                                              │
│   ┌─────────────────┐         HTTP Request        ┌─────────────────┐       │
│   │     App A       │ ◄─────────────────────────── │     App B       │       │
│   │  (ha i dati)    │         Response            │ (chiede i dati) │       │
│   └─────────────────┘ ───────────────────────────► └─────────────────┘       │
│                                                                              │
│   Pro: Dati sempre aggiornati, nessuna duplicazione, più semplice           │
│   Contro: Latenza rete, dipendenza da App A online                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### ✅ Usa Federation QUANDO:

| Scenario | Motivo |
|----------|--------|
| **Latenza critica** | I dati locali sono molto più veloci delle chiamate API |
| **Resilienza** | L'app B deve funzionare anche se App A è offline |
| **Aggregazioni pesanti** | Query complesse su dati che cambiano raramente |
| **Multi-tenant isolato** | Ogni tenant ha il proprio deployment con dati dedicati |

### ❌ Federation è OVERKILL QUANDO:

| Scenario | Alternativa Migliore |
|----------|---------------------|
| **Dati sempre aggiornati** | Chiamate API dirette |
| **Poche letture** | HTTP Actions + HMAC auth |
| **Componenti nella stessa app** | Usa direttamente `components.myComponent` |
| **Solo lettura** | API read-only senza replica |
| **Dati piccoli** | Passali come argomenti alle funzioni |

### Pattern: Componenti + API invece di Federation

Con l'architettura **Componente + Frontend Package**, puoi spesso evitare la Federation:

```typescript
// ❌ PRIMA: Federation per copiare tabelle
// App A → federation_events → App B (copia locale di "objectives")
// Complessità: LWW, ID mapping, sync queue, conflitti

// ✅ DOPO: Componente + API
// App A installa okrhub-convex, espone API
// App B chiama le API di App A quando serve
// Nessuna duplicazione, dati sempre freschi

// App A: espone API
export const { getObjectives } = exposeApi(components.okrhub, {
  auth: async (ctx) => { /* ... */ }
});

// App B: chiama API di App A (via HTTP Action o federation come proxy API)
export const getRemoteObjectives = action({
  handler: async (ctx, args) => {
    const response = await fetch("https://app-a.convex.site/api/objectives", {
      headers: { "X-Auth": "..." }
    });
    return await response.json();
  }
});
```

### Quando Federation ha senso con i Componenti

La Federation rimane utile in questi casi specifici:

1. **Caching locale**: Vuoi una cache locale per ridurre latenza/costi API
2. **Trasformazioni**: I dati devono essere trasformati prima di essere usati
3. **Join locali**: Devi fare join tra dati remoti e dati locali
4. **Audit trail**: Vuoi mantenere una storia locale delle modifiche

### Impatto sugli externalId

Se usi **Federation** → externalId **OBBLIGATORIO**
- La federation copia dati tra deployment diversi
- Gli `_id` sono diversi in ogni deployment
- Senza externalId, le relazioni si rompono

Se usi **solo API** → externalId **OPZIONALE**
- I dati restano nel deployment originale
- Le relazioni usano gli `_id` nativi
- Nessuna necessità di mappatura

### Decisione Flowchart

```
I dati devono essere copiati in un altro deployment?
│
├─ SÌ → Usi Federation?
│        │
│        ├─ SÌ → externalId OBBLIGATORIO
│        │       Federation con LWW
│        │
│        └─ NO → Export/Import manuale?
│                externalId OBBLIGATORIO
│
└─ NO → I dati restano nello stesso deployment
        │
        ├─ Componente nella stessa app → _id OK, externalId opzionale
        │
        └─ Chiamate API tra app → _id OK, externalId opzionale
                                  (i dati non vengono copiati)
```

### Documentazione Federation

Per dettagli sull'uso della Federation, vedi `dev_utils/leo-federation-readme.md`.

---

## 📋 Checklist per Nuovo Componente

Quando inizi un nuovo componente chiave, verifica:

### Backend Component
- [ ] Struttura `src/component/` con `convex.config.ts` e `schema.ts`
- [ ] API wrapper in `src/client/index.ts` con `exposeApi()`
- [ ] Tutte le funzioni hanno validatori per args e returns
- [ ] Nessun accesso diretto a `ctx.auth` o `process.env`
- [ ] Documentazione delle funzioni pubbliche
- [ ] Test per le funzioni principali
- [ ] **Decisione externalId**: Valutare se il componente richiede externalId
  - ✅ Obbligatorio se: sync/federation, export, import, integrazione multi-app
  - ❌ Opzionale se: solo uso interno, nessun sync previsto
- [ ] **Se externalId usato**: Index creati su `externalId` e campi di riferimento
- [ ] **Versioning**: Usare [Semantic Versioning](https://semver.org/) dopo pubblicazione
  - `MAJOR.MINOR.PATCH` (es. `1.2.3`)
  - Incrementare `PATCH` per bugfix
  - Incrementare `MINOR` per nuove funzionalità retrocompatibili
  - Incrementare `MAJOR` per breaking changes

### [nome-stand-alone-app] (OBBLIGATORIA)
- [ ] App stand-alone in `[nome-stand-alone-app]/` 
- [ ] **Import da `dist/`**: Componente importato da `dist/`, NON da `src/component/`
- [ ] **Auth0 configurato SOLO qui** (non nel componente)
- [ ] UI funzionante come reference per i consumer
- [ ] README con istruzioni per avviare l'app
- [ ] Pronta per utilizzo con utenti reali nel 2026

### Frontend Package (OPZIONALE)
Se decidi di creare un pacchetto UI separato:
- [ ] Pacchetto npm separato con `package.json` configurato
- [ ] Componenti React puri senza dipendenze Convex
- [ ] Export di tutti i tipi TypeScript necessari
- [ ] README con esempi di utilizzo
- [ ] Pubblicazione su npm con scope `@primohub/`
- [ ] **Versioning**: Usare [Semantic Versioning](https://semver.org/) dopo pubblicazione

### Integrazione
- [ ] Il componente può essere installato in altre app (via npm o locale)
- [ ] La [stand-alone-app] funziona end-to-end importando da `dist/`
- [ ] Documentazione per sviluppatori su come integrare il componente
- [ ] (Se pacchetto UI creato) Il pacchetto UI può essere usato indipendentemente

---

## 🎓 Esempi di Riferimento

### Componente Backend + Stand-Alone App
- **`okrhub-convex`** - Componente completo con sync queue, HMAC auth, external IDs
  - Struttura: `src/component/` + `src/client/` + `example/`
  - Pattern: `exposeApi()` per API wrapper
  - Stand-alone app: `example/` con Vite + React
  - **Nota**: Per il 2026, le nuove app stand-alone includeranno Auth0 per testing con utenti reali

### Pacchetto Frontend (se creato)
- **`linkhub-ui-kit`** - Componenti React puri per OKR
  - Struttura: `src/components/` + `src/hooks/` + `src/types.ts`
  - Pattern: Componenti dumb con props
  - Showcase: `dev/` con Vite
  - **Nota**: Questo è opzionale. I consumer possono riscrivere la UI ispirandosi alla stand-alone app

---

## 🚨 Anti-Pattern da Evitare

### ❌ Monolite Accoppiato
```typescript
// SBAGLIATO: Componente React che chiama direttamente Convex
function EntitySection({ teamId }: { teamId: string }) {
  const entities = useQuery(api.entities.getAll, { teamId }); // ❌
  return <div>{/* ... */}</div>;
}
```

### ❌ Backend senza Isolamento
```typescript
// SBAGLIATO: Componente che accede direttamente all'app
export const getEntities = query({
  handler: async (ctx) => {
    const userId = await ctx.auth.getUserIdentity(); // ❌
    return ctx.db.query("app_entities").collect(); // ❌
  },
});
```

### ❌ Riferimenti con _id QUANDO serve externalId
```typescript
// ❌ SBAGLIATO (se il componente fa sync/export):
// Usare _id di Convex per riferimenti in componenti che esportano dati
export const create = mutation({
  args: { name: v.string(), parentId: v.id("entities") },
  handler: async (ctx, args) => {
    return await ctx.db.insert("entities", {
      name: args.name,
      parentId: args.parentId, // ❌ _id non ha senso all'esterno
    });
  },
});

// ✅ CORRETTO (per componenti con sync/export):
export const create = mutation({
  args: { 
    sourceApp: v.string(),
    name: v.string(), 
    parentExternalId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const externalId = generateExternalId(args.sourceApp, "entities");
    return await ctx.db.insert("entities", {
      externalId,
      name: args.name,
      parentExternalId: args.parentExternalId, // ✅ externalId riutilizzabile
    });
  },
});

// ✅ OK (per componenti solo interni, senza sync/export):
export const create = mutation({
  args: { name: v.string(), parentId: v.optional(v.id("entities")) },
  handler: async (ctx, args) => {
    return await ctx.db.insert("entities", {
      name: args.name,
      parentId: args.parentId, // ✅ OK se i dati non escono mai dal deployment
    });
  },
});
```

### ❌ Auth0 nel Componente o nel Pacchetto UI
```typescript
// ❌ SBAGLIATO: Auth0 nel componente backend
// src/component/auth.ts
import { Auth0 } from "convex/server"; // ❌ NON FARE

// ❌ SBAGLIATO: Auth0 nel pacchetto UI
// my-component-ui/src/components/Login.tsx
import { useAuth0 } from "@auth0/auth0-react"; // ❌ NON FARE

// ✅ CORRETTO: Auth0 SOLO nell'app stand-alone
// [nome-stand-alone-app]/convex/auth.ts
import { Auth0 } from "convex/server"; // ✅ OK qui
```

### ❌ Frontend con Dipendenze Convex
```typescript
// SBAGLIATO: Pacchetto UI che importa Convex
import { useQuery } from "convex/react"; // ❌
import { api } from "@convex/_generated/api"; // ❌
```

---

## ✅ Pattern Corretto Completo

### Pattern A: Componente con sync/export (externalId obbligatorio)

```typescript
// ✅ 1. Backend Component (isolato, con externalId per sync)
// src/component/entities/create.ts
import { generateExternalId } from "../lib/externalId";

export const create = mutation({
  args: { 
    sourceApp: v.string(),
    name: v.string(), 
    userId: v.string(), // userId passato, non ctx.auth
    parentExternalId: v.optional(v.string()), // Riferimento con externalId
  },
  handler: async (ctx, args) => {
    const externalId = generateExternalId(args.sourceApp, "entities");
    return await ctx.db.insert("entities", { 
      externalId, // Obbligatorio per sync/export
      name: args.name, 
      userId: args.userId,
      parentExternalId: args.parentExternalId,
    });
  },
});
```

### Pattern B: Componente solo interno (externalId opzionale)

```typescript
// ✅ 1. Backend Component (isolato, senza sync)
// src/component/entities/create.ts
export const create = mutation({
  args: { 
    name: v.string(), 
    userId: v.string(), // userId passato, non ctx.auth
    parentId: v.optional(v.id("entities")), // Riferimento con _id (OK per uso interno)
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("entities", { 
      name: args.name, 
      userId: args.userId,
      parentId: args.parentId, // _id OK se dati non escono dal deployment
    });
  },
});

// ✅ 2. Client API Wrapper
// src/client/index.ts
export function exposeApi(component: ComponentApi, options?: ExposeApiOptions) {
  return {
    createEntity: mutationGeneric({
      args: { name: v.string() },
      handler: async (ctx, args) => {
        const userId = await getUserId(ctx); // Auth nell'app, non nel componente
        return await ctx.runMutation(component.myComponent.entities.create, {
          ...args,
          userId,
        });
      },
    }),
  };
}

// ✅ 3. Frontend Package (puro)
// my-component-ui/src/components/EntitySection.tsx
export function EntitySection({ entities, onCreate }: Props) {
  // Nessuna chiamata Convex, solo props
}

// ✅ 4. App che integra tutto
// linkhub-w4/src/app/entities/page.tsx
import { EntitySection } from "@primohub/my-component-ui";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";

export function EntitiesPage() {
  const createEntity = useMutation(api.myComponent.createEntity);
  return <EntitySection onCreate={() => createEntity({ name: "..." })} />;
}
```

---

---

## 🔒 Compliance Automatica

La documentazione non scala. I vincoli tecnici sì. Per garantire che le regole vengano seguite, usiamo **automazione**.

### Pacchetto ESLint `@primohub/eslint-config`

Installa un pacchetto con regole ESLint che **bloccano il build** se violate:

```bash
npm install @primohub/eslint-config --save-dev
```

**Regole incluse:**

| Regola | Cosa blocca |
|--------|-------------|
| `no-convex-in-ui` | Import di Convex nei pacchetti UI |
| `no-auth-in-component` | Uso di `ctx.auth` nei componenti backend |
| `no-env-in-component` | Uso di `process.env` nei componenti backend |

```javascript
// eslint.config.js (nella [stand-alone-app] o componente)
import primohubConfig from "@primohub/eslint-config";

export default [
  ...primohubConfig,
  // ... altre configurazioni
];
```

### Workflow CI/CD per App Core

```yaml
# .github/workflows/architecture.yml
name: Architecture Guard
on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      
      # Verifica separazione front/back
      - name: ESLint Architecture Rules
        run: npx eslint . --ext .ts,.tsx
      
      - name: Type Check
        run: npx tsc --noEmit
      
      # Verifica Auth0 isolato (solo per [stand-alone-app])
      - name: Verify Auth Isolation
        run: |
          if grep -r "ctx.auth" src/component/; then
            echo "❌ ctx.auth trovato nel componente!"
            exit 1
          fi
          echo "✅ Auth isolato correttamente"
```

### Cosa NON testiamo automaticamente

- **externalId** - È opzionale, la decisione è architetturale caso per caso
- **Struttura cartelle specifica** - Flessibilità per adattarsi ai progetti

### Cosa testiamo automaticamente

| Check | Perché |
|-------|--------|
| **No Convex in UI** | Evita monoliti, mantiene UI riutilizzabile |
| **No ctx.auth in componente** | Isola il componente dal sistema auth |
| **No process.env in componente** | Componente configurabile dall'esterno |
| **TypeScript strict** | Catch errori a compile time |

### Pre-commit Hook (Opzionale)

Per bloccare commit che violano le regole:

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "tsc --noEmit"]
  }
}
```

Per dettagli completi sui vincoli tecnici, vedi `dev_utils/rules-compliance-guidelines.md`.

---

## 📚 Risorse

- **Documentazione Componenti Convex**: `dev_utils/component-convex-docs.md`
- **Documentazione Federation**: `dev_utils/leo-federation-readme.md`
- **Compliance e Vincoli Tecnici**: `dev_utils/rules-compliance-guidelines.md`
- **Esempio Componente**: `okrhub-convex/` (struttura completa con externalId)
- **Esempio UI Kit**: `linkhub-ui-kit/` (componenti React puri)
- **Convex Components Directory**: https://convex.dev/components
- **Federation npm**: https://www.npmjs.com/package/@l_ego/federation

---

## 💡 Domande Frequenti

**Q: Devo sempre creare un pacchetto UI separato?**  
A: No, è opzionale. Puoi scegliere tra:
- **Con pacchetto UI**: Utile se molte app useranno la stessa UI, vuoi consistenza garantita
- **Senza pacchetto UI**: La [stand-alone-app] contiene la UI, i consumer la riscrivono ispirandosi ad essa. Più semplice, più flessibile, ma con duplicazione.

**Q: Perché la [stand-alone-app] deve importare da `dist/`?**  
A: Per garantire che la stand-alone-app usi esattamente lo stesso codice che useranno i consumer esterni. Se importi da `src/component/`, potresti testare codice che poi si comporta diversamente quando viene buildato e pubblicato.

**Q: Posso sviluppare backend e frontend nella stessa repo?**  
A: Sì, ma mantieni la separazione strutturale. Il frontend deve essere in una cartella separata e pubblicabile come pacchetto npm.

**Q: L'app stand-alone è obbligatoria?**  
A: No, ma altamente consigliata per facilitare sviluppo, testing e utilizzo con utenti reali nel 2026.

**Q: Dove va configurato Auth0?**  
A: **SOLO** nell'app stand-alone (`[nome-stand-alone-app]/convex/auth.ts`). Non nel componente backend né nel pacchetto UI.

**Q: Come gestisco la versioning dopo la pubblicazione?**  
A: Usa [Semantic Versioning](https://semver.org/):
- **PATCH** (1.2.3 → 1.2.4): Bugfix retrocompatibili
- **MINOR** (1.2.3 → 1.3.0): Nuove funzionalità retrocompatibili
- **MAJOR** (1.2.3 → 2.0.0): Breaking changes

**Q: Quando devo usare externalId invece di _id?**  
A: Dipende dal caso d'uso:
- **externalId OBBLIGATORIO**: Se il componente fa sync/federation, export verso sistemi esterni, o i dati devono essere copiati in altri deployment
- **externalId OPZIONALE**: Se il componente è solo interno, i dati non escono mai dal deployment, e l'integrazione avviene solo via API

**Q: Posso usare _id per riferimenti interni?**  
A: Sì, se il componente è solo interno e non prevede sync/export. Gli `_id` sono più performanti e semplici da usare. Usa externalId solo quando i dati devono uscire dal contesto Convex.

**Q: Quando usare Federation vs chiamate API?**  
A: 
- **Federation**: Quando serve latenza bassa, resilienza offline, o dati locali per aggregazioni
- **Chiamate API**: Quando i dati devono essere sempre aggiornati, le letture sono poche, o la complessità della Federation non è giustificata

**Q: La Federation richiede sempre externalId?**  
A: Sì. La Federation copia dati tra deployment diversi, dove gli `_id` sono diversi. Senza externalId, le relazioni tra entità si rompono durante la replica.

**Q: Come gestisco le dipendenze tra componenti?**  
A: Un componente può usare altri componenti tramite `component.use()` nel suo `convex.config.ts`. Il frontend può importare più pacchetti UI.

**Q: Devo pubblicare su npm subito?**  
A: No, puoi sviluppare localmente. Pubblica quando il componente è stabile e documentato. Dopo la pubblicazione, segui Semantic Versioning per gli aggiornamenti.

**Q: Come creo index su externalId (se lo uso)?**  
A: Nel `schema.ts`, aggiungi `.index()` dopo `defineTable()`:
```typescript
entities: defineTable({
  externalId: v.string(),
  parentExternalId: v.optional(v.string()),
})
  .index("by_externalId", ["externalId"])
  .index("by_parentExternalId", ["parentExternalId"]),
```

**Q: Come decido se un componente avrà bisogno di sync in futuro?**  
A: Considera:
- Il componente gestisce dati che potrebbero essere condivisi tra app diverse?
- C'è possibilità di integrazione con sistemi esterni (CRM, ERP, webhook)?
- I dati potrebbero essere esportati per analytics o backup?
Se la risposta è "forse" a una di queste, considera di usare externalId fin dall'inizio. Il refactor successivo è costoso.

---

**Ultimo aggiornamento:** Gennaio 2026  
**Mantieni questo documento aggiornato quando aggiungi nuovi pattern o best practices.**
