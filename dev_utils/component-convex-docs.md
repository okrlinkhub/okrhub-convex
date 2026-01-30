# Components

Convex Components package up code and data in a sandbox that allows you to confidently and quickly add new features to your backend.

Convex Components are like mini self-contained Convex backends, and installing them is always safe. They can't read your app's tables or call your app's functions unless you pass them in explicitly.

You can read about the full vision in [Convex: The Software-Defined Database](https://stack.convex.dev/the-software-defined-database#introducing-convex-components).

Components can be installed from NPM or from a local folder. Once installed, they have their own database tables and isolated function execution environment. Check out the full directory of components on the [Convex website](https://convex.dev/components).

## [Understanding components](/components/understanding.md)

[Explore the concepts behind and build a mental model for how components work.](/components/understanding.md)

## [Using components](/components/using.md)

[Learn about useful components and how to use them in your application.](/components/using.md)

## [Authoring components](/components/authoring.md)

[Learn how to write and publish a component.](/components/authoring.md)

## [Components Directory](https://convex.dev/components)

[List of all components.](https://convex.dev/components)

# Understanding Components

Convex Components are self-contained backend modules that bundle functions, schemas, and data together. They let you add complex functionality to your app—like authentication, rate limiting, or document collaboration—without implementing everything from scratch.

If you've worked with modern web development, you've likely encountered similar ideas in different forms. Components draw inspiration from frontend components, third-party APIs, and service-oriented architectures. The key difference is that Convex Components run within your backend, giving you composability combined with the persistence and reliability of backend services.

The following diagram shows how data and function access works in the component ecosystem. Arrows from one element to another represent that an element has access to the functions or data of the other element.

![Screenshot of the component dropdown](/img/components-diagram.png)

### Data[​](#data "Direct link to Data")

Similar to frontend components, Convex Components encapsulate state and behavior and allow exposing a clean interface. However, instead of storing state in memory, these can have internal state machines that can persist between user sessions, span users, and change in response to external inputs, such as webhooks. Components can store data in a few ways:

* Database tables with their own schema validation definitions. Since Convex is realtime by default, data reads are automatically reactive, and writes commit transactionally.
* File storage, independent of the main app's file storage.
* Durable functions via the built-in function scheduler. Components can schedule functions to run in the future and pass along state.

Typically, libraries require configuring a third party service to add stateful off-the-shelf functionality, which lack the transactional guarantees that come from storing state in the same database.

### Isolation[​](#isolation "Direct link to Isolation")

Similar to regular npm libraries, Convex Components include functions, type safety, and are called from your code. However, they also provide extra guarantees.

* Similar to an external service, code inside a component can't read data that is not explicitly provided to it. This includes database tables, file storage, environment variables, scheduled functions, etc. Conversely, the component's data cannot be directly mutated by the main app, allowing full separation of concerns.
* Similar to a service-oriented architecture, functions in components are run in an isolated environment, so writes to global variables and patches to system behavior are not shared between components.
* Similar to a monolithic architecture, data changes commit transactionally across calls to components, without having to reason about complicated distributed commit protocols or data inconsistencies. You'll never have a component commit data but have the calling code roll back.
* In addition, each mutation call to a component is a sub-transaction isolated from other calls, allowing you to safely catch errors thrown by components. This also allows component authors to easily reason about state changes without races, and trust that a thrown exception will always roll back the component's sub-transaction. [Read more](/components/using.md#transactions).

### Encapsulation[​](#encapsulation "Direct link to Encapsulation")

Being able to reason about your code is essential to scaling a codebase. Components allow you to reason about API boundaries and abstractions.

* The transactional guarantees discussed above allows authors and users of components to reason locally about data changes.
* Components expose an explicit API, not direct database table access. Data invariants can be enforced in code, within the abstraction boundary. For example, the [aggregate component](https://convex.dev/components/aggregate) can internally denormalize data, the [rate limiter](https://convex.dev/components/rate-limiter) component can shard its data, and the [push notification](https://convex.dev/components/push-notifications) component can internally batch API requests, while maintaining simple interfaces.
* Runtime validation ensures all data that cross a component boundary are validated: both arguments and return values. As with normal Convex functions, the validators also specify the TypeScript types, providing end-to-end typing with runtime guarantees.

# Using Components

Convex Components add new features to your backend in their own sandbox with their own functions, schema and data, scheduled functions and all other fundamental Convex features.

You can see the full list of components in the [directory](https://convex.dev/components).

## Installation[​](#installation "Direct link to Installation")

We'll use the [Agent](https://www.npmjs.com/package/@convex-dev/agent) component as an example.

1. Install from \`npm\`

   ```
   npm i @convex-dev/agent
   ```

2. Add the component to your app

   Create or update the `convex.config.ts` file in your app's `convex/` folder and install the component by calling `use`. Multiple instances of the same component can be installed by calling `use` multiple times with different names. Each will have their own tables and functions.

   convex/convex.config.ts

   TS

   ```
   import { defineApp } from "convex/server";
   import agent from "@convex-dev/agent/convex.config.js";

   const app = defineApp();

   app.use(agent);
   app.use(agent, { name: "agent2" });
   //... Add other components here

   export default app;
   ```

3. Run convex dev

   The `convex dev` CLI command will generate code necessary for using the component.

   ```
   npx convex dev
   ```

4. Access the component through its API

   Each instance of a component has its API listed under the `components` object by its name. Some components wrap this API with classes or functions. Check out each component's documentation for more details on its usage.

   ```
   import { components } from "./_generated/api.js";

   const agent = new Agent(components.agent, { ... });
   ```

## Using the component's API directly[​](#using-the-components-api-directly "Direct link to Using the component's API directly")

Though components may expose higher level TypeScript APIs, under the hood they are called via normal Convex functions over the component sandbox boundary.

Queries, mutations, and action rules still apply - queries can only call component queries, mutations can also call component mutations, and actions can also call component actions. As a result, queries into components are reactive by default, and mutations have the same transaction guarantees.

Component functions can be called from your application using the following syntax:

```
import { internalAction } from "./_generated/server";
import { components } from "./_generated/api";

export const myAction = internalAction({
  args: { threadId: v.string() },
  handler: async (ctx, args) => {
    // Call the component's API to get the thread status.
    const { status } = await ctx.runQuery(components.agent.threads.getThread, {
      threadId: args.threadId,
    });
    //...
  },
});
```

Some components abstract away the component's API. For instance, the `Agent` class from `@convex-dev/agent` is initialized with `components.agent`, and its methods take in `ctx` so they can call the component's API internally. [Learn more about the Agent Component here](/agents.md).

## Transactions[​](#transactions "Direct link to Transactions")

Remember that mutation functions in Convex are [transactions](/functions/mutation-functions.md#transactions). Either all the changes in the mutation get written at once or none are written at all.

All writes for a top-level mutation call, including writes performed by calls into other components' mutations, are committed at the same time. If the top-level mutation throws an error, all of the writes are rolled back, and the mutation doesn't change the database at all.

However, if a component mutation call throws an exception, only its writes are rolled back. Then, if the caller catches the exception, it can continue, perform more writes, and return successfully. If the caller doesn't catch the exception, then it's treated as failed and all the writes associated with the caller mutation are rolled back. This means your code can choose a different code path depending on the semantics of your component.

As an example, take the [Rate Limiter](https://www.npmjs.com/package/@convex-dev/ratelimiter) component. One API of the Rate Limiter throws an error if a rate limit is hit:

```
// Automatically throw an error if the rate limit is hit.
await rateLimiter.limit(ctx, "failedLogins", { key: userId, throws: true });
```

If the call to `rateLimiter.limit` throws an exception, we're over the rate limit. Then, if the calling mutation doesn't catch this exception, the whole transaction is rolled back.

The calling mutation, on the other hand, could also decide to ignore the rate limit by catching the exception and proceeding. For example, an app may want to ignore rate limits if there is a development environment override. In this case, only the component mutation will be rolled back, and the rest of the mutation will continue.

## Dashboard[​](#dashboard "Direct link to Dashboard")

You can see your component’s data, functions, files, logs, and other info using the dropdown in the Dashboard. You can also use the dropdown to exclude info from certain components.

![Screenshot of the component dropdown](/screenshots/component_dropdown.png)

## Testing components[​](#testing-components "Direct link to Testing components")

When writing tests with [`convex-test`](/testing/convex-test.md), that use components, you must register the component with the test instance. This tells it what schema to validate and where to find the component source code. Most components export convenient helper functions on `/test` to make this easy:

convex/some.test.ts

TS

```
import agentTest from "@convex-dev/agent/test";
import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import { components } from "./_generated/api";
import { createThread } from "@convex-dev/agent";

// Define this once, often in a shared test helper file.
export function initConvexTest() {
  const t = convexTest();
  agentTest.register(t);
  return t;
}

test("Agent createThread", async () => {
  const t = initConvexTest();

  const threadId = await t.run(async (ctx) => {
    // Calling functions that use ctx and components.agent
    return await createThread(ctx, components.agent, {
      title: "Hello, world!",
    });
  });
  // Calling functions directly on the component's API
  const thread = await t.query(components.agent.threads.getThread, {
    threadId,
  });
  expect(thread).toMatchObject({
    title: "Hello, world!",
  });
});
```

If you need to register the component yourself, you can do so by passing the component's schema and modules to the test instance.

convex/manual.test.ts

TS

```
/// <reference types="vite/client" />
import { test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./path/to/component/schema.ts";
const modules = import.meta.glob("./path/to/component/**/*.ts");

test("Test something with a local component", async () => {
  const t = convexTest();
  t.registerComponent("componentName", schema, modules);

  await t.run(async (ctx) => {
    await ctx.runQuery(components.componentName.someQuery, {
      arg: "value",
    });
  });
});
```

## Log Streams[​](#log-streams "Direct link to Log Streams")

You can use the `data.function.component_path` field in [log streams](/production/integrations/log-streams/.md) to separate log lines based on the component they came from.

# Authoring Components

Building a Convex Component lets you package up Convex functions, schemas, and persistent state into a reusable module that you or other developers can drop into their projects.

They differ from regular libraries in that they have their own database tables, sub-transactions, and can define functions that run in an isolated environment.

Trying to decide between writing a library or a component? Building it as a component allows you to:

* Persist data to tables where you control the schema.
* Isolate access to data behind an API boundary.
* Define queries, mutations, and actions that can run asynchronously to manage complex workflows.
* Share functionality between apps in a predictable way.

## Anatomy of a component[​](#anatomy-of-a-component "Direct link to Anatomy of a component")

Practically speaking, a component is defined in a folder containing a `convex.config.ts`. The component's folder has the same structure as a normal `convex/` folder:

```
 component/
 ├── _generated/        # Generated code for the component's API and data model.
 ├── convex.config.ts   # Defines the component and its child components.
 ├── schema.ts          # Defines a schema only accessible by the component
 └-- …folders/files.ts  # Queries, mutations, and actions for the component.
```

The component's `convex.config.ts` file configures the component's default name and child components.

component/convex.config.ts

TS

```
import { defineComponent } from "convex/server";
// import workpool from "@convex-dev/workpool/convex.config.js";
// import localComponent from "../localComponent/convex.config.js";
const component = defineComponent("myComponent");
// component.use(workpool);
// component.use(localComponent, { name: "customName" });
export default component;
```

Instances of the component are configured when used by the main app or other components in their `convex.config.ts` files, forming a tree of components, with the main app at the root.

## Getting started[​](#getting-started "Direct link to Getting started")

The source code for components can be a local folder or bundled into an NPM package.

### Local components[​](#local-components "Direct link to Local components")

The easiest way to get started is by creating a new folder for your component and adding a `convex.config.ts` file to it (like the one above). Then import it in your app's `convex/convex.config.ts` file:

convex/convex.config.ts

TS

```
import { defineApp } from "convex/server";
import myComponent from "./components/myComponent/convex.config.js";

const app = defineApp();
app.use(myComponent);
export default app;
```

Once installed, `npx convex dev` will generate code in `./components/myComponent/_generated/` and re-generate it whenever you make changes to the component's code.

Tip: The recommended pattern for local components is to organize them in a `convex/components` folder, but they can be stored anywhere in your project.

### Packaged components[​](#packaged-components "Direct link to Packaged components")

Components can be distributed and installed as NPM packages, enabling you to share solutions to common problems with the broader developer community via the [Convex Components directory](https://convex.dev/components).

Get started with a new project using the [component template](https://github.com/get-convex/templates/tree/main/template-component):

```
npx create-convex@latest --component
```

Follow the CLI's instructions to get started and keep the component's generated code up-to-date. [See below for more information on building and publishing NPM package components.](#building-and-publishing-npm-package-components)

### Hybrid components[​](#hybrid-components "Direct link to Hybrid components")

Hybrid components define a local component, but use shared library code for some of the functionality. This allows you to provide a extra flexibility when users need to override or extend the schema or functions.

An example of a hybrid component is the [Better Auth Component](https://convex-better-auth.netlify.app/features/local-install).

Note: in general, components should be composed or designed to be extended explicitly, as hybrid components introduce a lot of complexity for maintaining and updating the component in backwards-compatible ways.

## Hello world[​](#hello-world "Direct link to Hello world")

To try adding a new function, create a file `hello.ts` in your component's folder (e.g. `src/component/hello.ts` in the template):

./path/to/component/hello.ts

TS

```
import { v } from "convex/values";
import { query } from "./_generated/server.js";

export const world = query({
  args: {},
  returns: v.string(),
  handler: async () => {
    return "hello world";
  },
});
```

After it deploys, you can run `npx convex run --component myComponent hello:world`.

You can now also run it from a function in your app:

convex/sayHi.ts

TS

```
import { components } from "./_generated/api";
import { query } from "./_generated/server";

export default query({
  handler: async (ctx) => {
    return await ctx.runQuery(components.myComponent.hello.world);
  },
});
```

Try it out: `npx convex run sayHi`.

## Key differences from regular Convex development[​](#key-differences-from-regular-convex-development "Direct link to Key differences from regular Convex development")

Developing a component is similar to developing the rest of your Convex backend. This section is a guide to the key concepts and differences.

### The Component API[​](#the-component-api "Direct link to The Component API")

When you access a component reference like `components.foo`, you're working with the `ComponentApi` type which has some key differences from the regular `api` object:

* **Only public functions are accessible**: Internal functions are not exposed to the parent app.
* **Functions become internal references**: The component's "public" queries, mutations, and actions are turned into references with "internal" visibility. They can be called with `ctx.runQuery`, `ctx.runMutation`, etc. but **not** directly accessible from clients via HTTP or WebSockets. See below for patterns to re-export functions from the component.
* **IDs become strings**: Any `Id<"tableName">` arguments or return values become plain strings in the `ComponentApi`. See next section for details.

Similar to regular Convex functions, you can call both public and internal functions via `npx convex run` and the Convex dashboard.

### `Id` types and validation[​](#id-types-and-validation "Direct link to id-types-and-validation")

All `Id<"table_name">` types within a component become simple string types outside of the component (in the `ComponentApi` type).

In addition, you cannot currently have a `v.id("table_name")` validator that represents a table in another component / app.

Why?

In Convex, a `v.id("table_name")` validator will check that an ID in an argument, return value, or database document matches the named table's format. Under the hood, this is currently encoded as a number assigned to each table in your schema.

Within a component’s implementation, the same applies to the component's tables. However, a `v.id("users")` within the component is not the same as `v.id("users")` in another component or in the main app, as each "users" table can have a different table number representation.

For this reason, all `Id` types in the `ComponentApi` become simple strings.

### Generated code[​](#generated-code "Direct link to Generated code")

Each component has its own `_generated` directory in addition to the `convex/_generated` directory. They are similar, but its contents are specific to the component and its schema. In general, code outside of the component should not import from this directory with the exception of `_generated/component`.

* `component.ts` is only generated for components, and contains the component's `ComponentApi` type.
* `server.ts` contains function builders like `query` and `mutation` to define your component's API. It's important that you import these when defining your component's functions, and not from `convex/_generated/server`. See below for more information on function visibility.
* `api.ts` contains the component's `api` and `internal` objects to reference the component's functions. It also includes the `components` object with references to its child components, if any. In general, no code outside of the component should import from this file. Instead, they should use their own `components` object which includes this component keyed by whatever name they chose to install it with.
* `dataModel.ts` contains the types for the component's data model. Note that the `Id` and `Doc` types here are not useful outside of the component, since the API turns all ID types into strings at the boundary.

### Environment variables[​](#environment-variables "Direct link to Environment variables")

The component's functions are isolated from the app's environment variables, so they cannot access `process.env`. Instead, you can pass environment variables as arguments to the component's functions.

```
return await ctx.runAction(components.sampleComponent.lib.translate, {
  baseUrl: process.env.BASE_URL,
  ...otherArgs,
});
```

See below for other strategies for static configuration.

### HTTP Actions[​](#http-actions "Direct link to HTTP Actions")

A component cannot expose HTTP actions itself because the routes could conflict with the main app's routes. Similar to other functions (queries, mutations, and actions), a component can define HTTP action handlers which the app can choose to mount. There’s an example in the [Twilio component](https://github.com/get-convex/twilio/blob/0bdf7fd4ee7dd46d442be3693280564eea597b68/src/client/index.ts#L71). All HTTP actions need to be mounted in the main app’s `convex/http.ts` file.

### Authentication via ctx.auth[​](#authentication-via-ctxauth "Direct link to Authentication via ctx.auth")

Within a component, `ctx.auth` is not available. You typically will do authentication in the app, then pass around identifiers like `userId` or other identifying information to the component.

This explicit passing makes it clear what data flows between the app and component, making your component easier to understand and test.

convex/myFunctions.ts

TS

```
import { getAuthUserId } from "@convex-dev/auth/server";

export const someMutation = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    await ctx.runMutation(components.myComponent.foo.bar, {
      userId,
      ...otherArgs,
    });
  },
});
```

### Function Handles[​](#function-handles "Direct link to Function Handles")

Sometimes you want the app to call a component and the component should call back into the app.

For example, when using the Migrations component, the app defines a function that modifies a document, and the component runs this function on every document. As another example, an app using the Twilio component gives it a function to run whenever the phone number receives a text message.

These features are implemented using function handles.

A function reference is something like api.foo.bar or `internal.foo.bar` or `components.counter.foo.bar`. Function references are restricted as described above (a component can only use references to its own functions or the public functions of its children). If you have a valid function reference, you can turn it into something that can be called from anywhere:

```
const handle = await createFunctionHandle(api.foo.bar);
```

This handle is a string.

Since it’s a string, you can pass it between functions and even store it in a table. You would use `v.string()` in args/schema validators.

When you want to use it, cast it back to FunctionHandle and use it as you would use a function reference. Note argument and return value validation still run at runtime, so don't worry about losing guarantees.

```
const handle = handleString as FunctionHandle<"mutation">;

const result = await ctx.runMutation(handle, args);
// or run it asynchronously via the scheduler:
await ctx.scheduler.runAfter(0, handle, args);
```

[Here](https://github.com/get-convex/workpool/blob/aebe2db49fc3ec50ded6892ed27f464450b3d31e/src/component/worker.ts#L26-L28) is an example of using function handles in the [Workpool](https://www.convex.dev/components/workpool) component.

### Pagination[​](#pagination "Direct link to Pagination")

The built-in `.paginate()` doesn't work in components, because of how Convex keeps track of reactive pagination. Therefore we recommend you use `paginator` from [`convex-helpers`](https://npmjs.com/package/convex-helpers) if you need pagination within your component.

If you expose a pagination API that wants to be used with `usePaginatedQuery`, in a React context, use the `usePaginatedQuery` from `convex-helpers` instead of the default one from `convex/react`. It will have a fixed first page size until you hit “load more,” at which point the first page will grow if anything before the second page is added.

[Here](https://github.com/get-convex/rag/blob/23fb22d593682e23d9134304e823f7532cbc7e67/src/component/chunks.ts#L437-L462) is an example of pagination in the [RAG](https://www.convex.dev/components/rag) component.

## Tips and best practices[​](#tips-and-best-practices "Direct link to Tips and best practices")

### Validation[​](#validation "Direct link to Validation")

All public component functions should have argument and return validators. Otherwise, the argument and return values will be typed as `any`. Below is an example of using validators.

```
import schema from "./schema";

const messageDoc = schema.tables.messages.validator.extend({
  _id: v.id("messages),
  _creationTime: v.number(),
});

export const getLatestMessage = query({
  args: {},
  returns: v.nullable(messageDoc),
  handler: async (ctx) => {
    return await ctx.db.query("messages").order("desc).first();
  },
});
```

Find out more information about function validation [here](/functions/validation.md).

### Static configuration[​](#static-configuration "Direct link to Static configuration")

A common pattern to track configuration in a component is to have a "globals" table with a single document that contains the configuration. You can then define functions to update this document from the CLI or from the app. To read the values, you can query them with `ctx.db.query("globals").first();`.

## Wrapping the component with client code[​](#wrapping-the-component-with-client-code "Direct link to Wrapping the component with client code")

When building a component, sometimes you want to provide a simpler API than directly calling `ctx.runMutation(components.foo.bar, ...)`, add more type safety, or provide functionality that spans the component's boundary.

You can hide calls to the component's functions behind a more ergonomic client API that runs within the app's environment and calls into the component.

This section covers conventions and approaches to writing client code. These aren't hard and fast rules; choose the pattern that best fits your component's needs.

Note: An important aspect of this pattern is that the code running in the app has access to `ctx.auth`, `process.env`, and other app-level resources. For many use-cases, this is important, such as running code to define migrations in the app, which are then run from the Migrations Component. On the other hand, apps that want really tight control over what code runs in their app may prefer to call the component's functions directly.

### Simple Function Wrappers[​](#simple-function-wrappers "Direct link to Simple Function Wrappers")

The simplest approach is to define standalone functions that wrap calls to the component. This works well for straightforward operations and utilities.

```
import type {
  GenericActionCtx,
  GenericDataModel,
  GenericMutationCtx,
} from "convex/server";
import type { ComponentApi } from "../component/_generated/component.js";

export async function callMyFunction(
  ctx: MutationCtx | ActionCtx,
  component: ComponentApi,
  args: ...
) {
  // You can create function handles, add shared utilities,
  // or do any processing that needs to run in the app's environment.
  const functionHandle = await createFunctionHandle(args.someFn);
  const someArg = process.env.SOME_ARG;
  await ctx.runMutation(component.call.fn, {
    ...args,
    someArg,
    functionHandle,
  });
}

// Useful types for functions that only need certain capabilities.
type MutationCtx = Pick<GenericMutationCtx<GenericDataModel>, "runMutation">;
type ActionCtx = Pick<
  GenericActionCtx<GenericDataModel>,
  "runQuery" | "runMutation" | "runAction"
>;
```

Note: we only use `ctx.runMutation`, so we can use `Pick` to select a type that only includes that function. This allows users to call it even if their `ctx` is not exactly the standard MutationCtx. It also means it can be called from an Action, as ActionCtx also includes `ctx.runMutation`. If your function also needs auth or storage, you can adjust what you `Pick`.

### Re-exporting component functions[​](#re-exporting-component-functions "Direct link to Re-exporting component functions")

Sometimes you want to provide ready-made functions that apps can directly re-export to their public API. This is useful when you want to give apps the ability to expose your component's functionality to React clients or the public internet.

The most straightforward way to do this is have the user define their own functions that call into the component.

This allows the app to choose to add auth, rate limiting, etc.

convex/counter.ts

TS

```
export const add = mutation({
  args: { value: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    // The app can authenticate the user here if needed
    await ctx.runMutation(components.counter.add, args);
  },
});
```

This is the recommended pattern, as it makes it clear to the user how the request is being authenticated. However, if you need to re-export a lot of functions, you can use the next pattern.

#### Re-mounting an API[​](#re-mounting-an-api "Direct link to Re-mounting an API")

Code in your `src/client/index.ts` can export these functions:

```
import type { Auth } from "convex/server";

// In your component's src/client/index.ts
export function makeCounterAPI(
  component: ComponentApi,
  options: {
    // Important: provide a way for the user to authenticate these requests
    auth: (ctx: { auth: Auth }, operation: "read" | "write") => Promise<string>;
  },
) {
  return {
    add: mutation({
      args: { value: v.number() },
      handler: async (ctx, args) => {
        await options.auth(ctx, "write");
        return await ctx.runMutation(component.public.add, args);
      },
    }),

    get: query({
      args: {},
      handler: async (ctx) => {
        await options.auth(ctx, "read");
        return await ctx.runQuery(component.public.get, {});
      },
    }),
  };
}
```

Then apps can mount these in their own API:

```
// In the app's convex/counter.ts
import { makeCounterAPI } from "@convex-dev/counter";
import { components } from "./_generated/server.js";

export const { add, get } = makeCounterAPI(components.counter, {
  auth: async (ctx, operation) => {
    const userId = await getAuthUserId(ctx);
    // Check if the user has permission to perform the operation
    if (operation === "write" && !userId) {
      throw new Error("User not authenticated");
    }
    return userId;
  },
});
```

This pattern is also useful for components that need to provide functions with specific signatures for integration purposes.

Here's a real-world [example](https://github.com/get-convex/prosemirror-sync/blob/91e19d5e5a2a272d44f3a31c9171e111dc98676c/src/client/index.ts#L171C4-L173C6) from the [ProseMirror component](https://www.convex.dev/components/prosemirror-sync) that exports ready-made functions.

### Class-Based Clients[​](#class-based-clients "Direct link to Class-Based Clients")

For more complex components, a class-based client provides a stateful interface that can hold configuration and provide multiple methods.

**Basic class pattern:**

```
import Foo from "@convex-dev/foo";
import { components } from "./_generated/server.js";

const foo = new Foo(components.foo, {
  maxShards: 10,
});
```

**With configuration options:**

Classes typically accept the component reference as their first argument, with optional configuration as the second:

```
export class Foo {
  private apiKey: string;

  constructor(
    public component: ComponentApi,
    options?: {
      maxShards?: number;
      // Named after the environment variable it overrides, for clarity.
      FOO_AUTH_KEY?: string;
    },
  ) {
    this.apiKey = options?.FOO_AUTH_KEY ?? process.env.FOO_AUTH_KEY!;
  }

  async count(ctx: GenericQueryCtx<GenericDataModel>) {
    return await ctx.runQuery(this.component.public.count, {
      API_KEY: this.apiKey,
    });
  }
}
```

**Dynamic instantiation:** Note that clients don't need to be instantiated statically. If you need runtime values, you can create instances dynamically:

```
export const myQuery = query({
  handler: async (ctx, args) => {
    const foo = new Foo(components.foo, {
      apiKey: args.customApiKey,
    });
    await foo.count(ctx);
  },
});
```

## Building and publishing NPM package components[​](#building-and-publishing-npm-package-components "Direct link to Building and publishing NPM package components")

### Build process[​](#build-process "Direct link to Build process")

While developing a component that will be bundled, the example app that installs and exercises it will import the bundled version of the component. This helps ensure that the code you are testing matches the code that will be published.

However, that means `npx convex dev` cannot detect where the original source code is located for the component, and will not automatically generate the code for the component. When developing a component that will be bundled, you need to run a separate build process to generate the component's `_generated` directory.

The component authoring template will automatically generate the code for the component when running `npm run dev`. You can see the setup in the [template's `package.json` scripts](https://github.com/get-convex/templates/blob/main/template-component/package.json).

If you're setting up your own build process, you'll need to run the following commands with their own file watchers:

1. **Component codegen**: Generate code for the component itself

   ```
   npx convex codegen --component-dir ./path/to/component
   ```

2. **Build the package**: Build the NPM package

   ```
   npm run build # Your build command (e.g., tsc, esbuild, etc.)
   ```

3. **Example app codegen & deploy**: Generate code for the example app and deploy it app

   ```
   npx convex dev --typecheck-components # optionally type-check the components
   ```

**Note on ordering:** The ideal ordering is: component codegen → build the package → example app `convex dev` runs. This is a recommended convention followed by the template to avoid builds racing with each other, but the key requirement is that the component must be built and available before the example app tries to import it.

### Entry points[​](#entry-points "Direct link to Entry points")

When publishing a component on NPM, you will need to expose all the relevant entry points to be used in your project:

* `@your/package` exports types, classes, and constants used to interact with the component from within their app's code. This is optional, but common.
* `@your/package/convex.config.js` exposes the component's config.
* `@your/package/_generated/component.js` exports the `ComponentApi` type, which describes the component's types from the point of view of app it's used in.
* `@your/package/test` for utilities to use the component with `convex-test`.

[The template’s package.json](https://github.com/get-convex/templates/blob/main/template-component/package.json) does this for you, but if you're setting up your own build process, you'll need to set this up in your package.json.

### Local package resolution for development[​](#local-package-resolution-for-development "Direct link to Local package resolution for development")

When developing a component, you generally want to be importing the component's code in the same way that apps will import it, e.g. `import {} from "@your/package"`. To achieve this without having to install the package from NPM in the example app, follow the template's project structure:

1. In the root of the project, have the `package.json` with the package name matching the `@your/package` name. This causes imports for that name to resolve to the `package.json`’s `exports`.
2. In the `exports` section of the `package.json`, map the aforementioned entry points to the bundled files, generally in the `dist` directory. This means imports from the package name will resolve to the bundled files.
3. Have a single package.json file and node\_modules directory in the root of the project, so the example app will resolve to the package name by default. This will also avoid having multiple versions of `convex` referenced by the library vs. the example app. To add dependencies used only by the example app, add them as `devDependencies` in the `package.json`.

### Publishing to NPM[​](#publishing-to-npm "Direct link to Publishing to NPM")

To publish a component on NPM, check out [PUBLISHING.md](https://github.com/get-convex/templates/blob/main/template-component/PUBLISHING.md).

## Testing[​](#testing "Direct link to Testing")

### Testing implementations[​](#testing-implementations "Direct link to Testing implementations")

To test components, you can use the [`convex-test` library](/testing/convex-test.md). The main difference is that you must provide the schema and modules to the test instance.

component/some.test.ts

TS

```
import { test } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.ts";
const modules = import.meta.glob("./**/*.ts");

export function initConvexTest() {
  const t = convexTest(schema, modules);
  return t;
}

test("Test something with a local component", async () => {
  const t = initConvexTest();
  // Test like you would normally.
  await t.run(async (ctx) => {
    await ctx.db.insert("myComponentTable", { name: "test" });
  });
});
```

If your component has child components, see the [Testing components](/components/using.md#testing-components) section in the Using Components documentation.

### Testing the API and client code[​](#testing-the-api-and-client-code "Direct link to Testing the API and client code")

To test the functions that are exported from the component to run in the app's environment, you can follow the same approach as in [Using Components](/components/using.md#testing-components) and test it from an app that uses the component.

The template component includes an example app in part for this purpose: to exercise the component's bundled code as it will be used by apps installing it.

### Exporting test helpers[​](#exporting-test-helpers "Direct link to Exporting test helpers")

Most components export testing helpers to make it easy to register the component with the test instance. Here is an example from the [template component’s `/test` entrypoint](https://github.com/get-convex/templates/blob/main/template-component/src/test.ts):

```
/// <reference types="vite/client" />
import type { TestConvex } from "convex-test";
import type { GenericSchema, SchemaDefinition } from "convex/server";
import schema from "./component/schema.js";
const modules = import.meta.glob("./component/**/*.ts");

/**
 * Register the component with the test convex instance.
 * @param t - The test convex instance, e.g. from calling `convexTest`.
 * @param name - The name of the component, as registered in convex.config.ts.
 */
export function register(
  t: TestConvex<SchemaDefinition<GenericSchema, boolean>>,
  name: string = "sampleComponent",
) {
  t.registerComponent(name, schema, modules);
}
export default { register, schema, modules };
```

For NPM packages, this is exposed as `@your/package/test` in the package's `package.json`:

```
{
  ...
  "exports": {
    ...
    "./test": "./src/test.ts",
    ...
  }
}
```
