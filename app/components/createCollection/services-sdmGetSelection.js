'use strict';

angular.module('sdm.createCollection.services.sdmGetSelection', [
    'sdm.main.services.sdmViewManager', 'sdm.main.services.sdmDataManager'])
    .factory('sdmGetSelection', ['$q', '$location', 'sdmViewManager', 'sdmDataManager',
        function($q, $location, sdmViewManager, sdmDataManager) {

            var getSelection = function () {
                var deferred = $q.defer();
                var selection;
                var data = sdmViewManager.getCurrentViewData();
                var currentPath = $location.path();
                if (currentPath === '/collections' || currentPath === '/search') {
                    getSelectionInCollectionsOrSearch(data, deferred);
                } else if (currentPath === '/projects'){
                    getSelectionInProjects(data, deferred);
                }
                return deferred.promise;
            };

            var getSelectionInProjects = function (tree, deferred) {
                deferred = deferred || $q.defer()
                var iterator = sdmDataManager.breadthFirstExpandCheckedGroups(tree, 'projects');
                var selection = [];
                var nodeInSelection = function(node) {
                    return node && node.checked && node.level.name.search(/^(sessions|projects|acquisitions)$/) >= 0;
                };
                var iterate = function () {
                    var element = iterator.next();
                    if (element) {
                        element.then(function(node){
                            if (nodeInSelection(node) && (!node.parent || !nodeInSelection(node.parent))) {
                                selection.push(node);
                            }
                            iterate();
                        });
                    } else {
                        deferred.resolve(selection);
                    }
                };
                iterate();
                return deferred.promise;
            };

            var getSelectionInCollectionsOrSearch = function (tree, deferred) {
                deferred = deferred || $q.defer()
                var iterator = sdmDataManager.breadthFirstFull(tree);
                var selection = [];
                var iterate = function () {
                    var element = iterator.next();
                    if (element) {
                        element.then(function(element){
                            if (element && element.checked && element.level.name === 'acquisitions') {
                                selection.push(element);
                            }
                            iterate();
                        });
                    } else {
                        deferred.resolve(selection);
                    }
                };
                iterate();
                return deferred.promise;
            }

            var _getSelectionOnLevel = function (tree, levelName, deferred) {
                deferred = deferred || $q.defer();
                var selection = [];
                var iterator = sdmDataManager.breadthFirstFullUntilLevel(tree, 'projects', levelName);
                var iterate = function() {
                    var element = iterator.next();
                    if (element){
                        element.then(function(element){
                            if (element && element.level.name === levelName && element.checked) {
                                selection.push(element);
                            }
                            iterate();
                        });
                    } else {
                        deferred.resolve(selection);
                    }
                };
                iterate();
                return deferred.promise;
            };

            var getSelectionOnLevel = function(levelName) {
                var data = sdmViewManager.getCurrentViewData();
                return _getSelectionOnLevel(data, levelName);
            };

            return {
                getSelection: getSelection,
                getSelectionOnLevel: getSelectionOnLevel
            }
        }
    ]);
