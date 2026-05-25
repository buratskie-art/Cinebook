const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'cinebook';
const LEGACY_COLLECTION_NAME = process.env.MONGODB_COLLECTION || 'app_state';
const STATE_ID = 'cinebook';

const ARRAY_COLLECTIONS = {
  movies: 'movies',
  theaters: 'theaters',
  showtimes: 'showtimes',
  reservations: 'reservations',
  payments: 'payments',
  paymentSubmissions: 'payment_submissions',
  emailLog: 'email_log'
};

const OBJECT_COLLECTIONS = {
  users: 'users',
  preferences: 'preferences'
};

const LOCAL_STORAGE_COLLECTION = 'local_storage';
const METADATA_COLLECTION = 'app_metadata';

let clientPromise;

function getClient() {
  if (!MONGODB_URI) {
    throw new Error('Missing MONGODB_URI environment variable.');
  }

  if (!clientPromise) {
    const client = new MongoClient(MONGODB_URI);
    clientPromise = client.connect();
  }

  return clientPromise;
}

function send(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function normalizeState(input = {}) {
  return {
    movies: Array.isArray(input.movies) ? input.movies : [],
    theaters: Array.isArray(input.theaters) ? input.theaters : [],
    showtimes: Array.isArray(input.showtimes) ? input.showtimes : [],
    reservations: Array.isArray(input.reservations) ? input.reservations : [],
    payments: Array.isArray(input.payments) ? input.payments : [],
    paymentSubmissions: Array.isArray(input.paymentSubmissions) ? input.paymentSubmissions : [],
    emailLog: Array.isArray(input.emailLog) ? input.emailLog : [],
    users: input.users && typeof input.users === 'object' ? input.users : {},
    preferences: input.preferences && typeof input.preferences === 'object' ? input.preferences : {},
    localStorage: input.localStorage && typeof input.localStorage === 'object' ? input.localStorage : {}
  };
}

function withoutInternalFields(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  const { _id, _cinebookOrder, updatedAt, ...rest } = doc;
  return rest;
}

function makeArrayDocs(items, collectionName) {
  const seen = new Set();

  return items.map((item, index) => {
    const source = item && typeof item === 'object' ? { ...item } : { value: item };
    const preferredId = source._id || source.id || source.title || `${collectionName}_${index + 1}`;
    let id = String(preferredId);

    if (seen.has(id)) {
      id = `${id}_${index + 1}`;
    }

    seen.add(id);
    source._id = id;
    source._cinebookOrder = index;
    return source;
  });
}

async function readSeparatedState(db) {
  const state = normalizeState();

  await Promise.all(
    Object.entries(ARRAY_COLLECTIONS).map(async ([stateKey, collectionName]) => {
      const docs = await db.collection(collectionName)
        .find({})
        .sort({ _cinebookOrder: 1, _id: 1 })
        .toArray();
      state[stateKey] = docs.map(withoutInternalFields);
    })
  );

  await Promise.all(
    Object.entries(OBJECT_COLLECTIONS).map(async ([stateKey, collectionName]) => {
      const doc = await db.collection(collectionName).findOne({ _id: STATE_ID });
      state[stateKey] = doc ? withoutInternalFields(doc) : {};
    })
  );

  const storageDocs = await db.collection(LOCAL_STORAGE_COLLECTION).find({}).sort({ key: 1 }).toArray();
  state.localStorage = storageDocs.reduce((dump, doc) => {
    dump[doc.key] = doc.value;
    return dump;
  }, {});

  const hasSeparatedData = Object.values(state).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value && typeof value === 'object' && Object.keys(value).length > 0;
  });

  return hasSeparatedData ? state : null;
}

async function readLegacyState(db) {
  const doc = await db.collection(LEGACY_COLLECTION_NAME).findOne({ _id: STATE_ID });
  return {
    state: normalizeState(doc && doc.state),
    updatedAt: doc && doc.updatedAt
  };
}

async function writeSeparatedState(db, state, source) {
  const updatedAt = new Date();

  for (const [stateKey, collectionName] of Object.entries(ARRAY_COLLECTIONS)) {
    const collection = db.collection(collectionName);
    const docs = makeArrayDocs(state[stateKey], collectionName);
    await collection.deleteMany({});
    if (docs.length > 0) {
      await collection.insertMany(docs);
    }
  }

  for (const [stateKey, collectionName] of Object.entries(OBJECT_COLLECTIONS)) {
    await db.collection(collectionName).replaceOne(
      { _id: STATE_ID },
      { _id: STATE_ID, ...state[stateKey], updatedAt },
      { upsert: true }
    );
  }

  const localStorageCollection = db.collection(LOCAL_STORAGE_COLLECTION);
  await localStorageCollection.deleteMany({});
  const localStorageDocs = Object.entries(state.localStorage || {}).map(([key, value], index) => ({
    _id: key || `local_storage_${index + 1}`,
    key,
    value
  }));

  if (localStorageDocs.length > 0) {
    await localStorageCollection.insertMany(localStorageDocs);
  }

  await db.collection(METADATA_COLLECTION).replaceOne(
    { _id: STATE_ID },
    {
      _id: STATE_ID,
      updatedAt,
      source: source || 'cinebook-client',
      storage: 'separated-collections'
    },
    { upsert: true }
  );

  return updatedAt;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const client = await getClient();
    const db = client.db(MONGODB_DB);

    if (req.method === 'GET') {
      const separatedState = await readSeparatedState(db);
      const metadata = await db.collection(METADATA_COLLECTION).findOne({ _id: STATE_ID });

      if (separatedState) {
        send(res, 200, {
          ok: true,
          state: separatedState,
          updatedAt: metadata && metadata.updatedAt,
          storage: 'separated-collections'
        });
        return;
      }

      const legacy = await readLegacyState(db);
      send(res, 200, {
        ok: true,
        state: legacy.state,
        updatedAt: legacy.updatedAt,
        storage: 'legacy-app-state'
      });
      return;
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const state = normalizeState(body.state);
      const updatedAt = await writeSeparatedState(db, state, body.source);

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
