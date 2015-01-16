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
        var curators = {};
        console.log('tree init site: ', siteId);

        collections.forEach(function(collection){
            var curator = collection.curator;
            var curator_name;

            if (!curators.hasOwnProperty(curator)){
                if (curator.firstname || curator.lastname) {
                    curator_name = (curator.firstname + ' ' + curator.lastname).trim();
                } else {
                    curator_name = curator._id || 'anonymous';
                }
                curators[curator] = new DataNode(
                    {
                        name: curator_name
                    },
                    siteId,
                    levelDescription['curators']
                );
            }
            curators[curator].children.push(
                new DataNode(
                    collection,
                    siteId,
                    levelDescription['collections']
                ));
        });
        var curator_list = [];
        for (var curator in curators) {
            if (curators.hasOwnProperty(curator)) {
                curator_list.push(curators[curator]);
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
        return curator_list;
    }

    angular.module('sdm.APIServices.services.sdmCollectionsInterface', ['sdmHttpServices'])
        .factory('sdmCollectionsInterface', ['$q', 'makeAPICall', function($q, makeAPICall){
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
                                                var groups = _get_tree_init_structure(collections, site._id);
                                                if (!groups.length) {
                                                    siteNode.isLeaf = true;
                                                    siteNode.hasData = false;
                                                } else {
                                                    siteNode.children = groups;
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
            }

            var expandNode = function(node, triggerChange) {
                var deferred = $q.defer();
                var newNode = angular.copy(node);
                node.parent.children[node.index] = newNode;
                node = newNode;
                if (node.key) node.key++;
                if (node.children) {
                    node._children = node.children;
                    node.children = null;
                    deferred.resolve();
                } else if (node._children){
                    node.children = node._children;
                    node._children = null;
                    deferred.resolve();
                } else {
                    if (typeof node.level.next_level === 'undefined'){
                        return;
                    }
                    if (node.level.name === 'sites'){
                        console.log(node);
                        makeAPICall.async(collections_url, {site: node.site}).then(
                            function(collections) {
                                var curators = _get_tree_init_structure(collections, node.site);
                                node.children = curators;
                                if (curators.length){
                                    node.hasData = true;
                                } else {
                                    node.hasData = false;
                                    console.log('node', node);
                                }
                                deferred.resolve();
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
                                deferred.resolve();
                                return;
                            }
                            node.hasData = true;
                            node.children = result.map(
                                function(childData){
                                    return new DataNode(
                                        childData,
                                        node.site,
                                        levelDescription[node.level.next_level]
                                        )
                                });
                            node.children.sort(naturalSortByName);
                            node.children.forEach(function(child, i){
                                child.index = i;
                                child.checked = node.checked;
                            });
                            node.childrenChecked = node.checked?node.children.length:0;
                            node.childrenIndeterminate = 0;
                            deferred.resolve();
                        }, function(reason){
                            console.log(reason);
                            deferred.reject(reason);
                        });
                }
                return deferred.promise;
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
            }

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
                headers: headers
            }
        }]);

})();

