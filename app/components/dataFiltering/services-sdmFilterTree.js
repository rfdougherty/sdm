'use strict';

(function(){

    var sdmFilterTree = function(){
        var _d3;

        var filterLeaves = function(node) {
            return node.isLeaf;
        };

        var filters = {};

        var getFilter = function(name) {
            if (filters[name]){
                return filters[name];
            } else {
                return {
                    filter: function(node){return true}
                }
            }
        }

        var getLevelFilter = function(level) {
            var levelFilters = level.headers.map(function(h) {
                return getFilter(h.toLowerCase() + 's').filter
            });
            return function(node) {
                return levelFilters.every(function(f) { return f(node);});
            };
        }

        var createFilter = function(header, searchString, exclude) {
            console.log('filter', header.name, searchString, exclude);
            console.log(header);
            filters[header.name] = {
                filter: function(node) {
                    var match =
                        header.accessor(node)?
                            header.accessor(node)
                                  .toLowerCase()
                                  .indexOf(searchString.toLowerCase()) > -1
                            :false;
                    return exclude?!match:match;
                },
                searchString: searchString
            }
        }

        var filter = function(tree) {
            var nodes = [];
            var iterator = depthFirst(tree);
            var n = iterator.next();
            var count = 0;
            while (!n.done) {
                count++;
                if (n.value.isLeaf) {
                    nodes.push(n.value);
                }
                n = iterator.next();
            }
            var d3_nodes = _d3.layout.tree()(tree);
            if (_d3.keys(filters).length === 0 && d3_nodes.length !== count) {
                console.log('d3 nodes', d3_nodes);
                console.log('leaf nodes', nodes);
                throw "check node count"
            }
            return nodes;
        }

        var depthFirst = function(tree) {
            var element;
            var elements = [tree];
            function next() {
                element = elements.pop();
                var firstChild;
                if (typeof element === 'undefined') {
                    return {done: true};
                } else if (element.children && element.children.length) {
                    var filteredChildren = [];
                    var thisChild;
                    for (var i = element.children.length - 1; i >= 0; i--){
                        thisChild = element.children[i];
                        if (getLevelFilter(thisChild.level)(thisChild)){
                            thisChild.parent = element;
                            filteredChildren.push(thisChild);
                        }
                    }
                    //console.log(filteredChildren);
                    var isFirstChild;
                    var temp;
                    for (i = 0; i < filteredChildren.length; i++) {
                        thisChild = filteredChildren[i];
                        isFirstChild = i === filteredChildren.length - 1;
                        thisChild.isFirstChild = isFirstChild;
                        //console.log(thisChild);
                        elements.push(thisChild);
                    }
                    element.isLeaf = filteredChildren.length?false:true;
                } else {
                    element.children = undefined;
                    element.isLeaf = true;
                }
                return {
                    value: element,
                    done: false
                }
            }
            return {
                next: next
            };
        }

        var depthFirstAction = function(tree, action) {
            var iterator = depthFirst(tree);
            function next() {
                var node = iterator.next();
                if (!node.done) {
                    action(node.value);
                }
                return node;
            }
            return {
                next: next
            }
        }

        var result = function(d3) {
            _d3 = d3;
            return {
                filter: filter,
                createFilter: createFilter,
                getFilter: getFilter
            }
        }

        return result
    }


    angular.module('sdm.dataFiltering.services.sdmFilterTree',[])
        .factory('sdmFilterTree', sdmFilterTree);
})();
