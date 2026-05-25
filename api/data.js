const {
  ARRAY_COLLECTIONS,
  OBJECT_COLLECTIONS
} = require('./_lib/cinebook-db');
const {
  createArrayResourceHandler,
  createObjectResourceHandler,
  createLocalStorageHandler
} = require('./_lib/resource-handler');
const { send, setCors, handleOptions } = require('./_lib/http');

const RESOURCE_HANDLERS = {
  movies: createArrayResourceHandler({
    stateKey: 'movies',
    collectionName: ARRAY_COLLECTIONS.movies
  }),
  theaters: createArrayResourceHandler({
    stateKey: 'theaters',
    collectionName: ARRAY_COLLECTIONS.theaters
  }),
  showtimes: createArrayResourceHandler({
    stateKey: 'showtimes',
    collectionName: ARRAY_COLLECTIONS.showtimes
  }),
  reservations: createArrayResourceHandler({
    stateKey: 'reservations',
    collectionName: ARRAY_COLLECTIONS.reservations
  }),
  payments: createArrayResourceHandler({
    stateKey: 'payments',
    collectionName: ARRAY_COLLECTIONS.payments
  }),
  'payment-submissions': createArrayResourceHandler({
    stateKey: 'paymentSubmissions',
    collectionName: ARRAY_COLLECTIONS.paymentSubmissions
  }),
  'email-log': createArrayResourceHandler({
    stateKey: 'emailLog',
    collectionName: ARRAY_COLLECTIONS.emailLog
  }),
  users: createObjectResourceHandler({
    stateKey: 'users',
    collectionName: OBJECT_COLLECTIONS.users
  }),
  preferences: createObjectResourceHandler({
    stateKey: 'preferences',
    collectionName: OBJECT_COLLECTIONS.preferences
  }),
  'local-storage': createLocalStorageHandler()
};

function getResourceName(req) {
  const baseUrl = `http://${req.headers.host || 'localhost'}`;
  const url = new URL(req.url, baseUrl);
  return String(url.searchParams.get('resource') || '').trim();
}

module.exports = async function handler(req, res) {
  const resource = getResourceName(req);
  const resourceHandler = RESOURCE_HANDLERS[resource];

  if (!resourceHandler) {
    setCors(res);
    if (handleOptions(req, res)) return;
    send(res, 404, {
      ok: false,
      error: 'Unknown API resource.',
      resources: Object.keys(RESOURCE_HANDLERS)
    });
    return;
  }

  return resourceHandler(req, res);
};
