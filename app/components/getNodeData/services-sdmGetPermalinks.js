'use strict';

(function() {

    angular.module('sdm.getNodeData.services.sdmGetPermalinks', ['sdm.main.services.sdmDataManager'])
        .factory('sdmGetPermalinks', ['$q', 'sdmDataManager', function($q, sdmDataManager) {
            var sdmGetPermalinks = function(node) {
                var deferred = $q.defer();
                var iterator = sdmDataManager.breadthFirstFull(node);
                var selection = [];
                var iterate = function() {
                    var element = iterator.next();
                    if (element) {
                        element.then(function(element) {
                            if (element && element.files) {
                                var elementURL = BASE_URL + element.level.name + '/' + element.id + '/file/';
                                element.files.forEach(function(file) {
                                    selection.push(elementURL + file.filename + '?user=\n');
                                });
                            }
                            iterate();
                        });
                    } else {
                        deferred.resolve(selection);
                    }
                }
                iterate();
                return deferred.promise;
            }
            return sdmGetPermalinks;
        }]);
})()
