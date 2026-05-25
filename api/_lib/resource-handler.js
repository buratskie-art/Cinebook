const {
  getDb,
  readArrayCollection,
  replaceArrayCollection,
  readObjectCollection,
  replaceObjectCollection,
  readLocalStorage,
  replaceLocalStorage,
  removeLegacyState,
  writeMetadata
} = require('./cinebook-db');
const { send, readBody, setCors, handleOptions } = require('./http');

function extractValue(body, stateKey, fallback) {
  if (Object.prototype.hasOwnProperty.call(body, stateKey)) return body[stateKey];
  if (Object.prototype.hasOwnProperty.call(body, 'items')) return body.items;
  if (Object.prototype.hasOwnProperty.call(body, 'data')) return body.data;
  return fallback;
}

function createArrayResourceHandler({ stateKey, collectionName }) {
  return async function handler(req, res) {
    setCors(res);
    if (handleOptions(req, res)) return;

    try {
      const db = await getDb();

      if (req.method === 'GET') {
        send(res, 200, {
          ok: true,
          [stateKey]: await readArrayCollection(db, collectionName),
          collection: collectionName
        });
        return;
      }

      if (req.method === 'POST' || req.method === 'PUT') {
        const body = await readBody(req);
        const items = extractValue(body, stateKey, Array.isArray(body) ? body : []);
        const count = await replaceArrayCollection(db, collectionName, items);
        const updatedAt = await writeMetadata(db, body.source || `api-${stateKey}`);
        await removeLegacyState(db);
        send(res, 200, { ok: true, collection: collectionName, count, updatedAt });
        return;
      }

      if (req.method === 'DELETE') {
        const count = await replaceArrayCollection(db, collectionName, []);
        const updatedAt = await writeMetadata(db, `api-${stateKey}-delete`);
        await removeLegacyState(db);
        send(res, 200, { ok: true, collection: collectionName, count, updatedAt });
        return;
      }

      send(res, 405, { ok: false, error: 'Method not allowed.' });
    } catch (error) {
      send(res, 500, { ok: false, error: error.message });
    }
  };
}

function createObjectResourceHandler({ stateKey, collectionName }) {
  return async function handler(req, res) {
    setCors(res);
    if (handleOptions(req, res)) return;

    try {
      const db = await getDb();

      if (req.method === 'GET') {
        send(res, 200, {
          ok: true,
          [stateKey]: await readObjectCollection(db, collectionName),
          collection: collectionName
        });
        return;
      }

      if (req.method === 'POST' || req.method === 'PUT') {
        const body = await readBody(req);
        const value = extractValue(body, stateKey, body);
        const updatedAt = await replaceObjectCollection(db, collectionName, value);
        await writeMetadata(db, body.source || `api-${stateKey}`);
        await removeLegacyState(db);
        send(res, 200, { ok: true, collection: collectionName, updatedAt });
        return;
      }

      if (req.method === 'DELETE') {
        const updatedAt = await replaceObjectCollection(db, collectionName, {});
        await writeMetadata(db, `api-${stateKey}-delete`);
        await removeLegacyState(db);
        send(res, 200, { ok: true, collection: collectionName, updatedAt });
        return;
      }

      send(res, 405, { ok: false, error: 'Method not allowed.' });
    } catch (error) {
      send(res, 500, { ok: false, error: error.message });
    }
  };
}

function createLocalStorageHandler() {
  return async function handler(req, res) {
    setCors(res);
    if (handleOptions(req, res)) return;

    try {
      const db = await getDb();

      if (req.method === 'GET') {
        send(res, 200, {
          ok: true,
          localStorage: await readLocalStorage(db),
          collection: 'local_storage'
        });
        return;
      }

      if (req.method === 'POST' || req.method === 'PUT') {
        const body = await readBody(req);
        const value = extractValue(body, 'localStorage', body);
        const count = await replaceLocalStorage(db, value);
        const updatedAt = await writeMetadata(db, body.source || 'api-local-storage');
        await removeLegacyState(db);
        send(res, 200, { ok: true, collection: 'local_storage', count, updatedAt });
        return;
      }

      if (req.method === 'DELETE') {
        const count = await replaceLocalStorage(db, {});
        const updatedAt = await writeMetadata(db, 'api-local-storage-delete');
        await removeLegacyState(db);
        send(res, 200, { ok: true, collection: 'local_storage', count, updatedAt });
        return;
      }

      send(res, 405, { ok: false, error: 'Method not allowed.' });
    } catch (error) {
      send(res, 500, { ok: false, error: error.message });
    }
  };
}

module.exports = {
  createArrayResourceHandler,
  createObjectResourceHandler,
  createLocalStorageHandler
};
