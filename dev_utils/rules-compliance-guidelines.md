Capisco la paura, Willi. È legittima: regole sono inutili se nessuno le segue. Ma la soluzione non è più documentazione, è **automazione e vincoli tecnici**.

Ecco un approccio brutale e pratico:

## 1. Vincoli Tecnici (Non Puoi Sbagliare)

### ESLint Custom Rules

Crea un pacchetto `@primohub/eslint-config` con regole che **bloccano il build**:

```javascript
// eslint-plugin-primohub/rules/no-convex-in-ui.js
module.exports = {
  meta: { type: "error" },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (
          node.source.value.includes("convex") &&
          context.getFilename().includes("ui-kit")
        ) {
          context.report({
            node,
            message: "❌ UI Kit NON può importare Convex. Usa props.",
          });
        }
      },
    };
  },
};
```

```javascript
// eslint-plugin-primohub/rules/no-auth-in-component.js
module.exports = {
  create(context) {
    return {
      MemberExpression(node) {
        if (
          node.object.name === "ctx" &&
          node.property.name === "auth" &&
          context.getFilename().includes("src/component")
        ) {
          context.report({
            node,
            message: "❌ Componente NON può usare ctx.auth. Passa userId.",
          });
        }
      },
    };
  },
};
```

```javascript
// eslint-plugin-primohub/rules/require-external-id.js
module.exports = {
  create(context) {
    // Controlla che ogni defineTable abbia externalId
    // e che i riferimenti usino externalId, non _id
  },
};
```

### Husky + lint-staged

Blocca il commit se le regole falliscono:

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

## 2. Test di Architettura

Usa **ArchUnit** (o equivalente TS) per testare la struttura:

```typescript
// architecture.test.ts
import { arch } from "arch-check";

test("UI Kit non dipende da Convex", () => {
  arch
    .packages()
    .that()
    .resideInAPackage("..ui-kit..")
    .should()
    .notDependOnPackagesThat()
    .resideInAPackage("..convex..");
});

test("Componenti non usano ctx.auth", () => {
  arch.classes().that().resideInAPackage("..component..").should().notCall("ctx.auth");
});
```

## 3. CI/CD come Guardiano

```yaml
# .github/workflows/architecture.yml
name: Architecture Guard
on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: npm ci

      - name: ESLint Architecture Rules
        run: npx eslint . --ext .ts,.tsx

      - name: Type Check
        run: npx tsc --noEmit

      - name: Architecture Tests
        run: npm run test:architecture

      - name: Check External IDs in Schema
        run: node scripts/verify-external-ids.js

      - name: Verify No Auth0 in Component/UI
        run: node scripts/verify-auth-isolation.js
```

## 4. Script di Verifica Automatica

```javascript
// scripts/verify-external-ids.js
const fs = require("fs");
const glob = require("glob");

const schemaFiles = glob.sync("**/src/component/**/schema.ts");

let errors = 0;

for (const file of schemaFiles) {
  const content = fs.readFileSync(file, "utf8");

  // Ogni defineTable deve avere externalId
  const tables = content.match(/defineTable\(\{[^}]+\}\)/gs) || [];

  for (const table of tables) {
    if (!table.includes("externalId")) {
      console.error(`❌ ${file}: Tabella senza externalId`);
      errors++;
    }
  }

  // Ogni riferimento deve usare externalId, non _id
  if (content.includes("v.id(") && !content.includes("externalId")) {
    console.error(`❌ ${file}: Usa v.id() invece di externalId`);
    errors++;
  }
}

if (errors > 0) {
  process.exit(1);
}
console.log("✅ Tutte le tabelle hanno externalId corretto");
```

```javascript
// scripts/verify-auth-isolation.js
const fs = require("fs");
const glob = require("glob");

// Cerca Auth0 nel posto sbagliato
const badFiles = [
  ...glob.sync("**/src/component/**/auth.ts"),
  ...glob.sync("**/ui-kit/**/*auth*"),
];

if (badFiles.length > 0) {
  console.error("❌ Auth0 trovato nel posto sbagliato:");
  badFiles.forEach((f) => console.error(`   ${f}`));
  process.exit(1);
}

console.log("✅ Auth0 isolato correttamente nell'app stand-alone");
```

## 5. Template con Vincoli Incorporati

Crea un **generator** che imposta tutto correttamente:

```bash
# packages/create-primohub-component
npx create-primohub-component my-feature
```

Questo genera:
- Struttura cartelle corretta
- ESLint config pre-configurato
- Husky installato
- Test di architettura di base
- Schema con externalId già presente

## 6. Code Review Checklist Automatizzata

Usa **Danger.js** per commenti automatici nelle PR:

```javascript
// dangerfile.ts
import { danger, fail } from "danger";

// Controlla che nuovi componenti abbiano externalId
const newSchemaFiles = danger.git.created_files.filter((f) =>
  f.includes("schema.ts")
);

for (const file of newSchemaFiles) {
  const content = danger.git.diffForFile(file);
  if (!content.includes("externalId")) {
    fail(`❌ ${file}: Manca externalId nello schema`);
  }
}

// Controlla che UI non importi Convex
const uiFiles = danger.git.modified_files.filter((f) =>
  f.includes("ui-kit")
);
for (const file of uiFiles) {
  const content = danger.git.diffForFile(file);
  if (content.includes("from \"convex\"")) {
    fail(`❌ ${file}: UI Kit non può importare Convex`);
  }
}
```

## 7. Dashboard di Compliance

Crea una pagina interna che mostri:

```typescript
// apps/dashboard/pages/architecture.tsx
export default function ArchitectureDashboard() {
  const checks = useQuery(api.architecture.runAllChecks);

  return (
    <div>
      {checks.map((check) => (
        <CheckRow
          key={check.name}
          name={check.name}
          status={check.passed ? "✅" : "❌"}
          details={check.details}
        />
      ))}
    </div>
  );
}
```

## La Verità Brutale

> **La documentazione non scala. I vincoli tecnici sì.**

Non chiedere alle persone di "ricordarsi" le regole. Rendile **impossibili da violare** senza rompere il build.

**Domanda per te:** Qual è la regola che ti preoccupa di più? Iniziamo da quella e creiamo un vincolo tecnico che la blocchi automaticamente.