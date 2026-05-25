const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'cinebook';
const COLLECTION_NAME = process.env.MONGODB_COLLECTION || 'app_state';
const STATE_ID = 'cinebook';

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
    preferences: input.preferences && typeof input.preferences === 'object' ? input.preferences : {}
  };
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
    const collection = client.db(MONGODB_DB).collection(COLLECTION_NAME);

    if (req.method === 'GET') {
      const doc = await collection.findOne({ _id: STATE_ID });
      send(res, 200, {
        ok: true,
        state: normalizeState(doc && doc.state),
        updatedAt: doc && doc.updatedAt
      });
      return;
    }

    if (req.method === 'POST') {
      const body = await readBody(req);
      const state = normalizeState(body.state);
      const updatedAt = new Date();

      await collection.updateOne(
        { _id: STATE_ID },
        {
          $set: {
            state,
            updatedAt,
            source: body.source || 'cinebook-client'
          },
          $setOnInsert: { createdAt: updatedAt }
        },
        { upsert: true }
      );

      send(res, 200, { ok: true, updatedAt });
      return;
    }

    send(res, 405, { ok: false, error: 'Method not allowed.' });
  } catch (error) {
    send(res, 500, { ok: false, error: error.message });
  }
};
