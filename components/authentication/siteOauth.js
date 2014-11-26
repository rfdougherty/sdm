(function(verificationEndpoint, authorizationEndpoint){

'use strict';

//var verificationEndpoint = 'https://www.googleapis.com/oauth2/v1/tokeninfo';
//var authorizationEndpoint= 'https://accounts.google.com/o/oauth2/auth';


/**
 * A module to include instead of `angularOauth` for a service preconfigured
 * for Google OAuth authentication.
 *
 * Guide: https://developers.google.com/accounts/docs/OAuth2UserAgent
 */

 //TODO: need to be able to config pop window dimensions without editting angularOauth.js
angular.module('sdm.authentication.services.siteOauth',
  ['sdm.authentication.services.angularOauth']).

  constant('SiteTokenVerifier', function(config, accessToken) {
    var $injector = angular.injector(['ng']);
    return $injector.invoke(['$http', '$rootScope', '$q', function($http, $rootScope, $q) {
      var deferred = $q.defer();

      $rootScope.$apply(function() {
        $http({method: 'GET', url: verificationEndpoint, params: {access_token: accessToken}}).
          success(function(data) {
            if (data.audience == config.clientId) {
              deferred.resolve(data);
            } else {
              deferred.reject({name: 'invalid_audience'});
            }
          }).
          error(function(data, status, headers, config) {
            deferred.reject({
              name: 'error_response',
              data: data,
              status: status,
              headers: headers,
              config: config
            });
          });
      });

      return deferred.promise;
    }]);
  }).

  config(['TokenProvider', 'SiteTokenVerifier', function(TokenProvider, SiteTokenVerifier) {
    TokenProvider.extendConfig({
      authorizationEndpoint: authorizationEndpoint,
      scopes: ["https://www.googleapis.com/auth/userinfo.email"],
      verifyFunc: SiteTokenVerifier
    });
  }]);
})(VERIFICATION_ENDPOINT, AUTHENTICATION_ENDPOINT);
