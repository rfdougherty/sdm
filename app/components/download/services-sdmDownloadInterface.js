'use strict';

angular.module('sdm.download.services.sdmDownloadInterface',
    ['sdm.services'])
    .factory('sdmDownloadInterface', ['$q', 'makeAPICall',
        function($q, makeAPICall) {

            var getDownloadURL = function (selection, isSingleFile, optional) {
                var deferred = $q.defer(),
                    url, data, nodes;
                if (isSingleFile){
                    url = BASE_URL + [selection.level, selection._id, 'file'].join('/');
                    data = selection.file;
                } else {
                    url = BASE_URL + 'download';
                    nodes = selection.map(function(node) {
                            var level = node.level.name;
                            level = level.slice(0, level.length - 1);
                            return {
                                _id: node.id,
                                level: level
                            }
                        });
                    data = {
                        nodes: nodes,
                        optional: optional
                    };
                }

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
