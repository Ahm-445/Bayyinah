const Source = require("../models/Source");
const HttpError = require("../utils/httpError");
const { sourceView } = require("../services/serializers");
const { recordAudit } = require("../services/audit");

async function getOne(req, res) {
  const source = await Source.findOne({ sourceId: String(req.params.sourceId) });

  if (!source) throw new HttpError(404, "Source not found.");

  res.json(sourceView(source));
}

async function list(req, res) {
  const sources = await Source.find().sort({ domain: 1, title: 1 });

  res.json({ sources: sources.map(sourceView) });
}

/** Enable or disable a source in the registry. */
async function setActive(req, res) {
  if (typeof req.body?.active !== "boolean") {
    throw new HttpError(400, "active must be true or false.");
  }

  const source = await Source.findOneAndUpdate(
    { sourceId: String(req.params.sourceId) },
    { $set: { active: req.body.active } },
    { returnDocument: "after" }
  );

  if (!source) throw new HttpError(404, "Source not found.");

  await recordAudit({
    actorId: req.user.id,
    action: "source.setActive",
    entityType: "source",
    metadata: { sourceId: source.sourceId, active: source.active },
  });

  res.json(sourceView(source));
}

module.exports = { getOne, list, setActive };
