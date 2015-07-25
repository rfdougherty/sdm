'use strict';

(function(){

    var sdmUserManager = function ($http, $cookieStore, $q, $rootScope, sdmPopoverTrampoline, Token) {
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
                    angular.extend(value_auth_data, {
                        access_token: access_token,
                        user_uid: data['_id'],
                        firstname: data['firstname'],
                        lastname: data['lastname'],
                        root: data['root'],
                        wheel: data['wheel'],
                        logged_in: true,
                        avatar: data['avatar'],
                        preferences: data['preferences']
                    });
                    $cookieStore.put(SDM_KEY_CACHED_ACCESS_DATA, value_auth_data);

                    deferred.resolve(value_auth_data);
                }).
                error(function(data, status, headers, config) {
                    if (status === 403) {
                        sdmPopoverTrampoline.trigger(
                            'sdm-new-user',
                            'components/authentication/newUserModal.html',
                            {username: data.uid}
                        );
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
            console.log('refreshing');
            Token.refreshToken({}).then(
                function(params) {
                    console.log('refreshed token');
                    login(params.access_token, deferred);
                }, function(reason) {
                    console.log("Failed to refresh token.");
                    console.log(reason);
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
            }).
            error(function(errorData, status, headers, config) {
                if (status === 401) {
                    refreshToken().then(function(){
                        deferred.resolve(updateUserData(data));
                    },
                    function() {
                        deferred.reject();
                    });
                    return;
                }
                console.log(errorData);
                console.log(status);
                console.log(headers);
                console.log(config);

                deferred.reject(status);
            });
            return deferred.promise;
        }

        var getUserDataFromAPI = function() {
            var deferred = $q.defer();
            var url = BASE_URL + 'users/' + value_auth_data.user_uid;
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
            }).
            error(function(errorData, status, headers, config) {
                if (status === 401) {
                    refreshToken().then(function(){
                        deferred.resolve(getUserDataFromAPI());
                    },
                    function() {
                        deferred.reject();
                    });
                    return;
                }
                console.log(errorData);
                console.log(status);
                console.log(headers);
                console.log(config);

                deferred.reject(status);
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
            value_auth_data.avatar = null;
            $cookieStore.remove(SDM_KEY_CACHED_ACCESS_DATA);
            return value_auth_data;
        };

        var getAuthData = function() {
            if (!initialized) {
                angular.extend(value_auth_data, $cookieStore.get(SDM_KEY_CACHED_ACCESS_DATA));
                initialized = true;
            }
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

    sdmUserManager.$inject = ['$http', '$cookieStore', '$q', '$rootScope', 'sdmPopoverTrampoline', 'Token'];

    angular.module('sdm.authentication.services.sdmUserManager', [
        'sdm.authentication.services.siteOauth', 'ngCookies',
        'sdm.popovers.services.sdmPopoverTrampoline'])
        .config(function(TokenProvider) {
        /*FIXME: there is probably a more angular way to do this*/
        var baseUrl = window.location.href.split('#')[0];

        TokenProvider.extendConfig({
            clientId: CLIENT_ID,
            redirectUri: baseUrl + 'components/authentication/oauth2callback.html',
            scopes: ["openid", "email"]
        });
    }).factory('sdmUserManager', sdmUserManager);

})();
