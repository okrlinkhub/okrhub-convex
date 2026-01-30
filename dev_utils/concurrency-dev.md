Capisco, riprendo con esempi concreti dal tuo dominio: **prescrizioni dentali** e **calendario appuntamenti**.

---

## Cosa Significa "Stub" (Spiegato per i Tuoi Ragazzi)

**Stub = Un finto oggetto che risponde come se fosse reale, ma senza fare il lavoro vero.**

```
Scenario: Team Prescrizioni e Team Calendario lavorano in parallelo

┌─────────────────────────────────────────────────────────────────┐
│  Team Prescrizioni (lento, backend complesso)                   │
│  ─────────────────────────────────────────────                  │
│  Sta costruendo:                                                 │
│  - Validazione farmaci compatibili                              │
│  - Controlli allergie paziente                                  │
│  - Integrazione con farmacie                                    │
│  Tempo stimato: 3 settimane                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Team Calendario (veloce, serve subito)                         │
│  ─────────────────────────────────────────────────              │
│  Deve mostrare: "Appuntamento del 15/02 - Prescrizione: ???"    │
│                                                                │
│  Senza stub: BLOCCATO, aspetta 3 settimane                     │
│                                                                │
│  Con stub: PROCEED, usa dati finti temporanei                  │
│  "Prescrizione: Amoxicillina 500mg - Dr. Rossi" (finto)        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Esempio Pratico: Prescrizioni

### Team Prescrizioni: Il Componente Reale

```typescript
// @primohub/prescrizioni/src/component/prescrizioni.ts

