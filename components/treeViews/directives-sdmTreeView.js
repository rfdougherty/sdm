'use strict';


(function(){


    angular.module('sdm.treeViews.directives.sdmTreeView',
        ['sdmD3Service'])
    .directive('sdmTreeView', ['sdmD3Service',
        function(sdmD3Service){

            // Runs during compile
            return {
                // name: '',
                // priority: 1,
                // terminal: true,
                scope: {
                    sdmData: '=',
                    trigger: '=',
                    sdmExpandNode: '&'
                }, // {} = isolate, true = child, false/undefined = no change
                // controllerAs: 'tableController',
                // controller: TableController,
                // require: 'ngModel', // Array = multiple requires, ? = optional, ^ = check parent elements
                restrict: 'E', // E = Element, A = Attribute, C = Class, M = Comment
                template:
                    '<div id="tree-view">' +
                    '</div>',
                // templateUrl: '',
                replace: true,
                // transclude: true,
                link: {
                    post: function($scope, $element, $attr) {
                        $scope.headers = $attr.sdmTableHeader.split(':');
                        sdmD3Service.d3().then(function() {
                            initView();
                            createHeader($scope.headers);
                            $scope.$watch('trigger', function(newValue, oldValue){
                                var source = (newValue === oldValue)?null:newValue.node;
                                if (typeof source !== 'undefined' && typeof $scope.sdmData !== 'undefined'){
                                    updateView($scope.sdmData, source, $scope.sdmExpandNode());
                                }
                            });
                        });
                    }
                }
            };
        }
    ]);


    var margin = {top: 20, right: 20, bottom: 20, left: 80},
        height = 800 - margin.top - margin.bottom;
    var node_index = 0,
        default_duration = 750,
        min_allowed_diff = 10,
        max_allowed_diff = 20;
    var diagonal, svg, tree;
    var sessionKey = 0;

    var initView = function() {
        var container = d3.select('#tree-view');
        var container_width = container[0][0].offsetWidth;
        tree = d3.layout.tree();
        svg = container
            .append("div")
                .attr("width", container_width)
                //.attr("height", container_height)
            .append("svg")
                .attr("width",  container_width - margin.right - margin.left)
                .attr("height", height + margin.top + margin.bottom)
            .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        diagonal = d3.svg.diagonal()
                     .projection(function(d) { return [d.y, d.x]; });
    };

    var createHeader = function(fields){
        var headers = fields.map(
            function(field, i){
                var header = {};
                header.text = field;
                header.x = 0;
                header.y = i * 180;
                return header;
            });
        var node = svg.selectAll("g.header").data(headers);
        node.enter().append("g")
            .attr("class", "header")
            .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

        // svg.append("line")
        //     .style("stroke", "black")
        //     .attr("y1", 20)
        //     .attr("x1", -70)
        //     .attr("y2", 20)
        //     .attr("x2", 790);

        node.append("text")
            .attr("x", 0)//function(d, i, a) { return i !== a.length - 1 ? -10 : 10; })
            .attr("dy", ".35em")
            .attr("text-anchor", "middle")//function(d, i , a) { return i !== a.length - 1 ? "end" : "start"; })
            .text(function(d) { return d.text; })
            .style("font-weight", "bold");
    }


    var updateView = function(data, source, clickCallback) {
        // Compute the new tree layout.
        var nodes = tree(data);
        //nodes.shift(); //remove the first element (the root of the tree)


        var previous_node = null;
        var max_x = 0;
        var duration = default_duration;

        if (source === null) {
            duration = 0;
            source = data;
        }

        var treeOrigin = 30;

        if (typeof source.x0 === 'undefined') {
            source.x0 = treeOrigin;
            source.y0 = 0;
        }

        // Normalize for fixed-depth. Calculate the minimum distance between nodes meanwhile
        nodes.forEach(function(d) {
            d.y = (Math.max(d.depth - 1, 0)) * 180;
            if (previous_node === null){
                d.x_discrete = treeOrigin;
            } else if (previous_node === d.parent) {
                d.x_discrete = previous_node.x_discrete;
            } else {
                d.x_discrete = previous_node.x_discrete + 20;
            }
            previous_node = d;
            if (d.x_discrete > max_x){
                max_x = d.x_discrete;
            }
        });

        nodes.shift();
        var links = tree.links(nodes);

        // Update the nodes…
        var node = svg.selectAll("g.node")
                .data(nodes, function(d) {
                    return d.id || (d.id = ++node_index);
                });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("g")
                .attr("class", "node")
                .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
                .on("click", clickCallback);

        nodeEnter.append("circle")
                .attr("r", 1e-6);

        nodeEnter.append("text")
                .attr("x", function(d) { return d.level.next_level ? -10 : 10; })
                .attr("dy", ".35em")
                .attr("text-anchor", function(d) { return d.level.next_level ? "end" : "start"; })
                .text(function(d) { return d.name||UNDEFINED_PLACEHOLDER; })
                .style("fill-opacity", 1e-6)
                .style("font-style", function(d){
                    return d.name?"normal":"italic";
                })
                .style("fill", function(d){
                    return d.name?"black":"grey";
                });

        // Transition nodes to their new position.
        node.classed("expandible", function(d) { return d.level.next_level && !d.children && d.hasData; });
        var nodeUpdate = node.transition()
                .duration(duration)
                .attr("transform", function(d) { return "translate(" + d.y + "," + d.x_discrete + ")"; });

        nodeUpdate.select("circle").attr("r", 4.5);

        nodeUpdate.select("text")
                .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
                .duration(duration)
                .attr("transform", function(d) { return "translate(" + source.y + "," + source.x_discrete + ")"; })
                .remove();

        nodeExit.select("circle")
                .attr("r", 1e-6);

        nodeExit.select("text")
                .style("fill-opacity", 1e-6);

        // Update the links…
        var link = svg.selectAll("path.link")
                .data(links, function(d) { return d.target.id; });

        // Enter any new links at the parent's previous position.
            link.enter().insert("path", "g")
                .attr("class", "link")
                .attr("d", function(d) {
                    var o = {x: source.x0, y: source.y0};
                    return diagonal({source: o, target: o});
                });

        // Transition links to their new position.
        link.transition()
                .duration(duration)
                .attr("d", function(d) {
                    var o = {x: d.source.x_discrete, y: d.source.y};
                    var t = {x: d.target.x_discrete, y: d.target.y};
                    return diagonal({source: o, target: t});
                });

        //Transition exiting nodes to the parent's new position.
        link.exit().transition()
                .duration(duration)
                .attr("d", function(d) {
                    var o = {x: source.x_discrete, y: source.y};
                    return diagonal({source: o, target: o});
                })
                .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x_discrete;
            d.y0 = d.y;
        });

        height = max_x;
        d3.select("svg").transition().duration(duration).attr("height", max_x + margin.bottom + margin.top);
    };

})();
