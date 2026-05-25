const { createArrayResourceHandler } = require('./_lib/resource-handler');

module.exports = createArrayResourceHandler({
  stateKey: 'reservations',
  collectionName: 'reservations'
});
