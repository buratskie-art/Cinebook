const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'cinebook';
const LEGACY_COLLECTION_NAMES = Array.from(new Set([
  process.env.MONGODB_COLLECTION || 'app_state',
  'app_state'
]));
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

async function getDb() {
  const client = await getClient();
  return client.db(MONGODB_DB);
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

async function readArrayCollection(db, collectionName) {
  const docs = await db.collection(collectionName)
    .find({})
    .sort({ _cinebookOrder: 1, _id: 1 })
    .toArray();
  return docs.map(withoutInternalFields);
}

async function replaceArrayCollection(db, collectionName, items) {
  const collection = db.collection(collectionName);
  const docs = makeArrayDocs(Array.isArray(items) ? items : [], collectionName);
  await collection.deleteMany({});
  if (docs.length > 0) {
    await collection.insertMany(docs);
  }
  return docs.length;
}

async function readObjectCollection(db, collectionName) {
  const doc = await db.collection(collectionName).findOne({ _id: STATE_ID });
  return doc ? withoutInternalFields(doc) : {};
}

async function replaceObjectCollection(db, collectionName, value) {
  const updatedAt = new Date();
  const next = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  await db.collection(collectionName).replaceOne(
    { _id: STATE_ID },
    { _id: STATE_ID, ...next, updatedAt },
    { upsert: true }
  );
  return updatedAt;
}

async function readLocalStorage(db) {
  const storageDocs = await db.collection(LOCAL_STORAGE_COLLECTION).find({}).sort({ key: 1 }).toArray();
  return storageDocs.reduce((dump, doc) => {
    dump[doc.key] = doc.value;
    return dump;
  }, {});
}

async function replaceLocalStorage(db, localStorage) {
  const collection = db.collection(LOCAL_STORAGE_COLLECTION);
  const next = localStorage && typeof localStorage === 'object' && !Array.isArray(localStorage)
    ? localStorage
    : {};
  await collection.deleteMany({});
  const docs = Object.entries(next).map(([key, value], index) => ({
    _id: key || `local_storage_${index + 1}`,
    key,
    value
  }));

  if (docs.length > 0) {
    await collection.insertMany(docs);
  }

  return docs.length;
}

async function readSeparatedState(db) {
  const state = normalizeState();

  await Promise.all(
    Object.entries(ARRAY_COLLECTIONS).map(async ([stateKey, collectionName]) => {
      state[stateKey] = await readArrayCollection(db, collectionName);
    })
  );

  await Promise.all(
    Object.entries(OBJECT_COLLECTIONS).map(async ([stateKey, collectionName]) => {
      state[stateKey] = await readObjectCollection(db, collectionName);
    })
  );

  state.localStorage = await readLocalStorage(db);

  const hasSeparatedData = Object.values(state).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value && typeof value === 'object' && Object.keys(value).length > 0;
  });

  return hasSeparatedData ? state : null;
}

async function readLegacyState(db) {
  for (const collectionName of LEGACY_COLLECTION_NAMES) {
    const doc = await db.collection(collectionName).findOne({ _id: STATE_ID });
    if (doc) {
      return {
        state: normalizeState(doc.state),
        updatedAt: doc.updatedAt,
        collectionName
      };
    }
  }

  return {
    state: normalizeState(),
    updatedAt: null,
    collectionName: null
  };
}

async function removeLegacyState(db) {
  await Promise.all(
    LEGACY_COLLECTION_NAMES.map(async (collectionName) => {
      try {
        await db.collection(collectionName).drop();
      } catch (error) {
        if (error.codeName !== 'NamespaceNotFound') {
          throw error;
        }
      }
    })
  );
}

async function writeMetadata(db, source) {
  const updatedAt = new Date();
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

async function writeSeparatedState(db, state, source) {
  const normalized = normalizeState(state);

  for (const [stateKey, collectionName] of Object.entries(ARRAY_COLLECTIONS)) {
    await replaceArrayCollection(db, collectionName, normalized[stateKey]);
  }

  for (const [stateKey, collectionName] of Object.entries(OBJECT_COLLECTIONS)) {
    await replaceObjectCollection(db, collectionName, normalized[stateKey]);
  }

  await replaceLocalStorage(db, normalized.localStorage);
  const updatedAt = await writeMetadata(db, source);
  await removeLegacyState(db);
  return updatedAt;
}

module.exports = {
  ARRAY_COLLECTIONS,
  OBJECT_COLLECTIONS,
  LOCAL_STORAGE_COLLECTION,
  METADATA_COLLECTION,
  STATE_ID,
  getDb,
  normalizeState,
  readArrayCollection,
  replaceArrayCollection,
  readObjectCollection,
  replaceObjectCollection,
  readLocalStorage,
  replaceLocalStorage,
  readSeparatedState,
  readLegacyState,
  removeLegacyState,
  writeMetadata,
  writeSeparatedState
};
