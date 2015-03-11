'use strict';

angular.module('sdm.createCollection.services.sdmGetSelection', [
    'sdm.main.services.sdmViewManager'])
    .factory('sdmGetSelection', ['$q', '$location', 'sdmViewManager',
        function($q, $location, sdmViewManager) {

            var getSelection = function () {
                var deferred = $q.defer();
                var selection;
                var data = sdmViewManager.getCurrentViewData();
                var currentPath = $location.path();
                if (currentPath === '/collections') {
                    getSelectionInCollections(data, deferred);
                } else if (currentPath === '/projects'){
                    getSelectionInProjects(data, deferred);
                }
                return deferred.promise;
            };

            var getSelectionInProjects = function (tree, deferred) {
                deferred = deferred || $q.defer()
                var iterator = sdmViewManager.breadthFirstExpandCheckedGroups(tree, 'projects');
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
/*                var selected = [];
                var action = function (node) {
                    var nodeInSelection = function(node){
                        return node.checked && node.level.name.search(/^(sessions|projects|acquisitions)$/) >= 0;
                    };
                    if (nodeInSelection(node) && (!node.parent || !nodeInSelection(node.parent))) {
                        selected.push(node);
                    }
                }
                var iterator = _fullDepthFirst(tree);
                var node = iterator.next();
                while (!node.done){
                    action(node.value);
                    node = iterator.next();
                }
                return selected;
            };

            var _fullDepthFirst = function(tree) {
                var elements = [tree];
                function next() {
                    var children;
                    var node = elements.pop();
                    if (typeof node === 'undefined') {
                        return {done: true};
                    } else if (children = node._children || node.children) {
                        for (var i = 0; i < children.length; i++) {
                            elements.push(children[i]);
                        }
                    }
                    return {
                        value: node,
                        done: false
                    }
                }
                return {
                    next: next
                };
            };
*/
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
