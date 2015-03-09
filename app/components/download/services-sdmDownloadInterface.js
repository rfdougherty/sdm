'use strict';

angular.module('sdm.download.services.sdmDownloadInterface',
    ['sdm.services', 'sdm.util.services.sdmHumanReadableSize'])
    .factory('sdmDownloadInterface', ['$q', 'makeAPICall', 'sdmHumanReadableSize',
        function($q, makeAPICall, sdmHumanReadableSize) {

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
                        optional: optional || false
                    };
                }
                console.log(data);
                makeAPICall.async(url, null, 'POST', data).then(function(response){
                    response.size = sdmHumanReadableSize(response.size);
                    deferred.resolve(response);
                });
                return deferred.promise;
            }

            return {
                getDownloadURL: getDownloadURL
            }
        }
    ]);
