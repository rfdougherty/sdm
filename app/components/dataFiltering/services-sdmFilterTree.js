'use strict';

(function(){

    var sdmFilterTree = function () {
        var filterLeaves = function (node) {
            return node.isLeaf;
        };

        var filters;
        var filterService = {};
        var globalFilters = {};

        var cachedFilters = {
            'projects': {},
            'collections': {},
            'search': {},
            'admin': {}
        };

        var setView = function (_viewID) {
            filterService.viewID = _viewID;
            filters = cachedFilters[filterService.viewID] || {};
        }

        var getFilter = function (name) {
            if (filters[name]){
                return filters[name];
            } else {
                return {
                    filter: function (node) {return true}
                }
            }
        };

        var getLevelFilter = function (level) {
            var levelFilters = level.headers.map(function(h) {
                return getFilter(h.toLowerCase() + 's').filter
            });
            return function(node) {
                return levelFilters.every(function(f) { return f(node);});
            };
        };

        var createFilter = function (header, searchString, exclude) {
            filters[header.name] = {
                filter: function(node) {
                    if (searchString === '') {
                        return true
                    }
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
        };

        var addGlobalFilter = function (key, filter) {
            globalFilters[key] = filter;
        };

        var removeGlobalFilter = function (key) {
            delete globalFilters[key];
        };

        var checkGlobalFilter = function (node) {
            var result = true;
            angular.forEach(globalFilters, function (filter, key){
                if (!filter(node)) {
                    result = false;
                }
            });
            return result;
        };

        var filter = function (tree) {
            var nodes = [];
            var iterator = _depthFirst(tree);
            var n = iterator.next();
            var counts = {};
            while (!n.done) {
                counts[n.value.level.name] = counts[n.value.level.name]?counts[n.value.level.name] + 1:1;
                if (n.value.isLeaf) {
                    nodes.push(n.value);
                }
                n = iterator.next();
            }
            return {leaves: nodes, counts: counts};
        };

        var _depthFirst = function(tree) {
            var element;
            var elements = [tree];
            if (tree) {
                tree.rowId = 0;
            }
            function next() {
                element = elements.pop();
                var firstChild;
                var isLeaf;
                if (typeof element === 'undefined') {
                    return {done: true};
                } else if (element.children && element.children.length) {
                    var filteredChildren = [];
                    var thisChild;
                    for (var i = element.children.length - 1; i >= 0; i--){
                        thisChild = element.children[i];
                        if (checkGlobalFilter(thisChild) && getLevelFilter(thisChild.level)(thisChild)){
                            filteredChildren.push(thisChild);
                        }
                    }

                    var isFirstChild;
                    var temp;
                    for (i = 0; i < filteredChildren.length; i++) {
                        thisChild = filteredChildren[i];
                        isFirstChild = i === filteredChildren.length - 1;
                        thisChild.isFirstChild = isFirstChild;
                        thisChild.rowId = element.rowId + i;
                        elements.push(thisChild);
                    }
                    isLeaf = element.isLeaf = filteredChildren.length?false:true;
                } else {
                    element.children = undefined;
                    isLeaf = element.isLeaf = true;
                }
                return {
                    value: element,
                    done: false,
                    isLeaf: isLeaf
                }
            }
            return {
                next: next
            };
        };



        var selectorUnchecked = function (node) {
            var preAction = function (node) {
                var checked = node.checked;
                var indeterminate = node.indeterminate;
                if (!node.children || node.children.length === 0) {
                    selectorIndeterminate(node);
                    if (node.parent) {
                        node.parent.childrenChecked += node.checked - checked;
                        node.parent.childrenIndeterminate += node.indeterminate - indeterminate;
                    }
                    return true;
                } else {
                    return false;
                }
            };

            var postAction = function (node) {
                var checked = node.checked;
                var indeterminate = node.indeterminate;
                node.checked = node.childrenChecked === node.children.length;
                node.indeterminate = !node.checked && node.childrenChecked + node.childrenIndeterminate > 0;
                if (node.parent) {
                    node.parent.childrenChecked += node.checked - checked;
                    node.parent.childrenIndeterminate += node.indeterminate - indeterminate;
                }
                return true;
            };
            var queue = [];
            var parentNode = node.parent;
            while (parentNode) {
                queue.unshift({action: postAction, node: parentNode})
                parentNode = parentNode.parent;
            }
            queue.push({action: preAction, node: node});
            var action;
            while (queue.length) {
                action = queue.pop();
                if (!action.action(action.node)) {
                    queue.push({action: postAction, node: action.node});
                    action.node.children.forEach(function(child){
                        if (getLevelFilter(child.level)(child)){
                            queue.push({action: preAction, node: child});
                        }
                    });
                }
            }
        };

        var selectorChecked = function (node, initial) {
            var checked = node.checked;
            var indeterminate = node.indeterminate;
            node.checked = false;
            node.indeterminate = false;
            var children = node.children || node._children;
            if (children && children.length) {
                node.childrenChecked = 0;
                node.childrenIndeterminate = 0;
                children.forEach(function(child){
                    selectorChecked(child);
                });
            }
            if (initial) {
                var n = node.parent;
                n.childrenChecked += node.checked - checked;
                n.childrenIndeterminate += node.indeterminate - indeterminate;
                while (n){
                    checked = n.checked;
                    indeterminate = n.indeterminate;
                    n.checked = n.childrenChecked === n.children.length;
                    n.indeterminate = !n.checked && n.childrenChecked + n.childrenIndeterminate > 0;
                    if (n.parent) {
                        n.parent.childrenChecked += n.checked - checked;
                        n.parent.childrenIndeterminate += n.indeterminate - indeterminate;
                    }
                    n = n.parent;
                }
            }
        };

        var selectorIndeterminate = function (node, initial) {
            var checked = node.checked;
            var indeterminate = node.indeterminate;
            node.checked = true;
            node.indeterminate = false;
            var children = node.children || node._children;
            if (children && children.length) {
                node.childrenChecked = children.length;
                node.childrenIndeterminate = 0;
                children.forEach(function(child){
                    selectorIndeterminate(child);
                });
            }
            if (initial) {
                var n = node.parent;
                n.childrenChecked += node.checked - checked;
                n.childrenIndeterminate += node.indeterminate - indeterminate;
                while (n){
                    checked = n.checked;
                    indeterminate = n.indeterminate;
                    n.checked = n.childrenChecked === n.children.length;
                    n.indeterminate = !n.checked && n.childrenChecked + n.childrenIndeterminate > 0;
                    if (n.parent) {
                        n.parent.childrenChecked += n.checked - checked;
                        n.parent.childrenIndeterminate += n.indeterminate - indeterminate;
                    }
                    n = n.parent;
                }
            }
        };

        var selector = function (node) {
            if (node.indeterminate) {
                selectorIndeterminate(node, true);
            } else if (node.checked) {
                selectorChecked(node, true);
            } else {
                selectorUnchecked(node);
            }
        };

        angular.extend(
            filterService,
            {
                filter: filter,
                createFilter: createFilter,
                getFilter: getFilter,
                selector: selector,
                setView: setView,
                cachedFilters: cachedFilters,
                addGlobalFilter: addGlobalFilter,
                removeGlobalFilter: removeGlobalFilter
            });
        return filterService;
    }


    angular.module('sdm.dataFiltering.services.sdmFilterTree',[])
        .factory('sdmFilterTree', sdmFilterTree);
})();
