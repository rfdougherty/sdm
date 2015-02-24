'use strict';

angular.module('sdm.createCollection.services.sdmGetSelection', [
    'sdm.dataFiltering.services.sdmFilterTree',
    'sdm.main.services.sdmViewManager'])
    .factory('sdmGetSelection', ['$q', 'sdmViewManager', 'sdmFilterTree',
        function($q, sdmViewManager, sdmFilterTree) {

            var getSelection = function () {
                var deferred = $q.defer();
                var selection;
                var data = sdmViewManager.getCurrentViewData();
                if (sdmFilterTree.viewID === 'collections') {
                    getSelectionInCollections(data, deferred);
                } else if (sdmFilterTree.viewID === 'projects'){
                    selection = getSelectionInProjects(data);
                    deferred.resolve(selection);
                }
                return deferred.promise;
            };

            var getSelectionInProjects = function (tree) {
                var selected = [];
                var action = function (node) {
                    var nodeInSelection = function(node){
                        return node.checked && node.level.name.search(/^(sessions|projects|acquisitions)$/) >= 0;
                    };
                    if (nodeInSelection(node) && (!node.parent || !nodeInSelection(node.parent))) {
                        selected.push(node);
                    }
                }
                var iterator = sdmFilterTree.depthFirst(tree);
                var node = iterator.next();
                while (!node.done){
                    action(node.value);
                    node = iterator.next();
                }
                return selected;
            };

            var getSelectionInCollections = function (tree, deferred) {
                deferred = deferred || $q.defer()
                var iterator = sdmViewManager.breadthFirstFull(tree);
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
                var iterator = sdmViewManager.breadthFirstFullUntilLevel(tree, 'projects', levelName);
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
