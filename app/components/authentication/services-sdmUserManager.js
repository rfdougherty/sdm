'use strict';

(function(){

    var sdmUserManager = function ($http, $cookieStore, $q, $rootScope, $compile, Token) {
        var value_auth_data = {};
        var initialized = false;

        var login = function(access_token, deferred) {
            deferred = deferred||$q.defer();

            Token.verifyAsync(access_token).
            then(function(data) {
                console.log(data);

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
                    angular.extend(value_auth_data, {
                        access_token: access_token,
                        user_uid: data['_id'],
                        firstname: data['firstname'],
                        lastname: data['lastname'],
                        root: data['root'],
                        wheel: data['wheel'],
                        logged_in: true,
                        email_hash: data['email_hash'],
                        preferences: data['preferences']
                    });
                    $cookieStore.put(SDM_KEY_CACHED_ACCESS_DATA, value_auth_data);

                    deferred.resolve(value_auth_data);
                }).
                error(function(data, status, headers, config) {
                    if (status === 403) {
                        var trampoline =
                            '<div sdm-popover ' +
                                'sdm-popover-class="sdm-new-user" ' +
                                'sdm-popover-dynamic-position="false" ' +
                                'sdm-popover-template-content="components/authentication/newUserModal.html" ' +
                                'sdm-popover-show-immediately ' +
                                'sdm-append-to-body ' +
                            '></div>';
                        var scope = $rootScope.$new(true);
                        scope.username = data.uid;
                        $compile(trampoline)(scope);
                    }
                    console.log(data);
                    console.log(status);
                    console.log(headers);
                    console.log(config);
                    deferred.reject(status);
                });
            }, function(reason) {
                console.log("Failed to verify token.");
                deferred.reject(reason);
            });
            return deferred.promise;
        };
        var isRefreshing = null;
        var refreshToken = function() {
            if (isRefreshing) {
                return isRefreshing;
            }
            var deferred = $q.defer();
            Token.refreshToken({}).then(
                function(params) {
                    console.log('refreshed token');
                    login(params.access_token, deferred);
                }, function(reason) {
                    console.log("Failed to refresh token.");
                    deferred.reject(reason);
                });
            isRefreshing = deferred.promise;
            deferred.promise.finally(function(){
                isRefreshing = null;
            })
            return deferred.promise;
        }

        var authenticate = function() {
            console.log('attempting to login');
            //console.log('old token:' + value_auth_data.accessToken);
            var deferred = $q.defer();
            var extraParams = {};
            try {
                var popupOptions = POPUP_OPTIONS;
            } catch(err) {}
            Token.getTokenByPopup(extraParams, popupOptions)
                .then(function(params) {
                    console.log('got new token from popup');
                    login(params.access_token, deferred);
                }, function(reason) {
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


        var updateUserData = function(data) {
            var deferred = $q.defer();
            var url = BASE_URL + 'users/' + value_auth_data.user_uid;
            //console.log(data);
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
                console.log('userdata updated');
                angular.extend(value_auth_data, data);
                $cookieStore.put(SDM_KEY_CACHED_ACCESS_DATA, value_auth_data);
                deferred.resolve(value_auth_data);
            });
            return deferred.promise;
        }

        var getUserDataFromAPI = function() {
            var deferred = $q.defer();
            var url = BASE_URL + 'users/' + value_auth_data.user_uid;
            //console.log(data);
            $http({
                method: 'GET',
                url: url,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': value_auth_data.access_token
                }
            }).
            success(function(data){
                console.log('userdata received');
                console.log(data);
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
            value_auth_data.firstname = null;
            value_auth_data.lastname = null;
            value_auth_data.root = null;
            value_auth_data.wheel = null;
            value_auth_data.preferences = null;
            value_auth_data.email_hash = null;
            $cookieStore.remove(SDM_KEY_CACHED_ACCESS_DATA);
            return value_auth_data;
        };

        var getAuthData = function() {
            if (!initialized) {
                angular.extend(value_auth_data, $cookieStore.get(SDM_KEY_CACHED_ACCESS_DATA));
                initialized = true;
            }
            //console.log('value_auth_data', value_auth_data);
            return value_auth_data;
        }

        return {
            authenticate: authenticate,
            toggleSuperUser: toggleSuperUser,
            changeViewPreference: changeViewPreference,
            logout: logout,
            getAuthData: getAuthData,
            login: login,
            updateUserData: updateUserData,
            getUserDataFromAPI: getUserDataFromAPI,
            refreshToken: refreshToken
        }
    }

    sdmUserManager.$inject = ['$http', '$cookieStore', '$q', '$rootScope', '$compile', 'Token'];

    angular.module('sdm.authentication.services.sdmUserManager', [
        'sdm.authentication.services.siteOauth', 'ngCookies'])
        .config(function(TokenProvider) {
        /*FIXME: there is probably a more angular way to do this*/
        var baseUrl = window.location.href.split('#')[0];
        //console.log(baseUrl);
        TokenProvider.extendConfig({
            clientId: CLIENT_ID,
            redirectUri: baseUrl + 'components/authentication/oauth2callback.html',
            scopes: ["openid", "email"]
        });
    }).factory('sdmUserManager', sdmUserManager);

})();
