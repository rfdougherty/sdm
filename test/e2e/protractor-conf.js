// An example configuration file.
exports.config = {
  directConnect: true,

  // Capabilities to be passed to the webdriver instance.
  capabilities: {
    'browserName': 'chrome'
  },

  chromeDriver: '../../node_modules/chromedriver/lib/chromedriver/chromedriver',

  // Spec patterns are relative to the current working directly when
  // protractor is called.
  specs: ['test/e2e/*_spec.js'],

  // Options to be passed to Jasmine-node.
  jasmineNodeOpts: {
    showColors: true,
    defaultTimeoutInterval: 30000
  }
};
