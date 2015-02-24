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
    })();;

    var sdmViewManager = function($location, $q, makeAPICall) {
        var viewAppearances = {
            'data-layout': 'table',
            'editable': true
        };

        var viewData = {
            views: {
                'projects': {'viewDescription': projectsViewDescription},
                'collections': {'viewDescription': collectionsViewDescription}
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
            viewController.trigger = {
                node: node,
                sessionKey:  (viewController.trigger.sessionKey + 1)%10,
                all: true
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

        var initialize = function() {
            var currentView = viewData.current;
            //var deferred = $q.defer();

            angular.forEach(viewData.views, function(value, viewID){
                var promise = treeInit(viewID);
                promise.then(function(result){
                    console.log('initialized data for ', viewID, result);
                    setData(viewID, result);
                    return result
                });
                if (viewID === currentView) {
                    promise.then(function(result) {
                        triggerViewChange(result);
                    });
                }
            });
        };

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
            breadthFirstFullUntilLevel: breadthFirstFullUntilLevel
        }
    }

    sdmViewManager.$inject = ['$location', '$q', 'makeAPICall'];

    angular.module('sdm.main.services.sdmViewManager',
        ['sdm.services'])
        .factory('sdmViewManager', sdmViewManager);
})();
