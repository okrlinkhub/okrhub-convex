type EntityType = "keyResult" | "risk" | "initiative";

const LINKHUB_MANAGED_FIELDS: Record<EntityType, string[]> = {
  keyResult: ["weight"],
  risk: ["priority"],
  initiative: ["priority"],
};

/**
 * Removes fields that must stay managed by LinkHub.
 */
export function stripLinkHubManagedFields<T extends Record<string, unknown>>(
  entityType: EntityType,
  payload: T
): Partial<T> {
  const result: Partial<T> = { ...payload };
  for (const field of LINKHUB_MANAGED_FIELDS[entityType]) {
    delete (result as Record<string, unknown>)[field];
  }
  return result;
}
