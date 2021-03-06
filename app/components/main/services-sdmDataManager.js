'use strict';

(function() {

    var sdmDataManager = function($location, $q, makeAPICall, sdmLevelDescriptions) {

        function headers(viewID) {
            if (viewID){
                return sdmLevelDescriptions[viewID];
            } else {
                var _viewID = $location.path();
                _viewID = _viewID.substring(1, _viewID.length)
                return sdmLevelDescriptions[_viewID];
            }
        };

        var _headerTitles = {};

        var getHeaderTitles = function(viewID) {
            if (_headerTitles[viewID]){
                return _headerTitles[viewID];
            }
            var _headers = headers(viewID);
            var headerTitles = [];
            angular.forEach(_headers, function(value, key){
                if (value.headers) {
                    var newTitles = value.headers.map(function(header, i, a){
                        var result = {
                            title: header,
                            name: header.toLowerCase() + 's',
                            nospace: i !== a.length - 1,
                            showcount: i === 0,
                            excluded: false
                        };
                        if (result.name === value.name) {
                            result.accessor = function(node){ return node.name;};
                        } else if (value.properties[header.toLowerCase()]) {
                            result.accessor = function(node){ return node[header.toLowerCase()]; };
                        }
                        return result;
                    });
                    this.push.apply(this, newTitles);
                }
            }, headerTitles);
            _headerTitles[viewID] = headerTitles;
            return headerTitles;
        };

        function refreshViewTree(tree, viewID) {
            var iterator;

            var deferred = $q.defer();
            if (!tree) {
                deferred.resolve();
                return deferred.promise;
            }
            tree.indeterminate = false;
            tree.checked = false;
            iterator = breadthFirstRefresh(tree, viewID);
            tree.indeterminate = tree.checked = false;


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
                    deferred.resolve();
                }
            };
            iterate();
            return deferred.promise;
        };

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
                                            child.parent = siteNode;
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
                        var rootNode = new DataNode(
                            {name: 'root'},
                            null,
                            levelDescription['roots'],
                            sites
                        )
                        sites.forEach(
                            function(site, i){
                                site.index = i;
                                site.parent = rootNode;
                            });
                        deferred.resolve(
                            rootNode
                        );
                    })
                });
            return deferred.promise;
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
                        child.parent = node;
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
            newNode.parent = node.parent;
            var promise;
            node.parent.children[node.index] = newNode;
            node = newNode;
            if (node.key) node.key++;
            if (node.children) {
                node._children = node.children;
                node.children = null;
                deferred.resolve(node);
                promise = deferred.promise;
            } else if (node._children){
                node.children = node._children;
                node._children = null;
                deferred.resolve(node);
                promise = deferred.promise;
            } else {
                promise = getChildrenFromAPI(node, deferred);
                promise = promise.then(function(children){
                    children.forEach(function (child) {
                        child.checked = node.checked;
                    });
                    node.childrenChecked = node.checked?children.length:0;
                    node.childrenIndeterminate = 0;
                    node.children = children;
                    node._children = null;
                    node.hasData = node.children&&node.children.length?true:false;
                    return node;
                });
            }
            return promise;
        };

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

        var deleteNode = function(node) {
            var url = BASE_URL + node.level.name + '/' + node.id;
            return makeAPICall.async(url, null, 'DELETE');
        }

        return {
            refreshViewTree: refreshViewTree,
            expandNode: expandNode,
            headers: headers,
            getHeaderTitles: getHeaderTitles,
            breadthFirstFull: breadthFirstFull,
            breadthFirstFullUntilLevel: breadthFirstFullUntilLevel,
            breadthFirstExpandCheckedGroups: breadthFirstExpandCheckedGroups,
            treeInit: treeInit,
            sortTree: sortTree,
            deleteNode: deleteNode
        }
    }

    sdmDataManager.$inject = ['$location', '$q', 'makeAPICall', 'sdmLevelDescriptions'];

    angular.module('sdm.main.services.sdmDataManager',
        ['sdm.services', 'sdm.main.services.sdmLevelDescriptions']).factory('sdmDataManager', sdmDataManager);

})();
