const { createArrayResourceHandler } = require('../_lib/resource-handler');

module.exports = createArrayResourceHandler({
  stateKey: 'paymentSubmissions',
  collectionName: 'payment_submissions'
});