export const getPrescrizione = query({
  args: { 
    prescrizioneId: v.string(),
    // 👇 Team Calendario passa anche pazienteId per sicurezza
    pazienteId: v.string() 
  },
  returns: v.object({
    _id: v.string(),
    farmaco: v.string(),
    dosaggio: v.string(),
    dottore: v.string(),
    data: v.number(),
    // ⚠️ Campo opzionale per estensibilità
    note: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // Qui ci sarà la logica complessa (v2)
    // Per ora (v0.1) ritorna solo i dati base
    return ctx.db.get(args.prescrizioneId);
  },
});
```

### Team Prescrizioni: Il Client con Modalità "Finta"

```typescript
// @primohub/prescrizioni/src/client/index.ts

export class PrescrizioniClient {
  constructor(
    private component: ComponentApi,
    private options: {
      getDottoreId: () => Promise<string>;
      // 👇 NUOVO: modalità "finta" per sviluppo parallelo
      usaDatiFinti?: boolean;
    }
  ) {}

  async getPrescrizione(ctx: any, args: { prescrizioneId: string; pazienteId: string }) {
    // Se siamo in modalità "finta", non chiamo il database
    if (this.options.usaDatiFinti) {
      return {
        _id: args.prescrizioneId,
        farmaco: "Amoxicillina 500mg",
        dosaggio: "1 compressa ogni 8 ore per 7 giorni",
        dottore: "Dr. Mario Rossi",
        data: Date.now(),
        note: "⚠️ DATO FINTO - Prescrizioni non ancora pronto",
      };
    }

    // Altrimenti, chiama il vero backend
    return ctx.runQuery(this.component.prescrizioni.getPrescrizione, args);
  }
}
```

---

## Esempio Pratico: Calendario Appuntamenti

### Team Calendario: Usa il Componente Prescrizioni (in Modalità Finta)

```typescript
// primoup-core/convex/calendario.ts

import { PrescrizioniClient } from "@primohub/prescrizioni";

const prescrizioni = new PrescrizioniClient(components.prescrizioni, {
  getDottoreId: getAuthUserId,
  usaDatiFinti: process.env.PRESCRIZIONI_FINTE === "true", // 👈 Attiva finte
});

export const getAppuntamento = query({
  args: { appuntamentoId: v.string() },
  handler: async (ctx, args) => {
    const appuntamento = await ctx.db.get(args.appuntamentoId);
    
    // Qui serve la prescrizione, ma il backend non è pronto!
    // Con usaDatiFinti: true, ottengo dati plausibili per testare UI
    const prescrizione = await prescrizioni.getPrescrizione(ctx, {
      prescrizioneId: appuntamento.prescrizioneId,
      pazienteId: appuntamento.pazienteId,
    });

    return {
      ...appuntamento,
      prescrizione, // 👈 Ha i dati finti, UI funziona
    };
  },
});
```

### File .env per Sviluppo Locale

```bash
# primoup-core/.env.local (solo sviluppo Team Calendario)
PRESCRIZIONI_FINTE=true
```

Quando Team Prescrizioni finisce:
```bash
# Togli la riga, o metti false
PRESCRIZIONI_FINTE=false  # Ora usa il vero backend
```

---

## Cosa Dire ai Ragazzi (Script)

### Al Team Prescrizioni (il lento)

> *"Voi dovete pubblicare il componente @primohub/prescrizioni subito, anche se fa poco. La versione 0.1 può solo salvare e leggere prescrizioni senza validazioni. L'importante è che l'interfaccia (i tipi) sia stabile. Aggiungete una modalità 'finta' che ritorna dati plausibili così il Team Calendario può lavorare."*

### Al Team Calendario (il veloce)

> *"Non aspettate che le prescrizioni siano finite. Installate @primohub/prescrizioni, attivate PRESCRIZIONI_FINTE=true nel vostro .env, e sviluppate l'UI del calendario con dati finti realistici. Quando il Team Prescrizioni finisce, togliete il flag e testate con dati veri."*

---

## Schema Visivo del Flusso

```
Giorno 1: Entrambi partono insieme
─────────────────────────────────────────────────────────────────

Team Prescrizioni                    Team Calendario
─────────────────                    ───────────────
Pubblica v0.1 (minimale)             Installa @primohub/prescrizioni
├─ Schema database                     Attiva: PRESCRIZIONI_FINTE=true
├─ 2 query base                        │
└─ Modalità "finta"                   ▼
                                       Sviluppa UI calendario
                                       con prescrizioni finte
                                              │
Giorno 5: Feedback                    ◄─────┘
─────────────────────────────────────────────────────────────────
"Ci serve anche il campo 'scadenza'"   "Ok, aggiorniamo"

Team Prescrizioni                    Team Calendario
─────────────────                    ───────────────
Pubblica v0.2                          Aggiorna, usa scadenza nelle finte
├─ Aggiunge campo 'scadenza'           Continua sviluppo UI
└─ Finte aggiornate                    │
                                              │
Giorno 15: Pronti                     ◄─────┘
─────────────────────────────────────────────────────────────────

Team Prescrizioni                    Team Calendario
─────────────────                    ───────────────
Backend completo pronto                Toglie PRESCRIZIONI_FINTE=false
Validazioni, integrazioni              Test integrazione
│                                              │
└──────────────────► Entrambi felici ◄─────────┘
```

---

## Checklist per i Ragazzi

```
Team Prescrizioni:
□ Pubblica v0.1 entro giorno 2 (anche se fa poco)
□ Aggiungi parametro usaDatiFinti nel client
□ I dati finti devono essere realistici (nomi veri di farmaci)
□ Documenta: quali campi arriveranno in v0.2, v0.3...

Team Calendario:
□ Installa subito il componente, non aspettare
□ Attiva PRESCRIZIONI_FINTE=true in .env.local
□ Sviluppa UI assumendo che i dati siano "quasi veri"
□ Dai feedback al Team Prescrizioni su campi mancanti
```

Vuoi che aggiunga un esempio con il calendario come componente (perché anche quello potrebbe servire ad altri)?

Perfetto. Ecco l'esempio completo con **entrambi i componenti** che si usano a vicenda in modalità "finta", più il **Team Core** che li installa entrambi.

---

## Scenario: Tre Team in Parallelo

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Team           │     │  Team           │     │  Team Core      │
│  Prescrizioni   │◄───►│  Calendario     │◄───►│  (PrimoUpCore)  │
│  (3 settimane)  │     │  (2 settimane)  │     │  (4 settimane)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        └───────────────────────┴───────────────────────┘
                              │
                              ▼
                    Nessuno aspetta nessuno
```

---

## Componente: @primohub/prescrizioni

```typescript
// src/component/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  prescrizioni: defineTable({
    pazienteId: v.string(),
    dottoreId: v.string(),
    farmaco: v.string(),
    dosaggio: v.string(),
    data: v.number(),
    // 🔮 Per v0.2: scadenza, note, allegati
    note: v.optional(v.string()),
  })
    .index("by_paziente", ["pazienteId"])
    .index("by_dottore", ["dottoreId"]),
});
```

```typescript
// src/component/prescrizioni.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const crea = mutation({
  args: {
    pazienteId: v.string(),
    dottoreId: v.string(),  // Passato esplicitamente, no ctx.auth
    farmaco: v.string(),
    dosaggio: v.string(),
    note: v.optional(v.string()),
  },
  returns: v.string(), // _id
  handler: async (ctx, args) => {
    return ctx.db.insert("prescrizioni", {
      ...args,
      data: Date.now(),
    });
  },
});

export const perPaziente = query({
  args: { pazienteId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("prescrizioni")
      .withIndex("by_paziente", (q) => q.eq("pazienteId", args.pazienteId))
      .collect();
  },
});
```

```typescript
// src/client/index.ts
import type { ComponentApi } from "../component/_generated/component.js";

export interface Prescrizione {
  _id: string;
  pazienteId: string;
  dottoreId: string;
  farmaco: string;
  dosaggio: string;
  data: number;
  note?: string;
}

export class PrescrizioniClient {
  constructor(
    private component: ComponentApi,
    private options: {
      getDottoreId: (ctx: any) => Promise<string | null>;
      usaDatiFinti?: boolean;
    }
  ) {}

  async crea(ctx: any, args: Omit<Prescrizione, "_id" | "data">) {
    if (this.options.usaDatiFinti) {
      console.log("[PRESCRIZIONI-FINTE] Simulo creazione:", args.farmaco);
      return `finta_${Date.now()}`;
    }
    return ctx.runMutation(this.component.prescrizioni.crea, args);
  }

  async perPaziente(ctx: any, pazienteId: string): Promise<Prescrizione[]> {
    if (this.options.usaDatiFinti) {
      // Dati plausibili per dentisti
      return [
        {
          _id: "finta_1",
          pazienteId,
          dottoreId: "dott_rossi",
          farmaco: "Amoxicillina 1000mg",
          dosaggio: "1 compressa ogni 12 ore per 7 giorni",
          data: Date.now() - 86400000, // Ieri
          note: "⚠️ DATO FINTO - Prescrizione di esempio",
        },
        {
          _id: "finta_2",
          pazienteId,
          dottoreId: "dott_bianchi",
          farmaco: "Ibuprofene 600mg",
          dosaggio: "1 compressa ogni 8 ore in caso di dolore",
          data: Date.now() - 172800000, // 2 giorni fa
        },
      ];
    }
    return ctx.runQuery(this.component.prescrizioni.perPaziente, { pazienteId });
  }
}
```

---

## Componente: @primohub/calendario

```typescript
// src/component/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  appuntamenti: defineTable({
    pazienteId: v.string(),
    dottoreId: v.string(),
    inizio: v.number(), // timestamp
    fine: v.number(),
    tipo: v.union(
      v.literal("visita"),
      v.literal("pulizia"),
      v.literal("estrazione"),
      v.literal("controllo")
    ),
    prescrizioneId: v.optional(v.string()), // Riferimento esterno
    note: v.optional(v.string()),
  })
    .index("by_dottore_data", ["dottoreId", "inizio"])
    .index("by_paziente", ["pazienteId"]),
});
```

```typescript
// src/component/appuntamenti.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const crea = mutation({
  args: {
    pazienteId: v.string(),
    dottoreId: v.string(),
    inizio: v.number(),
    fine: v.number(),
    tipo: v.union(
      v.literal("visita"),
      v.literal("pulizia"),
      v.literal("estrazione"),
      v.literal("controllo")
    ),
    prescrizioneId: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    // TODO v0.2: controlla sovrapposizioni
    return ctx.db.insert("appuntamenti", args);
  },
});

export const perIntervallo = query({
  args: {
    dottoreId: v.string(),
    da: v.number(),
    a: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("appuntamenti")
      .withIndex("by_dottore_data", (q) => 
        q.eq("dottoreId", args.dottoreId).gte("inizio", args.da).lte("inizio", args.a)
      )
      .collect();
  },
});
```

```typescript
// src/client/index.ts
import type { ComponentApi } from "../component/_generated/component.js";
import type { PrescrizioniClient } from "@primohub/prescrizioni"; // Dipendenza!

export interface Appuntamento {
  _id: string;
  pazienteId: string;
  dottoreId: string;
  inizio: number;
  fine: number;
  tipo: "visita" | "pulizia" | "estrazione" | "controllo";
  prescrizioneId?: string;
  note?: string;
}

export interface AppuntamentoConPrescrizione extends Appuntamento {
  prescrizione?: {
    farmaco: string;
    dosaggio: string;
  };
}

export class CalendarioClient {
  constructor(
    private component: ComponentApi,
    private options: {
      getDottoreId: (ctx: any) => Promise<string | null>;
      usaDatiFinti?: boolean;
      // 👇 Riferimento al client prescrizioni (può essere finto anch'esso!)
      prescrizioni?: PrescrizioniClient;
    }
  ) {}

  async crea(ctx: any, args: Omit<Appuntamento, "_id">) {
    if (this.options.usaDatiFinti) {
      console.log("[CALENDARIO-FINTO] Simulo appuntamento:", args.tipo);
      return `finta_${Date.now()}`;
    }
    return ctx.runMutation(this.component.appuntamenti.crea, args);
  }

  async perIntervallo(
    ctx: any, 
    dottoreId: string, 
    da: number, 
    a: number
  ): Promise<AppuntamentoConPrescrizione[]> {
    // Prendi appuntamenti (finti o reali)
    const appuntamenti = this.options.usaDatiFinti
      ? this.generaAppuntamentiFinti(dottoreId, da, a)
      : await ctx.runQuery(this.component.appuntamenti.perIntervallo, {
          dottoreId, da, a
        });

    // Arricchisci con prescrizioni (se il client è fornito)
    if (this.options.prescrizioni) {
      return Promise.all(
        appuntamenti.map(async (app) => {
          if (!app.prescrizioneId) return app;
          
          const prescrizioni = await this.options.prescrizioni!.perPaziente(
            ctx, 
            app.pazienteId
          );
          const prescrizione = prescrizioni.find(p => p._id === app.prescrizioneId);
          
          return {
            ...app,
            prescrizione: prescrizione ? {
              farmaco: prescrizione.farmaco,
              dosaggio: prescrizione.dosaggio,
            } : undefined,
          };
        })
      );
    }

    return appuntamenti;
  }

  private generaAppuntamentiFinti(dottoreId: string, da: number, a: number): Appuntamento[] {
    return [
      {
        _id: "finta_app_1",
        pazienteId: "paz_mario_rossi",
        dottoreId,
        inizio: da + 3600000, // 1 ora dopo inizio
        fine: da + 7200000,   // 2 ore dopo
        tipo: "visita",
        prescrizioneId: "finta_1",
        note: "⚠️ APPUNTAMENTO FINTO",
      },
      {
        _id: "finta_app_2",
        pazienteId: "paz_luisa_bianchi",
        dottoreId,
        inizio: da + 10800000, // 3 ore dopo
        fine: da + 14400000,   // 4 ore dopo
        tipo: "pulizia",
        note: "⚠️ APPUNTAMENTO FINTO",
      },
    ];
  }
}
```

---

## Team Core: PrimoUpCore (Installa Entrambi)

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import prescrizioni from "@primohub/prescrizioni/convex.config";
import calendario from "@primohub/calendario/convex.config";

const app = defineApp();
app.use(prescrizioni);
app.use(calendario);
export default app;
```

```typescript
// convex/api.ts
import { mutation, query } from "./_generated/server";
import { components } from "./_generated/api";
import { PrescrizioniClient } from "@primohub/prescrizioni";
import { CalendarioClient } from "@primohub/calendario";
import { getAuthUserId } from "@convex-dev/auth/server";

// Configura i client con modalità finta da environment
const usaDatiFinti = process.env.DEV_FINTO === "true";

const prescrizioni = new PrescrizioniClient(components.prescrizioni, {
  getDottoreId: getAuthUserId,
  usaDatiFinti,
});

const calendario = new CalendarioClient(components.calendario, {
  getDottoreId: getAuthUserId,
  usaDatiFinti,
  // 👇 Calendario usa prescrizioni per arricchire i dati
  prescrizioni: usaDatiFinti ? prescrizioni : undefined, // In produzione usa diretto
});
```

### API Pubbliche del Core

```typescript
// convex/api.ts (continua)

// Dashboard: prossimi appuntamenti con dettagli prescrizione
export const dashboardOggi = query({
  handler: async (ctx) => {
    const dottoreId = await getAuthUserId(ctx);
    if (!dottoreId) throw new Error("Non autenticato");

    const inizioGiornata = new Date().setHours(0, 0, 0, 0);
    const fineGiornata = new Date().setHours(23, 59, 59, 999);

    // 👇 Questa chiamata attraversa 2 componenti, entrambi possono essere finti
    const appuntamenti = await calendario.perIntervallo(
      ctx,
      dottoreId,
      inizioGiornata,
      fineGiornata
    );

    return {
      totale: appuntamenti.length,
      visite: appuntamenti.filter(a => a.tipo === "visita"),
      conPrescrizione: appuntamenti.filter(a => a.prescrizione),
      appuntamenti,
    };
  },
});

// Crea appuntamento + prescrizione in un colpo
export const creaVisitaCompleta = mutation({
  args: {
    pazienteId: v.string(),
    inizio: v.number(),
    fine: v.number(),
    farmaco: v.optional(v.string()),
    dosaggio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const dottoreId = await getAuthUserId(ctx);
    if (!dottoreId) throw new Error("Non autenticato");

    // 1. Crea prescrizione se fornita
    let prescrizioneId: string | undefined;
    if (args.farmaco && args.dosaggio) {
      prescrizioneId = await prescrizioni.crea(ctx, {
        pazienteId: args.pazienteId,
        dottoreId,
        farmaco: args.farmaco,
        dosaggio: args.dosaggio,
      });
    }

    // 2. Crea appuntamento collegato
    const appuntamentoId = await calendario.crea(ctx, {
      pazienteId: args.pazienteId,
      dottoreId,
      inizio: args.inizio,
      fine: args.fine,
      tipo: "visita",
      prescrizioneId,
    });

    return { appuntamentoId, prescrizioneId };
  },
});
```

---

## File .env per Sviluppo

```bash
# .env.local (Team Core in sviluppo)
DEV_FINTO=true

# Quando un componente è pronto, puoi granularizzare:
# PRESCRIZIONI_FINTE=false
# CALENDARIO_FINTO=true
```

---

## Timeline dello Sviluppo Parallelo

```
Giorno 1: Kickoff
─────────────────────────────────────────────────────────────────
Team Prescrizioni          Team Calendario           Team Core
─────────────────          ───────────────           ─────────
Pubblica v0.1              Pubblica v0.1             npm install di entrambi
├─ Schema base             ├─ Schema base            Attiva DEV_FINTO=true
├─ 2 query                 ├─ 2 query                Inizia UI dashboard
└─ Dati finti              ├─ Dati finti
                           └─ Integra prescrizioni (anche finte!)

Giorno 5: Primo test integrato
─────────────────────────────────────────────────────────────────
Team Prescrizioni ◄────── "Manca campo 'scadenza'" ─────── Team Core
                           │
                           ▼
                    Team Calendario aggiunge supporto
                    per scadenza nelle finte

Giorno 10: Primo componente pronto
─────────────────────────────────────────────────────────────────
Team Prescrizioni          Team Calendario           Team Core
─────────────────          ───────────────           ─────────
v0.5 pronto!               Ancora in sviluppo        PRESCRIZIONI_FINTE=false
Validazioni complete       (sovrapposizioni)         Testa con prescrizioni reali
Integrazione farmacie                                Calendario ancora finto

Giorno 15: Tutto pronto
─────────────────────────────────────────────────────────────────
Entrambi i componenti v1.0, Team Core toglie tutti i flag finti
```

---

## Checklist per i Tre Team

### Team Prescrizioni
```
□ Pubblica v0.1 entro giorno 2 (schema + 2 query + finte)
□ I dati finti usano nomi farmaci reali (Amoxicillina, Ibuprofene...)
□ Aggiungi campi opzionali per estensibilità (note, scadenza)
□ Comunica al Team Calendario: "prescrizioneId può essere undefined"
```

### Team Calendario
```
□ Pubblica v0.1 entro giorno 2 (schema + 2 query + finte)
□ Accetta PrescrizioniClient opzionale nel costruttore
□ Se prescrizioni fornito, arricchisci appuntamenti
□ Dati finti realistici: orari studio dentistico (9-18)
```

### Team Core
```
□ Installa entrambi i componenti subito, non aspettare
□ Attiva DEV_FINTO=true per sviluppo UI
□ Testa integrazione: appuntamento con prescrizione collegata
□ Feedback rapido: "serve campo X" entro 24h
□ Quando un componente è pronto, disabilita solo quel flag
```

---

## Vantaggi di Questo Approccio

| Prima (bloccati) | Ora (paralleli) |
|------------------|-----------------|
| Team Calendario aspetta Prescrizioni | Team Calendario usa dati finti, procede |
| Team Core aspetta entrambi | Team Core sviluppa UI con finti, integra dopo |
| Codice fake sparso ovunque | Dati finti centralizzati nei componenti |
| "È pronto?" ogni giorno | "Ho visto che manca X" feedback strutturato |

Vuoi che aggiunga un esempio di test che verifica che i dati finti e reali abbiano la stessa forma (per evitare sorprese quando si cambia modalità)?