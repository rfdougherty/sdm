'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
var nimsServices = angular.module('sdm.services', ['sdmHttpServices', 'sdmD3Service']).
value('version', '0.11');

var httpServices = angular.module('sdmHttpServices', ['ngCookies', 'sdm.authentication.services.sdmUserManager']);

httpServices.factory('makeAPICall', ['$http', '$cookieStore', 'sdmUserManager', function($http, $cookieStore, sdmUserManager) {

    var makeAPICall = {
        async: function(url, params, method, data, iter) {
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
                headers: {'Authorization': accessToken},
                params: params
            };
            if (typeof data !== 'undefined') {
                requestParams.data = data;
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
                if (reason.status == '401' && (typeof iter === 'undefined' || iter < 2)) {
                    iter = typeof iter === 'undefined'?1:iter + 1;
                    return sdmUserManager.authenticate();
                }
                if (reason.status == '401' && typeof iter !== 'undefined') {
                    console.log('authentication: reached maximum number of iterations');
                    return {data: []};
                }
                if (reason.status == '404') {
                    console.log("there is probably something wrong with the url or the server is unavailable");
                    return {data: []};
                }
                console.log('Unhandled problem in the request.');
                console.log('Status:', reason.status);
                console.log('Reason', reason);
                return {data: []};
            }).then(function(value) {
                if (value.data) {
                    return value.data;
                } else {
                    return makeAPICall.async(url, params, method, data, iter);
                }
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
            function onScriptLoad() {
                // Load client in the browser
                $rootScope.$apply(function() { d.resolve(window.d3); });
            }
            // Create a script tag with d3 as the source
            // and call our onScriptLoad callback when it
            // has been loaded
            var scriptTag = $document[0].createElement('script');
            scriptTag.type = 'text/javascript';
            scriptTag.async = true;
            scriptTag.src = '//cdnjs.cloudflare.com/ajax/libs/d3/3.4.13/d3.min.js';
            scriptTag.onreadystatechange = function () {
                if (this.readyState == 'complete') onScriptLoad();
            }
            scriptTag.onload = onScriptLoad;

            var s = $document[0].getElementsByTagName('body')[0];
            s.appendChild(scriptTag);

            return {
                d3: function() { return d.promise; }
            };
        }]);
