'use strict';
var _tree;

(function(){

    var sdmViewManager = function($location, $q, makeAPICall, sdmDataManager) {
        var viewAppearances = {
            'data-layout': 'table',
            'editable': true
        };

        var viewData = {
            views: {
                'projects': {},
                'collections': {},
                'search': {},
                'upload': {},
                'admin': {}
            },
            'current': 'projects'
        };

        _tree = viewData;

        function getViewAppearance() {
            return viewAppearances;
        };

        function setCurrentView(viewID) {
            if (viewID) viewData.current = viewID;
            else {
                var currentPath = $location.path();
                viewData.current = currentPath.substring(1, currentPath.length);
            }
        }

        function getCurrentView() {
            return viewData.current;
        }

        function updateViewAppearanceKey(key, value) {
            viewAppearances[key] = value;
        }

        function updateViewAppearance(newViewAppearances) {
            angular.extend(viewAppearances, newViewAppearances);
        }

        function setData(viewID, data, _controller) {
            viewData.views[viewID].data = data;
            if (_controller) {
                viewData.views[viewID].controller = _controller;
            }
            if (viewData.views[viewID].controller) {
                viewData.views[viewID].controller.sdmData.data = data;
            }
        }

        function getData(viewID) {
            return viewData.views[viewID].data;
        }

        function getCurrentViewData() {
            return getData(viewData.current);
        }

        function setCurrentViewData(data, _controller) {
            setData(viewData.current, data, _controller);
        }

        function triggerViewChange(node, viewID) {
            viewID = viewID || viewData.current;
            var viewController = viewData.views[viewID].controller;
            if (viewController) {
                viewController.trigger = {
                    node: node,
                    sessionKey:  (viewController.trigger.sessionKey + 1)%10,
                    all: true
                }
            }
        }

        var refreshView = function(viewID) {
            var tree = viewID?getData(viewID):getCurrentViewData();
            var promise = sdmDataManager.refreshViewTree(tree, viewID);
            promise.then(function(){
                triggerViewChange(tree, viewID);
            });
            return promise;
        }

        var initializeView = function(viewDescription, viewID) {
            if (viewID === 'search' || viewID === 'admin') {
                return;
            }
            if (viewID === 'upload') {
                initializeUploadView();
                return;
            }
            var promise = sdmDataManager.treeInit(viewID);
            promise.then(function(result){
                console.log('initialized data for ', viewID, result);
                setData(viewID, result);
                return result
            });
            if (viewID === viewData.current) {
                promise.then(function(result) {
                    triggerViewChange(result);
                });
            }
        };



        var initialize = function() {
            angular.forEach(viewData.views, initializeView);
        };

        var buildSearchResults = function(queryResults, levelDescription, site_id) {
            console.log(queryResults);
            if (!queryResults.groups) {
                return [];
            }
            var levelName = 'groups';
            var level = levelDescription['groups'];
            var results = {};
            results[levelName] = {};
            angular.forEach(queryResults[levelName], function(value){
                console.log(value);
                var node = new DataNode(
                    {name: value},
                    site_id,
                    level);
                console.log(value);
                results[levelName][value] = node;
            });
            console.log(results);
            var prevLevelName = levelName;
            levelName = level.next_level;
            var parent, parent_id;
            while (levelName) {
                level = levelDescription[levelName];
                results[levelName] = {};
                angular.forEach(queryResults[levelName], function(value){
                    console.log(value);
                    var node = new DataNode(
                        value,
                        site_id,
                        level);
                    console.log(node);
                    results[levelName][value._id] = node;
                    parent_id = value[prevLevelName.slice(0, prevLevelName.length - 1)];
                    parent = results[prevLevelName][parent_id];
                    node.parent = parent;
                    parent.children = parent.children||[];
                    parent.children.push(node);
                });
                prevLevelName = levelName;
                levelName = level.next_level;
            }
            var groups = [];
            angular.forEach(results.groups, function(g) {
                groups.push(g);
            });
            return groups;
        };

        var searchAcquisitions = function(parameters) {
            var deferred = $q.defer();
            var search_url = BASE_URL + 'search';
            var sites_url = BASE_URL + 'sites';
            var viewID = 'search';
            var levelDescription = sdmDataManager.headers(viewID);
            makeAPICall.async(sites_url).then(function(sites){
                sites = sites.filter(function(s){return s.onload});
                var promises = sites.map(function(site) {
                    var deferred = $q.defer();
                    console.log(parameters);
                    makeAPICall.async(search_url, {site: site._id}, 'POST', parameters).then(function(results) {
                        var groups = buildSearchResults(results, levelDescription, site._id);
                        console.log(groups);
                        console.log(site);
                        var siteNode = new DataNode(
                            site,
                            site._id,
                            levelDescription['sites'],
                            groups
                        );
                        console.log(siteNode);
                        angular.forEach(groups, function(group) {
                            group.parent = siteNode;
                        });

                        deferred.resolve(siteNode);
                    });
                    return deferred.promise;
                });
                $q.all(promises).then(function(sites){
                    sites.sort(naturalSortByName);
                    var tree = new DataNode(
                            {name: 'root'},
                            null,
                            levelDescription['roots'],
                            sites
                        );
                    sites.forEach(
                        function(site, i){
                            site.index = i;
                            site.parent = tree;
                        });
                    sdmDataManager.sortTree(tree);
                    setData('search', tree);
                    triggerViewChange(tree);
                    deferred.resolve(tree);
                })
            });
            return deferred.promise;
        }

        var getSearchParameters = function() {
            if (!viewData.views.search.parameters) {
                viewData.views.search.parameters = {};
            }
            return viewData.views.search.parameters;
        }

        var getUploadData = function() {
            return viewData.views.upload.data
        }

        var getGroups = function() {
            makeAPICall.async(BASE_URL + 'projects/groups').then(function(groups){
                viewData.views.upload.data.groups = groups;
                viewData.views.upload.data.groups.forEach(function(group){
                    group.name = group.name||group._id
                });
                viewData.views.upload.data.groups.sort(naturalSortByName);
            });
        }

        var initializeUploadView = function() {
            if (!viewData.views.upload.data) {
                viewData.views.upload.data = {
                    series: {},
                    empty: true,
                    anonymize: true,
                    groups: [],
                    projects: []
                }
            }
            viewData.views.upload.data.selectedGroup = viewData.views.upload.data.selectedProject = null;
            getGroups();
        }

        return {
            getCurrentView: getCurrentView,
            setCurrentView: setCurrentView,
            getViewAppearance: getViewAppearance,
            updateViewAppearanceKey: updateViewAppearanceKey,
            updateViewAppearance: updateViewAppearance,
            getCurrentViewData: getCurrentViewData,
            setCurrentViewData: setCurrentViewData,
            refreshView: refreshView,
            initialize: initialize,
            searchAcquisitions: searchAcquisitions,
            getSearchParameters: getSearchParameters,
            getUploadData: getUploadData,
            triggerViewChange: triggerViewChange
        }
    }

    sdmViewManager.$inject = ['$location', '$q', 'makeAPICall', 'sdmDataManager'];

    angular.module('sdm.main.services.sdmViewManager',
        ['sdm.services', 'sdm.main.services.sdmDataManager'])
        .factory('sdmViewManager', sdmViewManager);
})();
