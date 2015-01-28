'use strict';

angular.module('sdm.download.services.sdmDownloadInterface',
    ['sdm.createCollection.services.sdmGetSelection', 'sdm.services'])
    .factory('sdmDownloadInterface', ['$q', 'makeAPICall',
        function($q, makeAPICall) {

            var getDownloadURL = function (selection, isSingleFile, optional) {
                var deferred = $q.defer();
                var url = BASE_URL + 'download';
                var nodes = isSingleFile?[selection]:selection.map(function(node) {
                        var level = node.level.name;
                        level = level.slice(0, level.length - 1);
                        return {
                            _id: node.id,
                            level: level
                        }
                    });
                var data = {
                    type: isSingleFile?'single':'archive',
                    nodes: nodes,
                    optional: optional
                };
                makeAPICall.async(url, null, 'POST', data).then(function(response){
                    deferred.resolve(response.url);
                });
                return deferred.promise;
            }

            return {
                getDownloadURL: getDownloadURL
            }
        }
    ]);
