'use strict';
var _deferred;
angular.module('sdm.download.services.sdmDownloadInterface',
    ['sdm.services'])
    .factory('sdmDownloadInterface', ['$q', 'makeAPICall',
        function($q, makeAPICall, sdmHumanReadableSize) {

            var getDownloadURL = function (selection, isSingleFile) {
                var deferred = $q.defer(),
                    url, nodes, sites;
                if (isSingleFile){
                    url = BASE_URL + [selection.level, selection._id, 'file'].join('/');
                    data = selection.file;
                } else {
                    url = BASE_URL + 'download';
                    sites = {}
                    selection.forEach(function(node) {
                        var level = node.level.name;
                        level = level.slice(0, level.length - 1);
                        sites[node.site] = sites[node.site]||[]

                        sites[node.site].push({
                            _id: node.id,
                            level: level
                        });
                    });
                }
                var promises = [];
                angular.forEach(sites, function(nodes, site){
                    var p = makeAPICall.async(url, {site:site}, 'POST', {nodes: nodes, optional: false})
                        .then(function(response) {
                            //response.size = sdmHumanReadableSize(response.size);
                            //response.site = site;
                            response.url = BASE_URL + 'download?ticket=' + response.ticket;
                            response.url += '&site=' + site;
                            response.site = site;
                            return response;
                        });
                    promises.push(p);
                });
                $q.all(promises).then(function(responses){
                    deferred.resolve(responses);
                });
                return deferred.promise;
            }

            return {
                getDownloadURL: getDownloadURL
            }
        }
    ]);
