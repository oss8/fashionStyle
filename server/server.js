'use strict';

var loopback = require('loopback');
var boot = require('loopback-boot');

var app = module.exports = loopback();

app.DisableSystemMethod = function (_basemodel) {
    _basemodel.disableRemoteMethodByName("create", true);
    _basemodel.disableRemoteMethodByName("upsert", true);
    _basemodel.disableRemoteMethodByName("updateAll", true);
    _basemodel.disableRemoteMethodByName("updateAttributes", false);

    _basemodel.disableRemoteMethodByName("find", true);
    _basemodel.disableRemoteMethodByName("findById", true);
    _basemodel.disableRemoteMethodByName("findOne", true);

    _basemodel.disableRemoteMethodByName("replaceById", true);
    _basemodel.disableRemoteMethodByName("createChangeStream", true);
    _basemodel.disableRemoteMethodByName("upsertWithWhere", true);
    _basemodel.disableRemoteMethodByName("replaceOrCreate", true);
    _basemodel.disableRemoteMethodByName("deleteById", true);
    _basemodel.disableRemoteMethodByName("getId", true);

    _basemodel.disableRemoteMethodByName("confirm", true);
    _basemodel.disableRemoteMethodByName("count", true);
    _basemodel.disableRemoteMethodByName("exists", true);
    _basemodel.disableRemoteMethodByName("resetPassword", true);

    _basemodel.disableRemoteMethodByName('__count__accessTokens', false);
    _basemodel.disableRemoteMethodByName('__create__accessTokens', false);
    _basemodel.disableRemoteMethodByName('__delete__accessTokens', false);
    _basemodel.disableRemoteMethodByName('__destroyById__accessTokens', false);
    _basemodel.disableRemoteMethodByName('__findById__accessTokens', false);
    _basemodel.disableRemoteMethodByName('__get__accessTokens', false);
    _basemodel.disableRemoteMethodByName('__updateById__accessTokens', false);
};

app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module)
    app.start();
});
