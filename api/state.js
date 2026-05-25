const {
  ARRAY_COLLECTIONS,
  OBJECT_COLLECTIONS,
  LOCAL_STORAGE_COLLECTION,
  METADATA_COLLECTION,
  getDb,
  normalizeState,
  readSeparatedState,
  readLegacyState,
  removeLegacyState,
  writeSeparatedState
} = require('./_lib/cinebook-db');
const { send, readBody, setCors, handleOptions } = require('./_lib/http');

module.exports = async function handler(req, res) {
  setCors(res);
  if (handleOptions(req, res)) return;

  try {
    const db = await getDb();

    if (req.method === 'GET') {
      const separatedState = await readSeparatedState(db);
      const metadata = await db.collection(METADATA_COLLECTION).findOne({ _id: 'cinebook' });

      if (separatedState) {
        await removeLegacyState(db);
        send(res, 200, {
          ok: true,
          state: separatedState,
          updatedAt: metadata && metadata.updatedAt,
          storage: 'separated-collections'
        });
        return;
      }

      const legacy = await readLegacyState(db);
      if (legacy.collectionName) {
        const updatedAt = await writeSeparatedState(db, legacy.state, 'legacy-app-state-migration');
        send(res, 200, {
          ok: true,
          state: legacy.state,
          updatedAt,
          storage: 'separated-collections',
          migratedFrom: legacy.collectionName
        });
        return;
      }

      send(res, 200, {
        ok: true,
        state: normalizeState(),
        updatedAt: null,
        storage: 'separated-collections'
      });
      return;
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const body = await readBody(req);
      const updatedAt = await writeSeparatedState(db, body.state, body.source);

      send(res, 200, {
        ok: true,
        updatedAt,
        storage: 'separated-collections',
        collections: [
          ...Object.values(ARRAY_COLLECTIONS),
          ...Object.values(OBJECT_COLLECTIONS),
          LOCAL_STORAGE_COLLECTION,
          METADATA_COLLECTION
        ]
      });
      return;
    }

    send(res, 405, { ok: false, error: 'Method not allowed.' });
  } catch (error) {
    send(res, 500, { ok: false, error: error.message });
  }
};
