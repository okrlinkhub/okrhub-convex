/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    config: {
      clearConfig: FunctionReference<"mutation", "internal", {}, null, Name>;
      configure: FunctionReference<
        "mutation",
        "internal",
        {
          apiKeyPrefix: string;
          autoSyncEnabled?: boolean;
          endpointUrl: string;
          signingSecret: string;
          sourceApp?: string;
          syncIntervalMs?: number;
        },
        null,
        Name
      >;
    };
    entities: {
      batch: {
        insertBatch: FunctionReference<
          "mutation",
          "internal",
          {
            batch: {
              companies?: Array<{
                createdAt?: number;
                externalId: string;
                name: string;
              }>;
              indicatorForecasts?: Array<{
                createdAt?: number;
                date: number;
                externalId: string;
                indicatorExternalId: string;
                value: number;
              }>;
              indicatorValues?: Array<{
                createdAt?: number;
                date: number;
                externalId: string;
                indicatorExternalId: string;
                value: number;
              }>;
              indicators?: Array<{
                automationDescription?: string;
                automationUrl?: string;
                companyExternalId: string;
                createdAt?: number;
                description: string;
                externalId: string;
                forecastDate?: number;
                isReverse?: boolean;
                periodicity:
                  | "weekly"
                  | "monthly"
                  | "quarterly"
                  | "semesterly"
                  | "yearly";
                symbol: string;
              }>;
              initiatives?: Array<{
                assigneeExternalId: string;
                createdAt?: number;
                createdByExternalId: string;
                description: string;
                externalId: string;
                externalUrl?: string;
                finishedAt?: number;
                isNew?: boolean;
                priority: "lowest" | "low" | "medium" | "high" | "highest";
                riskExternalId: string;
                status: "ON_TIME" | "OVERDUE" | "FINISHED";
                teamExternalId: string;
                updatedAt?: number;
              }>;
              keyResults?: Array<{
                createdAt?: number;
                externalId: string;
                forecastValue?: number;
                impact?: number;
                indicatorExternalId: string;
                objectiveExternalId: string;
                targetValue?: number;
                teamExternalId: string;
                updatedAt?: number;
                weight: number;
              }>;
              milestones?: Array<{
                achievedAt?: number;
                createdAt?: number;
                description: string;
                externalId: string;
                forecastDate?: number;
                indicatorExternalId: string;
                status:
                  | "ON_TIME"
                  | "OVERDUE"
                  | "ACHIEVED_ON_TIME"
                  | "ACHIEVED_LATE";
                updatedAt?: number;
                value: number;
              }>;
              objectives?: Array<{
                createdAt?: number;
                description: string;
                externalId: string;
                teamExternalId: string;
                title: string;
                updatedAt?: number;
              }>;
              risks?: Array<{
                createdAt?: number;
                description: string;
                externalId: string;
                indicatorExternalId?: string;
                isRed?: boolean;
                keyResultExternalId: string;
                priority: "lowest" | "low" | "medium" | "high" | "highest";
                teamExternalId: string;
                triggerValue?: number;
                triggeredIfLower?: boolean;
                useForecastAsTrigger?: boolean;
              }>;
              teams?: Array<{
                companyExternalId: string;
                createdAt?: number;
                externalId: string;
                name: string;
              }>;
              users?: Array<{
                createdAt?: number;
                email: string;
                externalId: string;
                name?: string;
                surname?: string;
              }>;
            };
          },
          { errors: Array<string>; queueIds: Array<string>; success: boolean },
          Name
        >;
      };
      index: {
        createIndicator: FunctionReference<
          "mutation",
          "internal",
          {
            companyExternalId: string;
            description: string;
            isReverse?: boolean;
            periodicity:
              | "weekly"
              | "monthly"
              | "quarterly"
              | "semesterly"
              | "yearly";
            sourceApp: string;
            sourceUrl?: string;
            symbol: string;
          },
          {
            error?: string;
            externalId: string;
            localId: string;
            queueId?: string;
            success: boolean;
          },
          Name
        >;
        createIndicatorForecast: FunctionReference<
          "mutation",
          "internal",
          {
            date: number;
            indicatorExternalId: string;
            sourceApp: string;
            sourceUrl?: string;
            value: number;
          },
          {
            error?: string;
            externalId: string;
            localId: string;
            queueId?: string;
            success: boolean;
          },
          Name
        >;
        createIndicatorValue: FunctionReference<
          "mutation",
          "internal",
          {
            date: number;
            indicatorExternalId: string;
            sourceApp: string;
            sourceUrl?: string;
            value: number;
          },
          {
            error?: string;
            externalId: string;
            localId: string;
            queueId?: string;
            success: boolean;
          },
          Name
        >;
        createInitiative: FunctionReference<
          "mutation",
          "internal",
          {
            assigneeExternalId: string;
            createdByExternalId: string;
            description: string;
            finishedAt?: number;
            priority: "lowest" | "low" | "medium" | "high" | "highest";
            riskExternalId: string;
            sourceApp: string;
            sourceUrl?: string;
            status?: "ON_TIME" | "OVERDUE" | "FINISHED";
            teamExternalId: string;
          },
          {
            error?: string;
            externalId: string;
            localId: string;
            queueId?: string;
            success: boolean;
          },
          Name
        >;
        createKeyResult: FunctionReference<
          "mutation",
          "internal",
          {
            forecastValue?: number;
            indicatorExternalId: string;
            objectiveExternalId: string;
            sourceApp: string;
            sourceUrl?: string;
            targetValue?: number;
            teamExternalId: string;
          },
          {
            error?: string;
            externalId: string;
            localId: string;
            queueId?: string;
            success: boolean;
          },
          Name
        >;
        createMilestone: FunctionReference<
          "mutation",
          "internal",
          {
            achievedAt?: number;
            description: string;
            forecastDate?: number;
            indicatorExternalId: string;
            sourceApp: string;
            sourceUrl?: string;
            status?:
              | "ON_TIME"
              | "OVERDUE"
              | "ACHIEVED_ON_TIME"
              | "ACHIEVED_LATE";
            value: number;
          },
          {
            error?: string;
            externalId: string;
            localId: string;
            queueId?: string;
            success: boolean;
          },
          Name
        >;
        createObjective: FunctionReference<
          "mutation",
          "internal",
          {
            description: string;
            sourceApp: string;
            sourceUrl?: string;
            teamExternalId: string;
            title: string;
          },
          {
            error?: string;
            externalId: string;
            localId: string;
            queueId?: string;
            success: boolean;
          },
          Name
        >;
        createRisk: FunctionReference<
          "mutation",
          "internal",
          {
            description: string;
            indicatorExternalId?: string;
            isRed?: boolean;
            keyResultExternalId: string;
            priority: "lowest" | "low" | "medium" | "high" | "highest";
            sourceApp: string;
            sourceUrl?: string;
            teamExternalId: string;
            triggerValue?: number;
            triggeredIfLower?: boolean;
            useForecastAsTrigger?: boolean;
          },
          {
            error?: string;
            externalId: string;
            localId: string;
            queueId?: string;
            success: boolean;
          },
          Name
        >;
        getAllIndicatorForecasts: FunctionReference<
          "query",
          "internal",
          {},
          Array<{
            _creationTime: number;
            _id: string;
            createdAt: number;
            date: number;
            externalId: string;
            indicatorExternalId: string;
            syncStatus: "pending" | "synced" | "failed";
            value: number;
          }>,
          Name
        >;
        getAllIndicators: FunctionReference<
          "query",
          "internal",
          {},
          Array<{
            _creationTime: number;
            _id: string;
            companyExternalId: string;
            createdAt: number;
            deletedAt?: number;
            description: string;
            externalId: string;
            isReverse?: boolean;
            periodicity:
              | "weekly"
              | "monthly"
              | "quarterly"
              | "semesterly"
              | "yearly";
            slug: string;
            symbol: string;
            syncStatus: "pending" | "synced" | "failed";
          }>,
          Name
        >;
        getAllIndicatorValues: FunctionReference<
          "query",
          "internal",
          {},
          Array<{
            _creationTime: number;
            _id: string;
            createdAt: number;
            date: number;
            externalId: string;
            indicatorExternalId: string;
            syncStatus: "pending" | "synced" | "failed";
            value: number;
          }>,
          Name
        >;
        getAllInitiatives: FunctionReference<
          "query",
          "internal",
          {},
          Array<{
            _creationTime: number;
            _id: string;
            assigneeExternalId: string;
            createdAt: number;
            createdByExternalId: string;
            deletedAt?: number;
            description: string;
            externalId: string;
            finishedAt?: number;
            priority: "lowest" | "low" | "medium" | "high" | "highest";
            riskExternalId: string;
            slug: string;
            status: "ON_TIME" | "OVERDUE" | "FINISHED";
            syncStatus: "pending" | "synced" | "failed";
            teamExternalId: string;
            updatedAt?: number;
          }>,
          Name
        >;
        getAllKeyResults: FunctionReference<
          "query",
          "internal",
          {},
          Array<{
            _creationTime: number;
            _id: string;
            createdAt: number;
            deletedAt?: number;
            externalId: string;
            forecastValue?: number;
            indicatorExternalId: string;
            objectiveExternalId: string;
            slug: string;
            syncStatus: "pending" | "synced" | "failed";
            targetValue?: number;
            teamExternalId: string;
            updatedAt?: number;
          }>,
          Name
        >;
        getAllMilestones: FunctionReference<
          "query",
          "internal",
          {},
          Array<{
            _creationTime: number;
            _id: string;
            achievedAt?: number;
            createdAt: number;
            deletedAt?: number;
            description: string;
            externalId: string;
            forecastDate?: number;
            indicatorExternalId: string;
            slug: string;
            status:
              | "ON_TIME"
              | "OVERDUE"
              | "ACHIEVED_ON_TIME"
              | "ACHIEVED_LATE";
            syncStatus: "pending" | "synced" | "failed";
            updatedAt?: number;
            value: number;
          }>,
          Name
        >;
        getAllObjectives: FunctionReference<
          "query",
          "internal",
          {},
          Array<{
            _creationTime: number;
            _id: string;
            createdAt: number;
            deletedAt?: number;
            description: string;
            externalId: string;
            slug: string;
            syncStatus: "pending" | "synced" | "failed";
            teamExternalId: string;
            title: string;
            updatedAt?: number;
          }>,
          Name
        >;
        getAllRisks: FunctionReference<
          "query",
          "internal",
          {},
          Array<{
            _creationTime: number;
            _id: string;
            createdAt: number;
            deletedAt?: number;
            description: string;
            externalId: string;
            indicatorExternalId?: string;
            isRed?: boolean;
            keyResultExternalId: string;
            priority: "lowest" | "low" | "medium" | "high" | "highest";
            slug: string;
            syncStatus: "pending" | "synced" | "failed";
            teamExternalId: string;
            triggerValue?: number;
            triggeredIfLower?: boolean;
            useForecastAsTrigger?: boolean;
          }>,
          Name
        >;
        getKeyResultsByObjective: FunctionReference<
          "query",
          "internal",
          { objectiveExternalId: string },
          Array<{
            _creationTime: number;
            _id: string;
            createdAt: number;
            deletedAt?: number;
            externalId: string;
            forecastValue?: number;
            indicatorExternalId: string;
            objectiveExternalId: string;
            slug: string;
            syncStatus: "pending" | "synced" | "failed";
            targetValue?: number;
            teamExternalId: string;
            updatedAt?: number;
          }>,
          Name
        >;
        getObjectivesByTeam: FunctionReference<
          "query",
          "internal",
          { teamExternalId: string },
          Array<{
            _creationTime: number;
            _id: string;
            createdAt: number;
            deletedAt?: number;
            description: string;
            externalId: string;
            slug: string;
            syncStatus: "pending" | "synced" | "failed";
            teamExternalId: string;
            title: string;
            updatedAt?: number;
          }>,
          Name
        >;
        getRisksByKeyResult: FunctionReference<
          "query",
          "internal",
          { keyResultExternalId: string },
          Array<{
            _creationTime: number;
            _id: string;
            createdAt: number;
            deletedAt?: number;
            description: string;
            externalId: string;
            indicatorExternalId?: string;
            isRed?: boolean;
            keyResultExternalId: string;
            priority: "lowest" | "low" | "medium" | "high" | "highest";
            slug: string;
            syncStatus: "pending" | "synced" | "failed";
            teamExternalId: string;
            triggerValue?: number;
            triggeredIfLower?: boolean;
            useForecastAsTrigger?: boolean;
          }>,
          Name
        >;
      };
      indicatorForecasts: {
        createIndicatorForecast: FunctionReference<
          "mutation",
          "internal",
          {
            date: number;
            indicatorExternalId: string;
            sourceApp: string;
            sourceUrl?: string;
            value: number;
          },
          {
            error?: string;
            externalId: string;
            localId: string;
            queueId?: string;
            success: boolean;
          },
          Name
        >;
        getAllIndicatorForecasts: FunctionReference<
          "query",
          "internal",
          {},
          Array<{
            _creationTime: number;
            _id: string;
            createdAt: number;
            date: number;
            externalId: string;
            indicatorExternalId: string;
            syncStatus: "pending" | "synced" | "failed";
            value: number;
          }>,
          Name
        >;
        updateIndicatorForecast: FunctionReference<
          "mutation",
          "internal",
          { date?: number; externalId: string; value?: number },
          {
            error?: string;
            externalId: string;
            queueId?: string;
            success: boolean;
          },
          Name
        >;
      };
      indicators: {
        createIndicator: FunctionReference<
          "mutation",
          "internal",
          {
            companyExternalId: string;
            description: string;
            isReverse?: boolean;
            periodicity:
              | "weekly"
              | "monthly"
              | "quarterly"
              | "semesterly"
              | "yearly";
            sourceApp: string;
            sourceUrl?: string;
            symbol: string;
          },
          {
            error?: string;
            externalId: string;
            localId: string;
            queueId?: string;
            success: boolean;
          },
          Name
        >;
        getAllIndicators: FunctionReference<
          "query",
          "internal",
          {},
          Array<{
            _creationTime: number;
            _id: string;
            companyExternalId: string;
            createdAt: number;
            deletedAt?: number;
            description: string;
            externalId: string;
            isReverse?: boolean;
            periodicity:
              | "weekly"
              | "monthly"
              | "quarterly"
              | "semesterly"
              | "yearly";
            slug: string;
            symbol: string;
            syncStatus: "pending" | "synced" | "failed";
          }>,
          Name
        >;
        updateIndicator: FunctionReference<
          "mutation",
          "internal",
          {
            description?: string;
            externalId: string;
            isReverse?: boolean;
            periodicity?:
              | "weekly"
              | "monthly"
              | "quarterly"
              | "semesterly"
              | "yearly";
            symbol?: string;
          },
          {
            error?: string;
            externalId: string;
            queueId?: string;
            success: boolean;
          },
          Name
        >;
      };
      indicatorValues: {
        createIndicatorValue: FunctionReference<
          "mutation",
          "internal",
          {
            date: number;
            indicatorExternalId: string;
            sourceApp: string;
            sourceUrl?: string;
            value: number;
          },
          {
            error?: string;
            externalId: string;
            localId: string;
            queueId?: string;
            success: boolean;
          },
          Name
        >;
        getAllIndicatorValues: FunctionReference<
          "query",
          "internal",
          {},
          Array<{
            _creationTime: number;
            _id: string;
            createdAt: number;
            date: number;
            externalId: string;
            indicatorExternalId: string;
            syncStatus: "pending" | "synced" | "failed";
            value: number;
          }>,
          Name
        >;
        updateIndicatorValue: FunctionReference<
          "mutation",
          "internal",
          { date?: number; externalId: string; value?: number },
          {
            error?: string;
            externalId: string;
            queueId?: string;
            success: boolean;
          },
          Name
        >;
      };
      initiatives: {
        createInitiative: FunctionReference<
          "mutation",
          "internal",
          {
            assigneeExternalId: string;
            createdByExternalId: string;
            description: string;
            finishedAt?: number;
            priority: "lowest" | "low" | "medium" | "high" | "highest";
            riskExternalId: string;
            sourceApp: string;
            sourceUrl?: string;
            status?: "ON_TIME" | "OVERDUE" | "FINISHED";
            teamExternalId: string;
          },
          {
            error?: string;
            externalId: string;
            localId: string;
            queueId?: string;
            success: boolean;
          },
          Name
        >;
        getAllInitiatives: FunctionReference<
          "query",
          "internal",
          {},
          Array<{
            _creationTime: number;
            _id: string;
            assigneeExternalId: string;
            createdAt: number;
            createdByExternalId: string;
            deletedAt?: number;
            description: string;
            externalId: string;
            finishedAt?: number;
            priority: "lowest" | "low" | "medium" | "high" | "highest";
            riskExternalId: string;
            slug: string;
            status: "ON_TIME" | "OVERDUE" | "FINISHED";
            syncStatus: "pending" | "synced" | "failed";
            teamExternalId: string;
            updatedAt?: number;
          }>,
          Name
        >;
        updateInitiative: FunctionReference<
          "mutation",
          "internal",
          {
            assigneeExternalId?: string;
            description?: string;
            externalId: string;
            finishedAt?: number;
            priority?: "lowest" | "low" | "medium" | "high" | "highest";
            riskExternalId?: string;
            status?: "ON_TIME" | "OVERDUE" | "FINISHED";
          },
          {
            error?: string;
            externalId: string;
            queueId?: string;
            success: boolean;
          },
          Name
        >;
      };
      keyResults: {
        createKeyResult: FunctionReference<
          "mutation",
          "internal",
          {
            forecastValue?: number;
            indicatorExternalId: string;
            objectiveExternalId: string;
            sourceApp: string;
            sourceUrl?: string;
            targetValue?: number;
            teamExternalId: string;
          },
          {
            error?: string;
            externalId: string;
            localId: string;
            queueId?: string;
            success: boolean;
          },
          Name
        >;
        getAllKeyResults: FunctionReference<
          "query",
          "internal",
          {},
          Array<{
            _creationTime: number;
            _id: string;
            createdAt: number;
            deletedAt?: number;
            externalId: string;
            forecastValue?: number;
            indicatorExternalId: string;
            objectiveExternalId: string;
            slug: string;
            syncStatus: "pending" | "synced" | "failed";
            targetValue?: number;
            teamExternalId: string;
            updatedAt?: number;
          }>,
          Name
        >;
        getKeyResultsByObjective: FunctionReference<
          "query",
          "internal",
          { objectiveExternalId: string },
          Array<{
            _creationTime: number;
            _id: string;
            createdAt: number;
            deletedAt?: number;
            externalId: string;
            forecastValue?: number;
            indicatorExternalId: string;
            objectiveExternalId: string;
            slug: string;
            syncStatus: "pending" | "synced" | "failed";
            targetValue?: number;
            teamExternalId: string;
            updatedAt?: number;
          }>,
          Name
        >;
        updateKeyResult: FunctionReference<
          "mutation",
          "internal",
          {
            externalId: string;
            forecastValue?: number;
            objectiveExternalId?: string;
            targetValue?: number;
          },
          {
            error?: string;
            externalId: string;
            queueId?: string;
            success: boolean;
          },
          Name
        >;
      };
      milestones: {
        createMilestone: FunctionReference<
          "mutation",
          "internal",
          {
            achievedAt?: number;
            description: string;
            forecastDate?: number;
            indicatorExternalId: string;
            sourceApp: string;
            sourceUrl?: string;
            status?:
              | "ON_TIME"
              | "OVERDUE"
              | "ACHIEVED_ON_TIME"
              | "ACHIEVED_LATE";
            value: number;
          },
          {
            error?: string;
            externalId: string;
            localId: string;
            queueId?: string;
            success: boolean;
          },
          Name
        >;
        getAllMilestones: FunctionReference<
          "query",
          "internal",
          {},
          Array<{
            _creationTime: number;
            _id: string;
            achievedAt?: number;
            createdAt: number;
            deletedAt?: number;
            description: string;
            externalId: string;
            forecastDate?: number;
            indicatorExternalId: string;
            slug: string;
            status:
              | "ON_TIME"
              | "OVERDUE"
              | "ACHIEVED_ON_TIME"
              | "ACHIEVED_LATE";
            syncStatus: "pending" | "synced" | "failed";
            updatedAt?: number;
            value: number;
          }>,
          Name
        >;
        updateMilestone: FunctionReference<
          "mutation",
          "internal",
          {
            achievedAt?: number;
            description?: string;
            externalId: string;
            forecastDate?: number;
            status?:
              | "ON_TIME"
              | "OVERDUE"
              | "ACHIEVED_ON_TIME"
              | "ACHIEVED_LATE";
            value?: number;
          },
          {
            error?: string;
            externalId: string;
            queueId?: string;
            success: boolean;
          },
          Name
        >;
      };
      objectives: {
        createObjective: FunctionReference<
          "mutation",
          "internal",
          {
            description: string;
            sourceApp: string;
            sourceUrl?: string;
            teamExternalId: string;
            title: string;
          },
          {
            error?: string;
            externalId: string;
            localId: string;
            queueId?: string;
            success: boolean;
          },
          Name
        >;
        getAllObjectives: FunctionReference<
          "query",
          "internal",
          {},
          Array<{
            _creationTime: number;
            _id: string;
            createdAt: number;
            deletedAt?: number;
            description: string;
            externalId: string;
            slug: string;
            syncStatus: "pending" | "synced" | "failed";
            teamExternalId: string;
            title: string;
            updatedAt?: number;
          }>,
          Name
        >;
        getObjectivesByTeam: FunctionReference<
          "query",
          "internal",
          { teamExternalId: string },
          Array<{
            _creationTime: number;
            _id: string;
            createdAt: number;
            deletedAt?: number;
            description: string;
            externalId: string;
            slug: string;
            syncStatus: "pending" | "synced" | "failed";
            teamExternalId: string;
            title: string;
            updatedAt?: number;
          }>,
          Name
        >;
        updateObjective: FunctionReference<
          "mutation",
          "internal",
          { description?: string; externalId: string; title?: string },
          {
            error?: string;
            externalId: string;
            queueId?: string;
            success: boolean;
          },
          Name
        >;
      };
      risks: {
        createRisk: FunctionReference<
          "mutation",
          "internal",
          {
            description: string;
            indicatorExternalId?: string;
            isRed?: boolean;
            keyResultExternalId: string;
            priority: "lowest" | "low" | "medium" | "high" | "highest";
            sourceApp: string;
            sourceUrl?: string;
            teamExternalId: string;
            triggerValue?: number;
            triggeredIfLower?: boolean;
            useForecastAsTrigger?: boolean;
          },
          {
            error?: string;
            externalId: string;
            localId: string;
            queueId?: string;
            success: boolean;
          },
          Name
        >;
        getAllRisks: FunctionReference<
          "query",
          "internal",
          {},
          Array<{
            _creationTime: number;
            _id: string;
            createdAt: number;
            deletedAt?: number;
            description: string;
            externalId: string;
            indicatorExternalId?: string;
            isRed?: boolean;
            keyResultExternalId: string;
            priority: "lowest" | "low" | "medium" | "high" | "highest";
            slug: string;
            syncStatus: "pending" | "synced" | "failed";
            teamExternalId: string;
            triggerValue?: number;
            triggeredIfLower?: boolean;
            useForecastAsTrigger?: boolean;
          }>,
          Name
        >;
        getRisksByKeyResult: FunctionReference<
          "query",
          "internal",
          { keyResultExternalId: string },
          Array<{
            _creationTime: number;
            _id: string;
            createdAt: number;
            deletedAt?: number;
            description: string;
            externalId: string;
            indicatorExternalId?: string;
            isRed?: boolean;
            keyResultExternalId: string;
            priority: "lowest" | "low" | "medium" | "high" | "highest";
            slug: string;
            syncStatus: "pending" | "synced" | "failed";
            teamExternalId: string;
            triggerValue?: number;
            triggeredIfLower?: boolean;
            useForecastAsTrigger?: boolean;
          }>,
          Name
        >;
        updateRisk: FunctionReference<
          "mutation",
          "internal",
          {
            description?: string;
            externalId: string;
            indicatorExternalId?: string;
            isRed?: boolean;
            keyResultExternalId?: string;
            priority?: "lowest" | "low" | "medium" | "high" | "highest";
            triggerValue?: number;
            triggeredIfLower?: boolean;
            useForecastAsTrigger?: boolean;
          },
          {
            error?: string;
            externalId: string;
            queueId?: string;
            success: boolean;
          },
          Name
        >;
      };
    };
    okrhub: {
      clearConfig: FunctionReference<"mutation", "internal", {}, null, Name>;
      configure: FunctionReference<
        "mutation",
        "internal",
        {
          apiKeyPrefix: string;
          autoSyncEnabled?: boolean;
          endpointUrl: string;
          signingSecret: string;
          sourceApp?: string;
          syncIntervalMs?: number;
        },
        null,
        Name
      >;
      createIndicator: FunctionReference<
        "mutation",
        "internal",
        {
          companyExternalId: string;
          description: string;
          isReverse?: boolean;
          periodicity:
            | "weekly"
            | "monthly"
            | "quarterly"
            | "semesterly"
            | "yearly";
          sourceApp: string;
          sourceUrl?: string;
          symbol: string;
        },
        {
          error?: string;
          externalId: string;
          localId: string;
          queueId?: string;
          success: boolean;
        },
        Name
      >;
      createIndicatorForecast: FunctionReference<
        "mutation",
        "internal",
        {
          date: number;
          indicatorExternalId: string;
          sourceApp: string;
          sourceUrl?: string;
          value: number;
        },
        {
          error?: string;
          externalId: string;
          localId: string;
          queueId?: string;
          success: boolean;
        },
        Name
      >;
      createIndicatorValue: FunctionReference<
        "mutation",
        "internal",
        {
          date: number;
          indicatorExternalId: string;
          sourceApp: string;
          sourceUrl?: string;
          value: number;
        },
        {
          error?: string;
          externalId: string;
          localId: string;
          queueId?: string;
          success: boolean;
        },
        Name
      >;
      createInitiative: FunctionReference<
        "mutation",
        "internal",
        {
          assigneeExternalId: string;
          createdByExternalId: string;
          description: string;
          finishedAt?: number;
          priority: "lowest" | "low" | "medium" | "high" | "highest";
          riskExternalId: string;
          sourceApp: string;
          sourceUrl?: string;
          status?: "ON_TIME" | "OVERDUE" | "FINISHED";
          teamExternalId: string;
        },
        {
          error?: string;
          externalId: string;
          localId: string;
          queueId?: string;
          success: boolean;
        },
        Name
      >;
      createKeyResult: FunctionReference<
        "mutation",
        "internal",
        {
          forecastValue?: number;
          indicatorExternalId: string;
          objectiveExternalId: string;
          sourceApp: string;
          sourceUrl?: string;
          targetValue?: number;
          teamExternalId: string;
        },
        {
          error?: string;
          externalId: string;
          localId: string;
          queueId?: string;
          success: boolean;
        },
        Name
      >;
      createMilestone: FunctionReference<
        "mutation",
        "internal",
        {
          achievedAt?: number;
          description: string;
          forecastDate?: number;
          indicatorExternalId: string;
          sourceApp: string;
          sourceUrl?: string;
          status?: "ON_TIME" | "OVERDUE" | "ACHIEVED_ON_TIME" | "ACHIEVED_LATE";
          value: number;
        },
        {
          error?: string;
          externalId: string;
          localId: string;
          queueId?: string;
          success: boolean;
        },
        Name
      >;
      createObjective: FunctionReference<
        "mutation",
        "internal",
        {
          description: string;
          sourceApp: string;
          sourceUrl?: string;
          teamExternalId: string;
          title: string;
        },
        {
          error?: string;
          externalId: string;
          localId: string;
          queueId?: string;
          success: boolean;
        },
        Name
      >;
      createRisk: FunctionReference<
        "mutation",
        "internal",
        {
          description: string;
          indicatorExternalId?: string;
          isRed?: boolean;
          keyResultExternalId: string;
          priority: "lowest" | "low" | "medium" | "high" | "highest";
          sourceApp: string;
          sourceUrl?: string;
          teamExternalId: string;
          triggerValue?: number;
          triggeredIfLower?: boolean;
          useForecastAsTrigger?: boolean;
        },
        {
          error?: string;
          externalId: string;
          localId: string;
          queueId?: string;
          success: boolean;
        },
        Name
      >;
      getAllIndicatorForecasts: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          date: number;
          externalId: string;
          indicatorExternalId: string;
          syncStatus: "pending" | "synced" | "failed";
          value: number;
        }>,
        Name
      >;
      getAllIndicators: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          _creationTime: number;
          _id: string;
          companyExternalId: string;
          createdAt: number;
          deletedAt?: number;
          description: string;
          externalId: string;
          isReverse?: boolean;
          periodicity:
            | "weekly"
            | "monthly"
            | "quarterly"
            | "semesterly"
            | "yearly";
          slug: string;
          symbol: string;
          syncStatus: "pending" | "synced" | "failed";
        }>,
        Name
      >;
      getAllIndicatorValues: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          date: number;
          externalId: string;
          indicatorExternalId: string;
          syncStatus: "pending" | "synced" | "failed";
          value: number;
        }>,
        Name
      >;
      getAllInitiatives: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          _creationTime: number;
          _id: string;
          assigneeExternalId: string;
          createdAt: number;
          createdByExternalId: string;
          deletedAt?: number;
          description: string;
          externalId: string;
          finishedAt?: number;
          priority: "lowest" | "low" | "medium" | "high" | "highest";
          riskExternalId: string;
          slug: string;
          status: "ON_TIME" | "OVERDUE" | "FINISHED";
          syncStatus: "pending" | "synced" | "failed";
          teamExternalId: string;
          updatedAt?: number;
        }>,
        Name
      >;
      getAllKeyResults: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          deletedAt?: number;
          externalId: string;
          forecastValue?: number;
          indicatorExternalId: string;
          objectiveExternalId: string;
          slug: string;
          syncStatus: "pending" | "synced" | "failed";
          targetValue?: number;
          teamExternalId: string;
          updatedAt?: number;
        }>,
        Name
      >;
      getAllMilestones: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          _creationTime: number;
          _id: string;
          achievedAt?: number;
          createdAt: number;
          deletedAt?: number;
          description: string;
          externalId: string;
          forecastDate?: number;
          indicatorExternalId: string;
          slug: string;
          status: "ON_TIME" | "OVERDUE" | "ACHIEVED_ON_TIME" | "ACHIEVED_LATE";
          syncStatus: "pending" | "synced" | "failed";
          updatedAt?: number;
          value: number;
        }>,
        Name
      >;
      getAllObjectives: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          deletedAt?: number;
          description: string;
          externalId: string;
          slug: string;
          syncStatus: "pending" | "synced" | "failed";
          teamExternalId: string;
          title: string;
          updatedAt?: number;
        }>,
        Name
      >;
      getAllRisks: FunctionReference<
        "query",
        "internal",
        {},
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          deletedAt?: number;
          description: string;
          externalId: string;
          indicatorExternalId?: string;
          isRed?: boolean;
          keyResultExternalId: string;
          priority: "lowest" | "low" | "medium" | "high" | "highest";
          slug: string;
          syncStatus: "pending" | "synced" | "failed";
          teamExternalId: string;
          triggerValue?: number;
          triggeredIfLower?: boolean;
          useForecastAsTrigger?: boolean;
        }>,
        Name
      >;
      getKeyResultsByObjective: FunctionReference<
        "query",
        "internal",
        { objectiveExternalId: string },
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          deletedAt?: number;
          externalId: string;
          forecastValue?: number;
          indicatorExternalId: string;
          objectiveExternalId: string;
          slug: string;
          syncStatus: "pending" | "synced" | "failed";
          targetValue?: number;
          teamExternalId: string;
          updatedAt?: number;
        }>,
        Name
      >;
      getObjectivesByTeam: FunctionReference<
        "query",
        "internal",
        { teamExternalId: string },
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          deletedAt?: number;
          description: string;
          externalId: string;
          slug: string;
          syncStatus: "pending" | "synced" | "failed";
          teamExternalId: string;
          title: string;
          updatedAt?: number;
        }>,
        Name
      >;
      getPendingSyncItems: FunctionReference<
        "query",
        "internal",
        { limit?: number },
        Array<{
          _creationTime: number;
          _id: string;
          attempts: number;
          createdAt: number;
          entityType: string;
          errorMessage?: string;
          externalId: string;
          lastAttemptAt?: number;
          payload: string;
          status: string;
        }>,
        Name
      >;
      getRisksByKeyResult: FunctionReference<
        "query",
        "internal",
        { keyResultExternalId: string },
        Array<{
          _creationTime: number;
          _id: string;
          createdAt: number;
          deletedAt?: number;
          description: string;
          externalId: string;
          indicatorExternalId?: string;
          isRed?: boolean;
          keyResultExternalId: string;
          priority: "lowest" | "low" | "medium" | "high" | "highest";
          slug: string;
          syncStatus: "pending" | "synced" | "failed";
          teamExternalId: string;
          triggerValue?: number;
          triggeredIfLower?: boolean;
          useForecastAsTrigger?: boolean;
        }>,
        Name
      >;
      processSyncQueue: FunctionReference<
        "action",
        "internal",
        {
          apiKeyPrefix?: string;
          batchSize?: number;
          endpointUrl?: string;
          signingSecret?: string;
        },
        { failed: number; processed: number; succeeded: number },
        Name
      >;
      updateIndicator: FunctionReference<
        "mutation",
        "internal",
        {
          description?: string;
          externalId: string;
          isReverse?: boolean;
          periodicity?:
            | "weekly"
            | "monthly"
            | "quarterly"
            | "semesterly"
            | "yearly";
          symbol?: string;
        },
        {
          error?: string;
          externalId: string;
          queueId?: string;
          success: boolean;
        },
        Name
      >;
      updateIndicatorForecast: FunctionReference<
        "mutation",
        "internal",
        { date?: number; externalId: string; value?: number },
        {
          error?: string;
          externalId: string;
          queueId?: string;
          success: boolean;
        },
        Name
      >;
      updateIndicatorValue: FunctionReference<
        "mutation",
        "internal",
        { date?: number; externalId: string; value?: number },
        {
          error?: string;
          externalId: string;
          queueId?: string;
          success: boolean;
        },
        Name
      >;
      updateInitiative: FunctionReference<
        "mutation",
        "internal",
        {
          assigneeExternalId?: string;
          description?: string;
          externalId: string;
          finishedAt?: number;
          priority?: "lowest" | "low" | "medium" | "high" | "highest";
          riskExternalId?: string;
          status?: "ON_TIME" | "OVERDUE" | "FINISHED";
        },
        {
          error?: string;
          externalId: string;
          queueId?: string;
          success: boolean;
        },
        Name
      >;
      updateKeyResult: FunctionReference<
        "mutation",
        "internal",
        {
          externalId: string;
          forecastValue?: number;
          objectiveExternalId?: string;
          targetValue?: number;
        },
        {
          error?: string;
          externalId: string;
          queueId?: string;
          success: boolean;
        },
        Name
      >;
      updateMilestone: FunctionReference<
        "mutation",
        "internal",
        {
          achievedAt?: number;
          description?: string;
          externalId: string;
          forecastDate?: number;
          status?: "ON_TIME" | "OVERDUE" | "ACHIEVED_ON_TIME" | "ACHIEVED_LATE";
          value?: number;
        },
        {
          error?: string;
          externalId: string;
          queueId?: string;
          success: boolean;
        },
        Name
      >;
      updateObjective: FunctionReference<
        "mutation",
        "internal",
        { description?: string; externalId: string; title?: string },
        {
          error?: string;
          externalId: string;
          queueId?: string;
          success: boolean;
        },
        Name
      >;
      updateRisk: FunctionReference<
        "mutation",
        "internal",
        {
          description?: string;
          externalId: string;
          indicatorExternalId?: string;
          isRed?: boolean;
          keyResultExternalId?: string;
          priority?: "lowest" | "low" | "medium" | "high" | "highest";
          triggerValue?: number;
          triggeredIfLower?: boolean;
          useForecastAsTrigger?: boolean;
        },
        {
          error?: string;
          externalId: string;
          queueId?: string;
          success: boolean;
        },
        Name
      >;
    };
    sync: {
      http: {
        sendBatchToLinkHub: FunctionReference<
          "action",
          "internal",
          {
            apiKeyPrefix: string;
            endpointUrl: string;
            payload: string;
            signingSecret: string;
          },
          {
            errors: Array<string>;
            results: Array<{
              action?: "create" | "update";
              entityType: string;
              error?: string;
              externalId: string;
              linkHubId?: string;
            }>;
            success: boolean;
          },
          Name
        >;
        sendToLinkHub: FunctionReference<
          "action",
          "internal",
          {
            apiKeyPrefix: string;
            endpointUrl: string;
            entityType: string;
            payload: string;
            signingSecret: string;
          },
          {
            action?: "create" | "update";
            error?: string;
            externalId: string;
            linkHubId?: string;
            success: boolean;
          },
          Name
        >;
      };
      index: {
        getPendingSyncItems: FunctionReference<
          "query",
          "internal",
          { limit?: number },
          Array<{
            _creationTime: number;
            _id: string;
            attempts: number;
            createdAt: number;
            entityType: string;
            errorMessage?: string;
            externalId: string;
            lastAttemptAt?: number;
            payload: string;
            status: string;
          }>,
          Name
        >;
        processSyncQueue: FunctionReference<
          "action",
          "internal",
          {
            apiKeyPrefix?: string;
            batchSize?: number;
            endpointUrl?: string;
            signingSecret?: string;
          },
          { failed: number; processed: number; succeeded: number },
          Name
        >;
        sendBatchToLinkHub: FunctionReference<
          "action",
          "internal",
          {
            apiKeyPrefix: string;
            endpointUrl: string;
            payload: string;
            signingSecret: string;
          },
          {
            errors: Array<string>;
            results: Array<{
              action?: "create" | "update";
              entityType: string;
              error?: string;
              externalId: string;
              linkHubId?: string;
            }>;
            success: boolean;
          },
          Name
        >;
        sendToLinkHub: FunctionReference<
          "action",
          "internal",
          {
            apiKeyPrefix: string;
            endpointUrl: string;
            entityType: string;
            payload: string;
            signingSecret: string;
          },
          {
            action?: "create" | "update";
            error?: string;
            externalId: string;
            linkHubId?: string;
            success: boolean;
          },
          Name
        >;
      };
      processor: {
        processSyncQueue: FunctionReference<
          "action",
          "internal",
          {
            apiKeyPrefix?: string;
            batchSize?: number;
            endpointUrl?: string;
            signingSecret?: string;
          },
          { failed: number; processed: number; succeeded: number },
          Name
        >;
      };
      queue: {
        getPendingSyncItems: FunctionReference<
          "query",
          "internal",
          { limit?: number },
          Array<{
            _creationTime: number;
            _id: string;
            attempts: number;
            createdAt: number;
            entityType: string;
            errorMessage?: string;
            externalId: string;
            lastAttemptAt?: number;
            payload: string;
            status: string;
          }>,
          Name
        >;
      };
    };
  };
