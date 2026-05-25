const {
  REQUIRED_COLLECTIONS,
  getDb,
  ensureRequiredCollections,
  removeLegacyState,
  writeMetadata
} = require('../_lib/cinebook-db');
const { send, setCors, handleOptions } = require('../_lib/http');

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET' && req.method !== 'POST') {
    send(res, 405, { ok: false, error: 'Method not allowed.' });
    return;
  }

  try {
    const db = await getDb();
    await ensureRequiredCollections(db);
    await removeLegacyState(db);
    const updatedAt = await writeMetadata(db, 'api-init-db');
    const collections = await db.listCollections().toArray();

    send(res, 200, {
      ok: true,
      updatedAt,
      requiredCollections: REQUIRED_COLLECTIONS,
      currentCollections: collections.map((collection) => collection.name).sort()
    });
  } catch (error) {
    send(res, 500, { ok: false, error: error.message });
  }
};
