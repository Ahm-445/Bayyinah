/**
 * Which sources an admin has switched off in the source registry
 * (`app_sources.active: false`, set by PATCH /api/sources/:sourceId or in the
 * database). The retriever leaves their chunks out, so a source can be retired
 * without deleting its data.
 *
 * Cached briefly: every question would otherwise read the registry.
 */
const REGISTRY_COLLECTION = "app_sources";
const DEFAULT_TTL_MS = 60 * 1000;

function createSourceRegistry(db, { ttlMs = DEFAULT_TTL_MS, now = () => Date.now(), logger = console } = {}) {
  if (!db || typeof db.collection !== "function") throw new Error("MongoDB database instance is required");
  let cached = null;
  let loadedAt = 0;

  async function inactiveSourceIds() {
    if (cached && now() - loadedAt < ttlMs) return cached;
    try {
      const rows = await db.collection(REGISTRY_COLLECTION)
        .find({ active: false }, { projection: { _id: 0, sourceId: 1 } })
        .toArray();
      cached = rows.map((row) => row.sourceId).filter(Boolean);
      loadedAt = now();
    } catch (error) {
      // Keep answering if the registry cannot be read; use the last known list.
      logger.warn(`[ai] could not read the source registry: ${error.message}`);
      cached ||= [];
    }
    return cached;
  }

  return { inactiveSourceIds };
}

module.exports = { createSourceRegistry, REGISTRY_COLLECTION };
