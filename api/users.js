const { createObjectResourceHandler } = require('./_lib/resource-handler');

module.exports = createObjectResourceHandler({
  stateKey: 'users',
  collectionName: 'users'
});
