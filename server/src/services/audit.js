const AuditLog = require("../models/AuditLog");

/** Best effort: an audit failure must never fail the user's request. */
async function recordAudit({
  actorId,
  action,
  entityType,
  entityId,
  metadata,
}) {
  try {
    await AuditLog.create({ actorId, action, entityType, entityId, metadata });
  } catch (error) {
    console.error("Audit log failed:", error.message);
  }
}

module.exports = { recordAudit };
