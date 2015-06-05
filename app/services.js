'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
var nimsServices = angular.module('sdm.services', ['sdmHttpServices', 'sdmD3Service', 'sdmTextWidthCalculator', 'newLinesFilter']).
value('version', '0.11');

var httpServices = angular.module('sdmHttpServices', ['ngCookies', 'sdm.authentication.services.sdmUserManager']);

httpServices.factory('makeAPICall', ['$http', '$cookieStore', 'sdmUserManager', function($http, $cookieStore, sdmUserManager) {

    var makeAPICall = {
        async: function(url, params, method, data, headers, responseType, timeout, rethrow) {
            console.log("MAKE API CALL\nwith url=", url, " and params=", params);
            var accessData = $cookieStore.get(SDM_KEY_CACHED_ACCESS_DATA);
            if (typeof method === 'undefined') {
                method = 'GET';
            }
            var accessToken =
                typeof accessData !== "undefined"?
                accessData.access_token : undefined;
            if (accessToken != null) console.log(" - accessToken="+accessToken);

            if (!params) {
                params = {};
            }


            var requestParams = {
                method: method,
                url: url,
                headers: angular.extend(headers||{}, {'Authorization': accessToken}),
                params: params,
                responseType: responseType,
                timeout: timeout
            };

            if (typeof data !== 'undefined') {
                requestParams.data = data;
                if (data instanceof Uint8Array) {
                    requestParams.transformRequest = [];
                }
            }

            // $http returns a promise, which has a then function, which also returns a promise
            var promise = $http(requestParams).then(function(response) {
                // The then function here is an opportunity to modify the response
                console.log("data returned by API:");
                console.dir(response);
                console.log("\n");
                // The return value gets picked up by the then in the controller.
                return {data: response.data||[]};
            }, function(reason) { //call if the http request fails
                console.log(reason);
                if (reason.status == '401') {
                    return sdmUserManager.refreshToken();
                }
                console.log('Unhandled problem in the request.');
                console.log('Status:', reason.status);
                console.log('Reason', reason);
                if (reason.status == '404') {
                    throw reason;
                }
                if (reason.data) {
                    throw new Error(reason.data.code + ' ' + reason.data.detail);
                } else {
                    throw new Error('Unhandled problem in the request');
                }
            }).then(function(value) {
                console.log(value);
                if (value.data) {
                    return value.data;
                } else {
                    return makeAPICall.async(url, params, method, data);
                }
            }, function(reason){
                if (rethrow) {
                    throw new Error(reason);
                }
                console.log(reason);
            }).then(function(finalResult){
                return finalResult;
            });
            // Return the promise to the controller
            return promise;
        }
    };
    return makeAPICall;
}]);

angular.module('sdmD3Service', [])
    .factory('sdmD3Service', ['$document', '$q', '$rootScope',
        function($document, $q, $rootScope) {
            var d = $q.defer();
            var d3;
            function onScriptLoad() {
                // Load client in the browser
                $rootScope.$apply(function() { d3 = window.d3; d.resolve(window.d3); });
                var scriptTag = $document[0].createElement('script');
                scriptTag.type = 'text/javascript';
                scriptTag.async = true;
                scriptTag.src = 'utils/d3.geo.tile.v0.min.js';

                var s = $document[0].getElementsByTagName('body')[0];
                s.appendChild(scriptTag);
            }
            // Create a script tag with d3 as the source
            // and call our onScriptLoad callback when it
            // has been loaded
            var scriptTag = $document[0].createElement('script');
            scriptTag.type = 'text/javascript';
            scriptTag.async = true;
            scriptTag.src = '//cdnjs.cloudflare.com/ajax/libs/d3/3.5.5/d3.min.js';
            scriptTag.onreadystatechange = function () {
                if (this.readyState == 'complete') onScriptLoad();
            }
            scriptTag.onload = onScriptLoad;

            var s = $document[0].getElementsByTagName('body')[0];
            s.appendChild(scriptTag);

            return {
                init: function() { return d.promise },
                d3: function(){ return d3}
            };
        }]);

angular.module('sdmTextWidthCalculator', [])
    .factory('sdmTextWidthCalculator', function(){
        var cache = {};
        var calculator = function(content, fontSize, element) {
            element = element||'div';
            fontSize = fontSize||12;
            if (cache[content]&&cache[content][fontSize]&&cache[content][fontSize][element]){
                return cache[content][fontSize][element];
            }
            var testElement = document.createElement(element);
            testElement.innerHTML = content;
            testElement.setAttribute('style',
                'position: absolute; height: auto; width: auto; white-space: nowrap; ' +
                'letter-spacing:normal; font-weight: normal; visibility: hidden; ')
            testElement.style.fontSize = fontSize + 'px';
            document.body.appendChild(testElement);
            var width = testElement.clientWidth;
            document.body.removeChild(testElement);
            cache[content] = cache[content]||{};
            cache[content][fontSize] = cache[content][fontSize]||{};
            cache[content][fontSize][element] = width;
            return width;
        }
        return calculator;
    });

angular.module('newLinesFilter', [])
    .filter('newlines', function(){
        return function(text) {
            return text.replace(/\n/g, '<br/>');
        }
    });
