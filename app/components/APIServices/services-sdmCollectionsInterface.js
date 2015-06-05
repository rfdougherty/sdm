'use strict';

(function () {

    angular.module('sdm.APIServices.services.sdmCollectionsInterface',
        ['sdmHttpServices'])
        .factory('sdmCollectionsInterface', ['$q', 'makeAPICall', function($q, makeAPICall){

            var _addProjectNodes = function (dataNode, nodes) {
                /*
                ** if the datanode has no id (like groups, sites, curators) we cannot add it directly
                ** to the list of nodes to be added to the collection.
                ** We need to find the Projects datanodes that belong to them and add them.
                */
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

            var splitSelection = function(selection) {
                var collections = {};
                selection.forEach(function(element) {
                    collections[element.collection.id] = collections[element.collection.id] ||
                        {
                            selection: [],
                            id: element.collection.id,
                            name: element.collection.name,
                            notes: element.collection.notes,
                            checked: element.collection.checked,
                            userAccess: element.collection.userAccess
                        };
                    collections[element.collection.id].selection.push(element);
                });
                if (selection.collections) {
                    selection.collections.forEach(function(collection){
                        collections[collection.id] = collections[collection.id] ||
                            {
                                id: collection.id,
                                name: collection.name,
                                notes: collection.notes,
                                checked: collection.checked,
                                userAccess: collection.userAccess
                            };
                    });
                }
                return collections;
            }

            var createCollection = function (name, notes, permissions) {
                var d = $q.defer();
                var url = BASE_URL + 'collections';
                var data = {
                    name: name,
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
                    if (!dataNode.id) { //see explanation on _addProjectNodes
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
                    contents: {
                        operation: operation,
                        nodes: nodes
                    }
                };
                if (permissions) {
                    data.permissions = permissions;
                }
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
                splitSelection: splitSelection
            }
        }]);

})();

