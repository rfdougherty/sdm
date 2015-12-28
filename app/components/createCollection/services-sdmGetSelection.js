'use strict';

angular.module('sdm.createCollection.services.sdmGetSelection', [
    'sdm.main.services.sdmViewManager', 'sdm.main.services.sdmDataManager'])
    .factory('sdmGetSelection', ['$q', '$location', 'sdmViewManager', 'sdmDataManager',
        function($q, $location, sdmViewManager, sdmDataManager) {

            var getSelection = function () {
                var deferred = $q.defer();
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
                var currentPath = $location.path();
                var iterator = sdmDataManager.breadthFirstFull(tree);
                var selection = [];
                var iterate = function () {
                    var element = iterator.next();
                    if (element) {
                        element.then(function(element){
                            if (element && element.checked) {
                                if (element.level.name === 'acquisitions') {
                                    if (currentPath === '/collections') {
                                        element.collection = element.parent.parent;
                                    }
                                    selection.push(element);
                                } else if (element.level.name === 'collections'){
                                    selection.collections = selection.collections || [];
                                    selection.collections.push(element);
                                }
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

            var _get_filename = function(file) {
                return file.filename
            }
            var _get_permalink = function(node) {
                var nodeURL = BASE_URL + node.level.name + '/' + node.id + '/file/';
                var f = function(file) {
                    return nodeURL + _get_filename(file)
                }
                return f
            }


            var _extract_data = {
                "projects": function(selection, node) {
                    var _node = node.data;
                    var data = {};
                    data.files = (_node.files || []).map(_get_filename);
                    data.urls = (_node.files || []).map(_get_permalink(node));
                    data.name = _node.name;
                    return data
                },
                "collections": function(selection, node) {
                    var _node = node.data;
                    var data = {};
                    data.files = (_node.files || []).map(_get_filename);
                    data.urls = (_node.files || []).map(_get_permalink(node));
                    data.name = _node.name;
                    return data
                },
                "sessions": function(selection, node) {
                    var _node = node.data;
                    var data = {};
                    data.files = (_node.files || []).map(_get_filename);
                    data.urls = (_node.files || []).map(_get_permalink(node));
                    data.subject_code = _node.subject.code;
                    data.subject_sex = _node.subject.sex;
                    data.subject_age = _node.subject.age;
                    data.project_id = _node.project_id;
                    return data
                },
                "acquisitions": function(selection, node) {
                    var _node = node.data;
                    var data = {};
                    data.files = (_node.files || []).map(_get_filename);
                    data.urls = (_node.files || []).map(_get_permalink(node));
                    data.description = _node.description;
                    data.series = node.name;
                    var parent_session = selection['sessions']?selection['sessions'][node.parent.id]:null;
                    if (parent_session) {
                        data.subject_code = parent_session.subject_code;
                        data.subject_sex =  parent_session.subject_sex;
                        data.subject_age =  parent_session.subject_age;
                    }
                    return data
                },
            }

            var getTreeData = function (tree, deferred) {
                var tree = tree || sdmViewManager.getCurrentViewData();
                deferred = deferred || $q.defer()
                var viewID = sdmViewManager.getCurrentView();
                var iterator = sdmDataManager.breadthFirstFullOnSelection(tree, viewID);
                var selection = {};
                var nodeInSelection = function(node) {
                    return node && (node.indeterminate || node.checked) && node.level.name.search(/^(sessions|projects|acquisitions|collections)$/) >= 0;
                };
                var iterate = function () {
                    var element = iterator.next();
                    if (element) {
                        element.then(function(node){
                            if (nodeInSelection(node)) {
                                var data =_extract_data[node.level.name](selection, node);
                                selection[node.level.name] = selection[node.level.name] || {};
                                selection[node.level.name][node.id] = data;
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

            return {
                getTreeData: getTreeData,
                getSelection: getSelection,
                getSelectionOnLevel: getSelectionOnLevel
            }
        }
    ]);
