'use strict';

(function(){

    var sdmUserManager = function ($http, $cookieStore, $q, Token) {
        var value_auth_data;

        var login = function(access_token) {
            var deferred = $q.defer();
            $http({
                method: 'GET',
                url: BASE_URL + 'users/self',
                headers: {
                    'Authorization': access_token
                }
            }).
            success(function(data, status, headers, config) {
                //parse and return info
                console.log('data', data);
                value_auth_data = {
                    access_token: access_token,
                    user_uid: data['_id'],
                    user_firstname: data['firstname'],
                    user_lastname: data['lastname'],
                    root: data['root'],
                    wheel: data['wheel'],
                    logged_in: true,
                    email_hash: data['email_hash'],
                    preferences: data['preferences']
                };
                $cookieStore.put(SDM_KEY_CACHED_ACCESS_DATA, value_auth_data);

                deferred.resolve(value_auth_data);
            }).
            error(function(data, status, headers, config) {
                console.log(data);
                console.log(status);
                console.log(headers);
                console.log(config);
                deferred.reject(status);
            });
            return deferred.promise;
        };

        var authenticate = function() {
            console.log('attempting to login');
            //console.log('old token:' + value_auth_data.accessToken);
            var deferred = $q.defer();
            var extraParams = {};
            Token.getTokenByPopup(extraParams)
                .then(function(params) {
                    console.log('got new token from popup');
                    // Verify the token before setting it, to avoid the confused deputy problem.
                    Token.verifyAsync(params.access_token).
                    then(function(data) {
                        //$rootScope.$apply(function() {
                            // set access token

                            // if token verifies, set login to true
                            console.log(params);

                            // save the token for later
                            //Token.set(params.access_token);

                            // send token in authorization header
                            //TODO use makeAPICall service
                            login(params.access_token).then(
                                function(value_auth_data){
                                    deferred.resolve(value_auth_data);
                                });
                        //});
                    }, function(reason) {
                        console.log("Failed to verify token.");
                        deferred.reject(reason);

                    });

                }, function(reason) {
                    // Failure getting token from popup.
                    console.log("Failed to get token from popup.");
                    deferred.reject(reason);
                });
            return deferred.promise;
        };

        var toggleSuperUser = function() {
            console.log('togglesuperuser');
            var data = {
                root: !value_auth_data.root
            };
            return updateUserData(data);
        };


        var changeViewPreference = function(dataLayout) {
            if (value_auth_data.user_uid) {
                var data = {
                    preferences: {
                        'data-layout': dataLayout
                    }
                };
                return updateUserData(data);
            }
        }


        var updateUserData = function(data, callback) {
            var deferred = $q.defer();
            var url = BASE_URL + 'users/' + value_auth_data.user_uid;
            console.log(data);
            $http({
                method: 'PUT',
                url: url,
                data: data,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': value_auth_data.access_token
                }
            }).
            success(function(){
                angular.extend(value_auth_data, data);
                $cookieStore.put(SDM_KEY_CACHED_ACCESS_DATA, value_auth_data);
                deferred.resolve(value_auth_data);
            });
            return deferred.promise;
        }

        var logout = function() {
            console.log('logging out');
            value_auth_data.logged_in = null;
            value_auth_data.access_token = null;
            value_auth_data.user_uid = null;
            value_auth_data.user_firstname = null;
            value_auth_data.user_lastname = null;
            value_auth_data.root = null;
            value_auth_data.wheel = null;
            value_auth_data.preferences = null;
            value_auth_data.email_hash = null;
            $cookieStore.remove(SDM_KEY_CACHED_ACCESS_DATA);
            return value_auth_data;
        };

        var getAuthData = function() {
            if (typeof value_auth_data === 'undefined') {
                value_auth_data = $cookieStore.get(SDM_KEY_CACHED_ACCESS_DATA);
            }
            return value_auth_data;
        }

        return {
            authenticate: authenticate,
            toggleSuperUser: toggleSuperUser,
            changeViewPreference: changeViewPreference,
            logout: logout,
            getAuthData: getAuthData,
            login: login
        }
    }

    sdmUserManager.$inject = ['$http', '$cookieStore', '$q', 'Token'];

    angular.module('sdm.authentication.services.sdmUserManager', ['sdm.authentication.services.siteOauth', 'ngCookies']).config(function(TokenProvider) {
        /*FIXME: there is probably a more angular way to do this*/
        var baseUrl = window.location.href.split('#')[0];
        console.log(baseUrl);
        TokenProvider.extendConfig({
            clientId: CLIENT_ID,
            redirectUri: baseUrl + 'components/authentication/oauth2callback.html',
            scopes: ["openid", "email"]
        });
    }).factory('sdmUserManager', sdmUserManager);

})();
