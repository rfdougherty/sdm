'use strict';

(function(){

    var sdmSearchManager = function () {
        var buildTreeFromAcquisitions = function(leaves) {
            var tree;
            var nodes = {};
            var attachBranch = function(node, parent) {
                if (!parent) {
                    tree = node;
                } else {
                    parent.children.push(node);
                    node.parent = parent;
                }
            }
            var parseLeave = function(leave) {
                var node = leave;
                var parent = getParent(node);
                while(parent && !nodes[parent.level.name][parent.id]) {
                    parent = getParent(node);
                    node = parent;
                }
                attachBranch(node, parent);
                nodes[node.level.name][node.id] = true;
            };
            leaves.forEach(parseLeave);
        }
        var getParent = function(node) {
            return node.parent
        }
        return {

        }
    }

    sdmSearchManager.$inject = [];

    angular.module('sdm.search.services.sdmSearchManager',
        [])
        .factory('sdmSearchManager', sdmSearchManager);
})();
