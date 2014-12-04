'use strict';


(function(){

    angular.module('sdm.treeViews.directives.sdmTableView',
        ['sdmD3Service'])
    .directive('sdmTableView', ['sdmD3Service',
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
                    '<div id="sdm-table-root">' +
                        '<div class="sdm-table-header">' +
                            '<div class="container">' +
                                '<div class="row">' +
                                    '<div class="col-md-2 col-xs-2 col-lg-2 col-sm-2 col"' +
                                        ' ng-repeat="header in headers" ng-class="{nospace:header.nospace}">' +
                                        '<div class="content">' +
                                            '{{header.title}}' +
                                        '</div>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="sdm-table-content">' +
                            '<div class="container"></div>' +
                        '</div>' +
                    '</div>',
                // templateUrl: '',
                replace: true,
                // transclude: true,
                link: {
                    post: function($scope, $element, $attr) {
                        var containerElement = $element[0]
                            .getElementsByClassName('sdm-table-content')[0]
                            .getElementsByClassName('container')[0];
                        var headersString = $attr.sdmTableHeader.split(':');
                        $scope.headers = headersString.map(function(s){
                            var properties = s.split(',');
                            return {
                                title: properties[0],
                                nospace: properties[1]
                            }
                        });

                        sdmD3Service.d3().then(function() {
                            $scope.$watch('trigger', function(newValue, oldValue){
                                console.log('scope.data', $scope.sdmData);
                                console.log('scope.trigger', $scope.trigger);
                                if (typeof $scope.sdmData !== 'undefined'){
                                    updateView(containerElement, $scope.sdmData, $scope.sdmExpandNode(), $scope.trigger);
                                }
                            });
                        });
                    }
                }
            };
        }
    ]);

    var sessionKey;

    var getLeaves = function (data) {
        var nodes = d3.layout.tree()(data);

        var previous_node = null;

        var leaves = nodes.filter(
            function(node){
                return node.isLeaf;
            });
        return leaves;
    };


    var updateView = function(rootElement, data, clickCallback, trigger) {
        sessionKey = trigger.sessionKey?trigger.sessionKey:0;
        var leaves = getLeaves(data);

        var rows = d3.select(rootElement)
            .selectAll('div.d3row')
            .data(leaves, generateLeafKey);

        rows.enter()
            .insert('div')
            .classed('row', true)
            .classed('d3row', true)
            .each(updateRow(clickCallback));

        rows.classed('grey', function(d, i){ return (i + 1)%2;});

        rows.exit().remove();

        return rows;
    };


    var updateRow = function (clickCallback) {
        return function(leaf, i) {
            var dataRow = createDataRow(leaf);

            d3.select(this)
                .selectAll('span.sdm-cell')
                .remove();

            var cells = d3.select(this)
                .selectAll('span.sdm-cell')
                .data(dataRow);


            var selection = cells.enter()
                .append('span')
                .classed("sdm-cell",
                    true);

            createCell(selection, clickCallback);
        }
    };

    var createCell = function(selection, clickCallback) {
        selection.each(function(d, i){
            d3.keys(d.level.properties).forEach(function(p, i, a){
                var classed = [d.level.name, p, "col col-md-2 col-sm-2 col-lg-2 col-xs-2"].join(" ");
                var d3_element = d3.select(this).append('div')
                    .classed(classed, true);
                var value = d[p];
                if (d.show) {
                    if (i === 0){
                        d3_element.append('input').attr('type', 'checkbox');
                    }
                    d3_element.append('span')
                        .classed('content', true)
                        .classed(UNDEFINED_PLACEHOLDER, function(){return typeof value === 'undefined';})
                        .text(value||UNDEFINED_PLACEHOLDER);
                    if (i === a.length - 1){
                        d3_element.append('span').attr('class',
                            function(d){
                                var icon;
                                if (d.hasData){
                                    icon = (d&&d.level.next_level&&d.hasData)?
                                        d.children?'glyphicon-chevron-down':'glyphicon-chevron-right'
                                        :'';
                                } else {
                                    icon = 'glyphicon-ban-circle';
                                }
                                return 'glyphicon nav-glyph expander ' + icon;
                            }).on('click', clickCallback);
                    }
                }
            }, this);
        });
    };


    var createDataRow = function(leaf){
        leaf.show = true;
        var dataRow = [leaf];
        var node = leaf;
        var add_parent_name_to_row = true;
        while (node.parent) {
            add_parent_name_to_row &= node.isFirstChild;
            node.parent.show = add_parent_name_to_row;
            dataRow.unshift(node.parent);
            node = node.parent;
        };
        return dataRow;
    };

    function _zeroPadding(n, m) {
        var pad = new Array(1 + m).join("0");
        return (pad + n).slice(-pad.length);
    };


    function generateLeafKey(leaf) {
        if (leaf.key) {
            return leaf.key + leaf.hasData;
        }
        var node = leaf;
        var key = '';
        while (node) {
            key = _zeroPadding(node.index, 4) + key;
            node = node.parent;
        }
        leaf.key = key + sessionKey;
        return leaf.key + leaf.hasData;
    };


})();
