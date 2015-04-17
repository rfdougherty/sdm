'use strict';
var _tree;

(function(){

    var projectsViewDescription = (function(){
        function objectAccessor(field){
            return function (o){
                return o[field];
            }
        };

        var roots = {
            name: 'roots',
            next_level: 'sites',
            properties: {
            },
            urlToExpand: function (node){
                console.log('site', node);
                return {
                    path: 'sites'
                }
            }
        };

        var sites = {
            name: 'sites',
            next_level: 'groups',
            properties: {
                name: objectAccessor('name')
            },
            headers: ['Site'],
            urlToExpand: function (node){
                return {
                    path: 'projects/groups'
                }
            }
        };

        var groups = {
            name: 'groups',
            next_level: 'projects',
            properties: {
                name: function(node){
                    return node.name || node._id
                }
            },
            headers: ['Group'],
            urlToExpand: function (node) {
                return {
                    path: 'projects',
                    params: {group: node.id}
                }
            }
        };

        var projects = {
            name: 'projects',
            next_level: 'sessions',
            properties: {
                name: objectAccessor('name')
            },
            headers: ['Project'],
            urlToExpand: function (node) {
                return {
                    path: 'projects/' + node.id + '/sessions'
                }
            },
            getModalData: function (node, apiData) {
                return [
                    ['Name', node.name],
                    ['Group', node.parent.name]
                ]
            }
        };

        var sessions = {
            name: 'sessions',
            next_level: 'acquisitions',
            properties: {
                name: objectAccessor(['label']),
                subject:
                    function(o){
                        if (!o.subject) {
                            return '';
                        }
                        return o.subject.code;
                    }
            },
            headers: ['Session', 'Subject'],
            urlToExpand: function (node) {
                return {
                    path: 'sessions/' + node.id + '/acquisitions'
                }
            },
            getModalData: function (node, apiData) {
                return [
                    ['Name', node.name],
                    ['Subject', node.subject]
                ]
            }
        };

        var acquisitions = {
            name: 'acquisitions',
            properties: {
                name: objectAccessor('label'),
                description: objectAccessor('description'),
                'data type': function (o){
                    if (!o.types) {
                        return '';
                    }
                    return o.types.map(function(d){
                        return d.kind
                    }).join(', ');
                }
            },
            headers: ['Acquisition', 'Description', 'Data Type'],
            urlToExpand: function (node) {
                return;
            },
            getModalData: function (node, apiData) {
                return [
                    ['Name', node.name],
                    ['Description', node.description],
                    ['Data Type', node['data type']]
                ]
            }
        }

        return {
            roots: roots,
            sites: sites,
            groups: groups,
            projects: projects,
            sessions: sessions,
            acquisitions: acquisitions
        }
    })();

    var collectionsViewDescription = (function(){
        function objectAccessor(field){
            return function (o){
                return o[field];
            }
        };

        var roots = {
            name: 'roots',
            next_level: 'sites',
            properties: {
            },
            urlToExpand: function (node){
                console.log('site', node);
                return {
                    path: 'sites'
                }
            }
        };

        var sites = {
            name: 'sites',
            next_level: 'curators',
            properties: {
                name: objectAccessor('name')
            },
            headers: ['Site'],
            urlToExpand: function (node){
                return {
                    path: 'collections/curators'
                }
            }
        };

        var curators = {
            name: 'curators',
            next_level: 'collections',
            properties: {
                name: function (curator) {
                    if (curator.firstname || curator.lastname) {
                        return (curator.firstname + ' ' + curator.lastname).trim();
                    } else {
                        return curator._id || 'anonymous';
                    }
                }
            },
            headers: ['Curator'],
            urlToExpand: function (node){
                console.log('curator', node);
                return {
                    path: 'collections',
                    params: {curator: node.id}
                }
            }
        };

        var collections = {
            name: 'collections',
            next_level: 'sessions',
            properties: {
                name: objectAccessor('name')
            },
            headers: ['Collection'],
            urlToExpand: function (node) {
                return {
                    path: 'collections/' + node.id + '/sessions'
                }
            },
            getModalData: function (node, apiData) {
                return [
                    ['Name', node.name],
                    ['Curator', node.parent.name]
                ]
            }
        };

        var sessions = {
            name: 'sessions',
            next_level: 'acquisitions',
            properties: {
                name: objectAccessor(['label']),
                subject:
                    function(o){
                        if (!o.subject) {
                            return '';
                        }
                        return o.subject.code;
                    }
            },
            headers: ['Session', 'Subject'],
            urlToExpand: function (node){
                return {
                    path: 'collections/' + node.parent.id + '/acquisitions',
                    params: {session: node.id}
                }
            },
            getModalData: function (node, apiData) {
                return [
                    ['Name', node.name],
                    ['Subject', node.subject]
                ]
            }
        };

        var acquisitions = {
            name: 'acquisitions',
            properties: {
                name: objectAccessor('label'),
                description: objectAccessor('description'),
                'data type': function (o){
                    if (!o.types) {
                        return '';
                    }
                    return o.types.map(function(d){
                        return d.kind
                    }).join(', ');
                }
            },
            headers: ['Acquisition', 'Description', 'Data Type'],
            urlToExpand: function (node){
                return;
            },
            getModalData: function (node, apiData) {
                return [
                    ['Name', node.name],
                    ['Description', node.description],
                    ['Data Type', node['data type']]
                ]
            }
        }

        return {
            roots: roots,
            sites: sites,
            curators: curators,
            collections: collections,
            sessions: sessions,
            acquisitions: acquisitions
        }
    })();

    var searchViewDescription = angular.copy(projectsViewDescription);
    angular.forEach(searchViewDescription, function(levelDescription){
        delete levelDescription.urlToExpand;
    });

    var sdmViewManager = function($location, $q, makeAPICall) {
        var viewAppearances = {
            'data-layout': 'table',
            'editable': true
        };

        var viewData = {
            views: {
                'projects': {'viewDescription': projectsViewDescription},
                'collections': {'viewDescription': collectionsViewDescription},
                'search': {'viewDescription': searchViewDescription},
                'upload': {}
            },
            'current': 'projects'
        };

        _tree = viewData;

        function getViewAppearance() {
            return viewAppearances;
        };

        function setCurrentView() {
            var currentPath = $location.path();
            viewData.current = currentPath.substring(1, currentPath.length);
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

        function triggerViewChange(node) {
            var viewController = viewData.views[viewData.current].controller;
            if (viewController) {
                viewController.trigger = {
                    node: node,
                    sessionKey:  (viewController.trigger.sessionKey + 1)%10,
                    all: true
                }
            }
        }

        function headers (viewID) {
            if (viewID) {
                return viewData.views[viewID].viewDescription;
            } else {
                return viewData.views[viewData.current].viewDescription;
            }
        };

        function refreshView(viewID) {
            var iterator;
            var tree = viewID?getData(viewID):getCurrentViewData();
            var deferred = $q.defer();
            if (!tree) {
                deferred.resolve();
                return deferred.promise;
            }
            iterator = breadthFirstRefresh(tree, viewID);

            var iterate = function() {
                var element = iterator.next();
                if (element) {
                    element.then(function(element){
                        if (element && element.checked) {
                            _updateCountersParent(element);
                        }
                        iterate();
                    });
                } else {
                    triggerViewChange(tree);
                    deferred.resolve();
                }
            };
            iterate();
            return deferred.promise;
        };

        function refreshCurrentView() {
            return refreshView(viewData['current']);
        }

        var _updateCountersParent = function(node) {
            /*
            ** used in refreshView to update counts
            */
            var parentChildren;
            var stopWhile = false;
            while (node.parent && !stopWhile) {
                parentChildren = node.parent.children || node.parent._children;
                if (node.parent.checked) {
                    return;
                } else if (node.checked) {
                    node.parent.childrenChecked += 1;
                    if (node.parent.childrenChecked === parentChildren.length){
                        node.parent.checked = true;
                    } else {
                        if (node.parent.indeterminate) {
                            stopWhile = true;
                        } else {
                            node.parent.indeterminate = true;
                        }

                    }
                } else if (!node.parent.indeterminate) {
                    node.parent.childrenIndeterminate += 1;
                    node.parent.indeterminate = true;
                } else {
                    node.parent.childrenIndeterminate += 1;
                    stopWhile = true;
                }
                node = node.parent;
            }
        }

        var treeInit = function(viewID) {
            var deferred = $q.defer();
            var sites_url = BASE_URL + 'sites';
            var levelDescription = headers(viewID);
            makeAPICall.async(sites_url).then(
                function(sites){
                    var promises =
                        sites.map(function(site, i){
                            var deferredSite = $q.defer();
                            var siteNode = new DataNode(
                                site,
                                site._id,
                                levelDescription['sites']
                            );

                            if (site.onload) {
                                getChildrenFromAPI(siteNode, $q.defer(), viewID).then(
                                    function(children){
                                        children.forEach(function (child) {
                                            child.checked = siteNode.checked;
                                        });
                                        siteNode.children = children;
                                        siteNode._children = null;
                                        siteNode.hasData = siteNode.children&&siteNode.children.length?true:false;
                                        deferredSite.resolve(siteNode);
                                    });
                            } else {
                                siteNode.isLeaf = true;
                                deferredSite.resolve(siteNode);
                            }
                            return deferredSite.promise
                        });
                    $q.all(promises).then(function(sites){
                        sites.sort(naturalSortByName);
                        sites.forEach(
                            function(site, i){
                                site.index = i;
                            });
                        deferred.resolve(
                            new DataNode(
                                {name: 'root'},
                                null,
                                levelDescription['roots'],
                                sites
                            )
                        );
                    })
                });
            return deferred.promise;
        };

        var initializeView = function(viewDescription, viewID) {
            if (viewID === 'search' || viewID === 'upload') {
                return;
            }
            var promise = treeInit(viewID);
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
            var levelDescription = headers(viewID);
            makeAPICall.async(sites_url).then(function(sites){
                sites = sites.filter(function(s){return s.onload});
                var tree =  new DataNode(
                    {name: 'root'},
                    null,
                    levelDescription['roots'],
                    sites
                );
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
                    sites.forEach(
                        function(site, i){
                            site.index = i;
                        });
                    var tree = new DataNode(
                            {name: 'root'},
                            null,
                            levelDescription['roots'],
                            sites
                        );
                    sortTree(tree);
                    setData('search', tree);
                    triggerViewChange(tree);
                    deferred.resolve(tree);
                })
            });
            return deferred.promise;
        }

        var sortTree = function(tree) {
            var queue = [tree];
            var node, _children;

            while (queue.length > 0) {
                node = queue.pop();
                if (node.children || node._children) {
                    _children = node.children || node._children;
                    _children.sort(naturalSortByName);
                    _children.forEach(function(child, i) {
                        child.index = i;
                        queue.unshift(child);
                    });
                    if (node.children) {
                        node.children = _children;
                    } else {
                        node._children = _children;
                    }
                }
            }
        };

        var getSearchParameters = function() {
            if (!viewData.views.search.parameters) {
                viewData.views.search.parameters = {};
            }
            return viewData.views.search.parameters;
        }

        var getUploadData = function() {
            if (!viewData.views.upload.data) {
                viewData.views.upload.data = {
                    series: {},
                    empty: true,
                    anonymize: true,
                    selectedProject: null,
                    selectedGroup: null,
                    groups: [],
                    projects: []
                }
            }
            return viewData.views.upload.data
        }

        /*
        ** Breadth first traversal method with cusomt node expansion.
        **
        ** IMPORTANT:
        ** It doesn't modify the tree if getChildren doesn't modify the input node.
        ** It can be used to modify the tree in place.
        */
        var breadthFirstAsync = function (tree, getChildren) {
            var queue = [{node: tree}];
            function next() {
                var nextDeferred = $q.defer();
                var nodeOrPromise = queue.pop();
                if (typeof nodeOrPromise === 'undefined') {
                    return;
                }
                if (nodeOrPromise.node) {
                    queue.unshift(
                        {
                            promise: getChildren(nodeOrPromise.node),
                            checked: nodeOrPromise.node.checked,
                            parent: nodeOrPromise.node
                        }
                    );
                    nextDeferred.resolve(nodeOrPromise.node);
                } else if (nodeOrPromise.promise) {
                    nodeOrPromise.promise.then(function(children){
                        if (children && children.length) {
                            children.forEach(function(child, i){
                                child.checked = child.checked || nodeOrPromise.checked;
                                child.parent = nodeOrPromise.parent;
                                if (i !== 0) {
                                    queue.unshift({node: child});
                                }
                            });
                            queue.unshift({
                                promise: getChildren(children[0]),
                                checked: children[0].checked,
                                parent: children[0]
                            });
                            nextDeferred.resolve(children[0]);
                        } else {
                            nextDeferred.resolve();
                        }
                    });
                } else {
                    nextDeferred.reject('Error in breadthFirstAsync');
                    throw 'Error in breadthFirstAsync';
                }
                return nextDeferred.promise;
            }
            return {
                next: next
            }
        };

        /*
        ** get a full tree expansion from the API and from the local tree expansion.
        **
        ** IMPORTANT:
        ** It doesn't modify the tree. See comments on breadthFirstAsync, getAllChildren and getChildrenFromAPI.
        */
        var breadthFirstFull = function(tree, viewID) {
            var getChildren = function (node){
                return getAllChildren(node, viewID);
            };
            return breadthFirstAsync(tree, getChildren);
        };

        var breadthFirstExpandCheckedGroups = function(tree, viewID) {
            var getChildren = function (node, viewID) {
                var deferred = $q.defer();
                if (node.level.name === 'groups' && node.checked) {
                    return getAllChildren(node, viewID, deferred);
                } else {
                    deferred.resolve(node.children || node._children);
                    return deferred.promise;
                }
            }
            return breadthFirstAsync(tree, getChildren);
        }

        /*
        ** get a full tree expansion until levelName from the API and from the local tree expansion.
        **
        ** IMPORTANT:
        ** It doesn't modify the tree. See comments on breadthFirstAsync, getAllChildren and getChildrenFromAPI.
        */
        var breadthFirstFullUntilLevel = function(tree, viewID, levelName) {
            var getChildren = function (node){
                return getAllChildrenUntilLevel(node, viewID, levelName);
            };
            return breadthFirstAsync(tree, getChildren);
        };

        /*
        ** refresh all the children of the expanded nodes
        **
        ** IMPORTANT:
        ** It DOES modify the tree in place. See comments on breadthFirstAsync and refreshChildren.
        */
        var breadthFirstRefresh = function(tree, viewID) {
            var getChildren = function (node){
                return refreshChildren(node, viewID);
            };
            return breadthFirstAsync(tree, getChildren);
        };

        /*
        ** get all nodes from the API and from the local tree expansion.
        **
        ** IMPORTANT:
        ** It doesn't modify the node. See comment on getChildrenFromAPI.
        */
        var getAllChildren = function (node, viewID, deferred) {
            deferred = deferred || $q.defer();
            var children = node.children&&node.children.length?node.children:node._children;
            if (children && children.length) {
                deferred.resolve(children);
                return deferred.promise;
            } else {
                return getChildrenFromAPI(node, deferred, viewID);
            }
        };

        var getAllChildrenUntilLevel = function (node, viewID, levelName) {
            var deferred = $q.defer();
            if (node.level.name === levelName) {
                deferred.resolve();
                return deferred.promise
            } else {
                return getAllChildren(node, viewID, deferred);
            }
        };



        /*
        ** refresh all the children of the node if the node is expanded.
        **
        ** IMPORTANT:
        ** It does modify the node in place.
        */
        var refreshChildren = function (node, viewID) {
            var isCheckedOrIndeterminate = node.childrenChecked + node.childrenIndeterminate > 0
            node.childrenIndeterminate = 0;
            node.childrenChecked  = 0;
            var deferred = $q.defer();

            if (node.level.name === 'acquisitions'){
                deferred.resolve();
                return deferred.promise;
            }

            if (node.children) {
                var promise = getChildrenFromAPI(node, deferred, viewID);
                promise.then(function(children){
                    updateChildrenList(node.children, children, node.level.name);
                    node.children = children;
                    node._children = null;
                    node.childrenChecked = node.checked?children.length:0;
                    node.hasData = !!children.length;
                    return children;
                });
                return promise;
            } else if (node._children && !isCheckedOrIndeterminate) {
                node._children = null;
                deferred.resolve();
                return deferred.promise;
            } else if (node._children) {
                promise = getChildrenFromAPI(node, deferred, viewID);
                promise.then(function(children){
                    updateChildrenList(node._children, children, node.level.name);
                    node._children = children;
                    node.children = null;
                    node.childrenChecked = node.checked?children.length:0;
                    return children;
                });
                return promise;
            } else if (!node.hasData) {
                var promise = getChildrenFromAPI(node, deferred, viewID);
                promise.then(function(children){
                    if (node.children) {
                        updateChildrenList(node.children, children, node.level.name);
                    }
                    node.children = children;
                    node._children = null;
                    node.childrenChecked = node.checked?children.length:0;
                    node.hasData = !!children.length;
                    return children;
                });
                return promise;
            } else {
                deferred.resolve();
                return deferred.promise;
            }
        };

        /**
         ** modify newList children adding them from existing nodes in oldList
         **/
        var updateChildrenList = function(oldList, newList, levelName) {
            var i = 0;
            var j = 0;
            while (true) {
                if (i >= oldList.length || j >= newList.length) {
                    return;
                }
                var greaterThan = naturalSortByName(oldList[i], newList[j]);
                if (levelName.search(/^(projects|collections)$/) >= 0) {
                    greaterThan *= -1;
                }
                if (greaterThan === 0) {
                    if (!oldList[i].id || oldList[i].id === newList[j].id) {
                        newList[j].children = oldList[i].children;
                        newList[j]._children = oldList[i]._children;
                        newList[j].checked = oldList[i].checked;
                        newList[j].hasData = oldList[i].hasData;
                    }
                    i++;
                    j++;
                } else if (greaterThan < 0) {
                    i++;
                } else {
                    j++;
                }
            }
        };

        /*
        ** DESCRIPTION:
        ** Get children of the node from the API and return the result wrapped in a promise.
        **
        ** IMPORTANT:
        ** it doesn't modify the input node. (if node.level.urlToExpand doesn't modify it!)
        */
        var getChildrenFromAPI = function(node, deferred, viewID) {
            var levelDescription = headers(viewID);
            if (typeof node.level.next_level === 'undefined'){
                deferred.resolve();
                return deferred.promise;
            }
            if (!node.level.urlToExpand) {
                deferred.resolve([]);
                return deferred.promise;
            }
            var urlToExpand = node.level.urlToExpand(node);
            urlToExpand.params = urlToExpand.params || {};
            urlToExpand.params.site = node.site;

            var promise = makeAPICall.async(BASE_URL + urlToExpand.path, urlToExpand.params);

            promise.then(
                function(result){
                    if (!result.length) {
                        deferred.resolve(result);
                        return;
                    }
                    var isRoot = node.level.name ==='roots';
                    var _children = result.map(
                        function(childData){
                            return new DataNode(
                                childData,
                                isRoot?childData._id:node.site,
                                levelDescription[node.level.next_level]
                                )
                        });
                    if (node.level.name !== 'projects' && node.level.name !== 'collections') {
                        _children.sort(naturalSortByName);
                    } else {
                        _children.sort(function(a, b){
                            if (!a.name){
                                return +1;
                            } else if (!b.name) {
                                return -1;
                            }
                            return naturalSortByName(b, a)
                        });
                    }

                    _children.forEach(function (child, i) {
                        child.index = i;
                    });
                    deferred.resolve(_children);
                }, function(reason){
                    console.log(reason);
                    deferred.reject(reason);
                });
            return deferred.promise;

        };


        var expandNode = function(node) {
            var deferred = $q.defer();
            var newNode = angular.copy(node);
            var promise;
            node.parent.children[node.index] = newNode;
            node = newNode;
            if (node.key) node.key++;
            if (node.children) {
                node._children = node.children;
                node.children = null;
                deferred.resolve();
                promise = deferred.promise;
            } else if (node._children){
                node.children = node._children;
                node._children = null;
                deferred.resolve();
                promise = deferred.promise;
            } else {
                promise = getChildrenFromAPI(node, deferred);
                promise.then(function(children){
                    children.forEach(function (child) {
                        child.checked = node.checked;
                    });
                    node.childrenChecked = node.checked?children.length:0;
                    node.childrenIndeterminate = 0;
                    node.children = children;
                    node._children = null;
                    node.hasData = node.children&&node.children.length?true:false;
                });
            }
            promise.finally(function(){
                triggerViewChange(newNode);
            });
            return promise;
        };

        return {
            setCurrentView: setCurrentView,
            getViewAppearance: getViewAppearance,
            updateViewAppearanceKey: updateViewAppearanceKey,
            updateViewAppearance: updateViewAppearance,
            setData: setData,
            getData: getData,
            getCurrentViewData: getCurrentViewData,
            setCurrentViewData: setCurrentViewData,
            refreshView: refreshView,
            refreshCurrentView: refreshCurrentView,
            treeInit: treeInit,
            expandNode: expandNode,
            headers: headers,
            breadthFirstFull: breadthFirstFull,
            initialize: initialize,
            searchAcquisitions: searchAcquisitions,
            breadthFirstFullUntilLevel: breadthFirstFullUntilLevel,
            breadthFirstExpandCheckedGroups: breadthFirstExpandCheckedGroups,
            getSearchParameters: getSearchParameters,
            getUploadData: getUploadData
        }
    }

    sdmViewManager.$inject = ['$location', '$q', 'makeAPICall'];

    angular.module('sdm.main.services.sdmViewManager',
        ['sdm.services'])
        .factory('sdmViewManager', sdmViewManager);
})();
