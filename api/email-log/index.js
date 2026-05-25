const { createArrayResourceHandler } = require('../_lib/resource-handler');

module.exports = createArrayResourceHandler({
  stateKey: 'emailLog',
  collectionName: 'email_log'
});
