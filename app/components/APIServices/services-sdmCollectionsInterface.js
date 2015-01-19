'use strict';

(function () {
    var levelDescription = (function(){
        function objectAccessor(field){
            return function (o){
                return o[field];
            }
        };

        var roots = {
            name: 'roots',
            next_level: 'sites',
            properties: {
            }
        };

        var sites = {
            name: 'sites',
            next_level: 'curators',
            properties: {
                name: objectAccessor('name')
            },
            headers: ['Site']
        };

        var curators = {
            name: 'curators',
            next_level: 'collections',
            properties: {
                name: objectAccessor('name')
            },
            headers: ['Curator']
        };

        var collections = {
            name: 'collections',
            next_level: 'sessions',
            properties: {
                name: objectAccessor('name')
            },
            headers: ['Collection']
        };

        var sessions = {
            name: 'sessions',
            next_level: 'acquisitions',
            properties: {
                name: objectAccessor(['label']),
                subject:
                    function(o){
                        return o.subject.code;
                    }
            },
            headers: ['Session', 'Subject']
        };

        var acquisitions = {
            name: 'acquisitions',
            properties: {
                name: objectAccessor('label'),
                description: objectAccessor('description'),
                'data type': function (o){
                    return o.types.map(function(d){
                        return d.kind
                    }).join(', ');
                }
            },
            headers: ['Acquisition', 'Description', 'Data Type']
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

    function _get_tree_init_structure(collections, siteId) {
        console.log(collections);
        var curators = {};
        console.log('tree init site: ', siteId);

        collections.forEach(function(collection){
            var curator = collection.curator;
            var curator_name;
            if (curator.firstname || curator.lastname) {
                curator_name = (curator.firstname + ' ' + curator.lastname).trim();
            } else {
                curator_name = curator._id || 'anonymous';
            }
            var curatorID = curator._id || curator_name || 'anonymous';

            if (!curators.hasOwnProperty(curatorID)){

                curators[curatorID] = new DataNode(
                    {
                        name: curator_name
                    },
                    siteId,
                    levelDescription['curators']
                );
            }
            curators[curatorID].children.push(
                new DataNode(
                    collection,
                    siteId,
                    levelDescription['collections']
                ));
        });
        var curator_list = [];
        for (var curatorID in curators) {
            if (curators.hasOwnProperty(curatorID)) {
                curator_list.push(curators[curatorID]);
            }
        };



        function collapse(d, i) {
            d.index = i;
            if (d.children) {
                d.children.sort(naturalSortByName);
            }

            if (d.children && d.children.length) {
                //d.children[0].isFirstChild = true;
                d._children = d.children;
                d._children.forEach(collapse);
                d.children = null;
            }
        }

        curator_list.sort(naturalSortByName);

        curator_list.forEach(collapse);
        /*
        if (group_list[0]) {
            group_list[0].isFirstChild = true;
        }*/
        console.log(curator_list);
        return curator_list;
    }

    angular.module('sdm.APIServices.services.sdmCollectionsInterface',
        ['sdmHttpServices', 'sdm.dataFiltering.services.sdmFilterTree'])
        .factory('sdmCollectionsInterface', ['$q', 'makeAPICall', 'sdmFilterTree', function($q, makeAPICall, sdmFilterTree){
            var sites_url = BASE_URL + 'sites';
            var collections_url = BASE_URL + 'collections';

            var treeInit = function() {
                var deferred = $q.defer();
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
                                        makeAPICall.async(collections_url, {site: site._id}).then(
                                            function(collections) {
                                                var curators = _get_tree_init_structure(collections, site._id);
                                                if (!curators.length) {
                                                    siteNode.isLeaf = true;
                                                    siteNode.hasData = false;
                                                } else {
                                                    siteNode.children = curators;
                                                }
                                                deferredSite.resolve(siteNode);
                                            },
                                            function(reason) {
                                                console.log(reason);
                                                deferredSite.reject(reason);
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

            var breadthFirstAsync = function (tree, getChildren) {
                var queue = [{node: tree}];
                function next() {
                    console.log('queue.length', queue.length);
                    var nextDeferred = $q.defer();
                    var nodeOrPromise = queue.pop();
                    console.log('queue.length - 1', queue.length);
                    console.log('nodeOrpromise', nodeOrPromise);
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
                            console.log('children', children);
                            if (children && children.length) {
                                children.forEach(function(child, i){
                                    console.log('index', i);
                                    child.checked = child.checked || nodeOrPromise.checked;
                                    if (!child.parent) {
                                        child.parent = nodeOrPromise.parent;
                                    }
                                    if (i !== 0) {
                                        queue.unshift({node: child});
                                    }
                                });
                                queue.unshift({
                                    promise: getChildren(children[0]),
                                    checked: children[0].checked,
                                    parent: children[0]
                                });
                                console.log('queue after next', queue.length);
                                nextDeferred.resolve(children[0]);
                            } else {
                                console.log('queue after next', queue.length);
                                nextDeferred.resolve();
                            }
                        });
                    } else {
                        nextDeferred.reject('Error in breadthFirstAsync');
                    }
                    return nextDeferred.promise;
                }
                return {
                    next: next
                }
            };

            var breadthFirstFull = function(tree) {
                return breadthFirstAsync(tree, getAllChildren);
            };



            var breadthFirstRefresh = function(tree) {
                return breadthFirstAsync(tree, refreshChildren);
            }

            var getAllChildren= function (node) {
                console.log(node);
                var deferred = $q.defer();
                var children = node.children&&node.children.length?node.children:node._children;
                if (children && children.length) {
                    deferred.resolve(children);
                    return deferred.promise;
                } else {
                    return getChildrenFromAPI(node, deferred);
                }
            };

            var refreshChildren = function (node) {
                console.log(node);
                var newNode = angular.copy(node);
                node.parent.children[node.index] = newNode;
                node = newNode;
                if (node.key) node.key++;
                var deferred = $q.defer();
                if (node.children) {
                    var promise = getChildrenFromAPI(node, deferred);
                    promise.then(function(children){
                        node.children = node._children;
                        node._children = null;
                    });
                    return promise;
                } else {
                    deferred.resolve();
                    return deferred.promise;
                }
            };

            var getChildrenFromAPI = function(node, deferred) {
                if (typeof node.level.next_level === 'undefined'){
                    deferred.resolve();
                    return deferred.promise;
                }
                console.log('getChildren', node);
                if (node.level.name === 'sites'){
                    makeAPICall.async(collections_url, {site: node.site}).then(
                        function(collections) {
                            var curators = _get_tree_init_structure(collections, node.site);
                            node._children = curators;
                            if (curators.length){
                                node.hasData = true;
                            } else {
                                node.hasData = false;
                                console.log('node', node);
                            }
                            deferred.resolve(curators);
                        },
                        function(reason) {
                            console.log(reason);
                            deferred.reject(reason);
                        });
                    return deferred.promise;
                }

                var url, promise;
                if (node.level.name === 'sessions') {
                    url = BASE_URL + ['collections', node.parent.id, node.level.next_level].join('/');
                    promise = makeAPICall.async(url, {site: node.site, session: node.id});
                } else {
                    url = BASE_URL + [node.level.name, node.id, node.level.next_level].join('/');
                    promise = makeAPICall.async(url, {site: node.site});
                }

                promise.then(
                    function(result){
                        if (!result.length) {
                            node.hasData = false;
                            console.log('node', node);
                            deferred.resolve(result);
                            return;
                        }
                        node.hasData = true;
                        node._children = result.map(
                            function(childData){
                                return new DataNode(
                                    childData,
                                    node.site,
                                    levelDescription[node.level.next_level]
                                    )
                            });
                        node._children.sort(naturalSortByName);
                        node._children.forEach(function (child, i) {
                            child.index = i;
                            child.checked = node.checked;
                        });
                        node.childrenChecked = node.checked?node._children.length:0;
                        node.childrenIndeterminate = 0;
                        deferred.resolve(node._children);
                    }, function(reason){
                        console.log(reason);
                        deferred.reject(reason);
                    });
                return deferred.promise;

            };


            var expandNode = function(node) {
                var deferred = $q.defer();
                var newNode = angular.copy(node);
                node.parent.children[node.index] = newNode;
                node = newNode;
                if (node.key) node.key++;
                if (node.children) {
                    node._children = node.children;
                    node.children = null;
                    deferred.resolve();
                    return deferred.promise;
                } else if (node._children){
                    node.children = node._children;
                    node._children = null;
                    deferred.resolve();
                    return deferred.promise
                } else {
                    var promise = getChildrenFromAPI(node, deferred);
                    promise.then(function(children){
                        node.children = node._children;
                        node._children = null;
                    });
                    return promise;
                }
            };

            var headers = function () {
                console.log('headers called');

                return levelDescription;
            };

            var _addProjectNodes = function (dataNode, nodes) {
                var queue = [dataNode];
                var node;
                var children;
                while (queue.length) {
                    node = queue.pop();
                    if (node.level.name ==='projects') {
                        console.log(node);
                        nodes.push({level: 'project', _id: node.id});
                    } else {
                        children = node.children || node._children;
                        children.forEach(function(child){
                            queue.push(child);
                        });
                    }
                }
                return nodes;
            };

            var createCollection = function (name, notes, permissions) {
                var d = $q.defer();
                var url = BASE_URL + 'collections';
                var data = {
                    name: name,
                    notes: notes,
                    permissions: permissions
                }
                makeAPICall.async(url, null, 'POST', data).then(function(response){
                    d.resolve(response);
                });
                return d.promise;
            };


            var updateCollection = function(id, name, notes, permissions, selection, operation) {
                var d = $q.defer();
                var url = BASE_URL + 'collections/' + id;
                if (typeof operation === 'undefined') {
                    operation ='add';
                }
                var nodes = [];
                selection.forEach(function(dataNode) {
                    if (!dataNode.id) {
                        _addProjectNodes(dataNode, nodes);
                    } else {
                        var node = {};
                        var level = dataNode.level.name;
                        node.level = level.substring(0, level.length - 1);
                        node._id = dataNode.id;
                        nodes.push(node);
                    }
                });
                var data = {
                    name: name,
                    notes: notes,
                    permissions: permissions,
                    contents: {
                        operation: operation,
                        nodes: nodes
                    }
                };
                makeAPICall.async(url, null, 'PUT', data).then(function(response){
                    d.resolve(response);
                });
                return d.promise;
            };

            var getCollections = function () {
                var d = $q.defer();
                var url = BASE_URL + 'collections';
                makeAPICall.async(url, null, 'GET').then(function(response){
                    d.resolve(response);
                });
                return d.promise;
            };

            var getCollection = function (collectionID) {
                var d = $q.defer();
                var url = BASE_URL + 'collections/' + collectionID;
                makeAPICall.async(url, null, 'GET').then(function(response){
                    d.resolve(response);
                });
                return d.promise;
            }

            var deleteCollection = function(collectionID) {
                var d = $q.defer();
                var url = BASE_URL + 'collections/' + collectionID;
                makeAPICall.async(url, null, 'DELETE').then(function(response){
                    d.resolve(response);
                });
                return d.promise;
            };

            var deleteAllCollections = function() {
                getCollections().then(
                    function(nodes){
                        nodes.forEach(function(node){
                            deleteCollection(node._id);
                        });
                    })
            };

            return {
                createCollection: createCollection,
                updateCollection: updateCollection,
                getCollections: getCollections,
                getCollection: getCollection,
                deleteCollection: deleteCollection,
                deleteAllCollections: deleteAllCollections,
                treeInit: treeInit,
                expandNode: expandNode,
                headers: headers,
                breadthFirstFull: breadthFirstFull
            }
        }]);

})();

