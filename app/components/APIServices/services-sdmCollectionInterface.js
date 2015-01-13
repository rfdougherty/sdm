'use strict';

angular.module('sdm.APIServices.services.sdmCollectionInterface', ['sdmHttpServices'])
    .factory('sdmCollectionInterface', ['$q', 'makeAPICall', function($q, makeAPICall){
        var callAPI = {};

        callAPI.async = function (url, data, method) {
            console.log('callAPI');
            console.log(url);
            console.log(data);
            console.log(method);
            return {
                then: function(){}
            }
        }

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
            deleteAllCollections: deleteAllCollections
        }
    }]);
