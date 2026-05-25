const { createArrayResourceHandler } = require('../_lib/resource-handler');

module.exports = createArrayResourceHandler({
  stateKey: 'showtimes',
  collectionName: 'showtimes'
});
