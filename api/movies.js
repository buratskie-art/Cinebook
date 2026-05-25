const { createArrayResourceHandler } = require('./_lib/resource-handler');

module.exports = createArrayResourceHandler({
  stateKey: 'movies',
  collectionName: 'movies'
});
