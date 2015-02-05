(function(){

'use strict';


angular.module('sdm.authentication.services.angularOauth', []).

    provider('Token', [function() {

        /**
         * Given an flat object, returns a query string for use in URLs.    Note
         * that for a given object, the return value may be.
         *
         * @example
         * <pre>
                 // returns 'color=red&size=large'
                 objectToQueryString({color: 'red', size: 'large'})
         * </pre>
         *
         * @param {Object} obj A flat object containing keys for such a string.
         * @returns {string} A string suitable as a query string.
         */
        var objectToQueryString = function(obj) {
            var str = [];
            angular.forEach(obj, function(value, key) {
                str.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
            });
            return str.join("&");
        };


        // This response_type MUST be passed to the authorization endpoint using
        // the implicit grant flow (4.2.1 of RFC 6749).
        var RESPONSE_TYPE = 'token';

        // Create a special object for config fields that are required and missing.
        // If any config items still contain it when Token is used, raise an error.
        var REQUIRED_AND_MISSING = {};

        var config = {
            clientId: REQUIRED_AND_MISSING,
            redirectUri: REQUIRED_AND_MISSING,
            authorizationEndpoint: REQUIRED_AND_MISSING,
            localStorageName: 'accessToken',
            verifyFunc: REQUIRED_AND_MISSING,
            scopes: []
        };


        var extendConfig = function(configExtension){
            config = angular.extend(config, configExtension);
        };

        this.extendConfig = function(configExtension){
            extendConfig(configExtension);
        };

        this.$get = ['$q', '$http', '$window', '$rootScope', '$compile', function($q, $http, $window, $rootScope, $compile) {

            var getParams = function() {
                // TODO: Facebook uses comma-delimited scopes. This is not compliant with section 3.3 but perhaps support later.
                // Send a state to authorization endpoint
                // this state should be sent back from the endpoint and should
                // match the original value
                $rootScope.oauth_state = Math.random() + new Date().getTime();

                return {
                    response_type: RESPONSE_TYPE,
                    client_id: config.clientId,
                    redirect_uri: config.redirectUri,
                    scope: config.scopes.join(" "),
                    state: $rootScope.oauth_state
                }
            };

            return {

                /**
                 * Verifies that the access token is was issued for the use of the current client.
                 *
                 * @param accessToken An access token received from the authorization server.
                 * @returns {Promise} Promise that will be resolved when the authorization server has verified that the
                 *    token is valid, and we've verified that the token is passed back has audience that matches our client
                 *    ID (to prevent the Confused Deputy Problem).
                 *
                 *    If there's an error verifying the token, the promise is rejected with an object identifying the `name` error
                 *    in the name member.    The `name` can be either:
                 *
                 *        - `invalid_audience`: The audience didn't match our client ID.
                 *        - `error_response`: The server responded with an error, typically because the token was invalid.    In this
                 *            case, the callback parameters to `error` callback on `$http` are available in the object (`data`,
                 *            `status`, `headers`, `config`).
                 */
                verifyAsync: function(accessToken) {
                    return config.verifyFunc(config, accessToken);
                },

                /**
                 * Verifies an access token asynchronously.
                 *
                 * @param extraParams An access token received from the authorization server.
                 * @param popupOptions Settings for the display of the popup.
                 * @returns {Promise} Promise that will be resolved when the authorization server has verified that the
                 *    token is valid, and we've verified that the token is passed back has audience that matches our client
                 *    ID (to prevent the Confused Deputy Problem).
                 *
                 *    If there's an error verifying the token, the promise is rejected with an object identifying the `name` error
                 *    in the name member.    The `name` can be either:
                 *
                 *        - `invalid_audience`: The audience didn't match our client ID.
                 *        - `error_response`: The server responded with an error, typically because the token was invalid.    In this
                 *            case, the callback parameters to `error` callback on `$http` are available in the object (`data`,
                 *            `status`, `headers`, `config`).
                 */
                getTokenByPopup: function(extraParams, popupOptions) {
                    console.log(popupOptions);

                    var requiredAndMissing = [];
                    angular.forEach(params, function(value, key) {
                        if (value === REQUIRED_AND_MISSING) {
                            requiredAndMissing.push(key);
                        }
                    });

                    if (requiredAndMissing.length) {
                        throw new Error("TokenProvider is insufficiently configured.    Please " +
                            "configure the following options using " +
                            "TokenProvider.extendConfig: " + requiredAndMissing.join(", "))
                    }
                    var width = 306;

                    popupOptions = angular.extend({
                        name: 'AuthPopup',
                        openParams: {
                            width: 500,
                            height: 504,
                            resizable: true,
                            scrollbars: true,
                            status: true,
                            left: (screen.width - 500)/2
                        }
                    }, popupOptions);


                    var params = angular.extend(getParams(), extraParams),
                        deferred = $q.defer(),
                        url = config.authorizationEndpoint + '?' + objectToQueryString(params);

                    var formatPopupOptions = function(options) {
                        var pairs = [];
                        angular.forEach(options, function(value, key) {
                            if (value || value === 0) {
                                value = value === true ? 'yes' : value;
                                pairs.push(key + '=' + value);
                            }
                        });
                        return pairs.join(',');
                    };
                    console.log(url);
                    var popup = window.open(url, popupOptions.name, formatPopupOptions(popupOptions.openParams));

                    // TODO: binding occurs for each reauthentication, leading to leaks for long-running apps.

                    window.setOauthParams = function(params) {
                        if(params.state == $rootScope.oauth_state){
                            $rootScope.$apply(function(){
                                if (params.access_token) {
                                    deferred.resolve(params)
                                } else {
                                    deferred.reject(params)
                                }
                            });
                        }
                    };

                    // TODO: reject deferred if the popup was closed without a message being delivered + maybe offer a timeout

                    return deferred.promise;
                },
                refreshToken: function(extraParams) {
                    var deferred = $q.defer(),
                        params = angular.extend(getParams(), extraParams),
                        url = config.authorizationEndpoint + '?' + objectToQueryString(params);

                    angular.element('<iframe>', {
                        src: url,
                        id: 'AuthIframe',
                        style: 'display:none;'})
                        .appendTo('body');
                    var iframe = document.getElementById('AuthIframe');

                    //console.log('afterAppend', afterAppend);
                    var success;


                    iframe.contentWindow.setOauthParams = function(params) {
                        if(params.state == $rootScope.oauth_state){
                            $rootScope.$apply(function(){
                                if (params.access_token) {
                                    deferred.resolve(params)
                                } else {
                                    deferred.reject(params)
                                }
                            });
                        }
                    };

                    iframe.onload = function() {
                        try {
                            success = iframe.contentWindow.document;
                        } catch(err) {
                            success = false;
                        }

                        if (!success){
                            var trampoline =
                                '<div sdm-popover ' +
                                            'sdm-popover-class="sdm-login-modal" ' +
                                            'sdm-popover-dynamic-position="false" ' +
                                            'sdm-popover-template-content="components/authentication/loginModal.html" ' +
                                            'sdm-popover-show-immediately ' +
                                            'sdm-append-to-body ' +
                                '></div>';
                            $compile(trampoline)($rootScope.$new(true));
                            deferred.reject('open modal to login');
                        }
                    };
                    deferred.promise.finally(function(){
                        iframe.parentNode.removeChild(iframe);
                    });
                    return deferred.promise;
                }
            }
        }];
    }]);
})();
