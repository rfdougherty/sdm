'use strict';

var _sdmData, _element;

(function(){
    var d3;
    var sdmCellOnHover;

    angular.module('sdm.treeViews.directives.sdmTableView',
        ['sdmD3Service', 'sdm.dataFiltering.services.sdmFilterTree'])
    .directive('sdmTableView', ['$compile', 'sdmD3Service', 'sdmFilterTree',
        function($compile, sdmD3Service, sdmFilterTree){


            // Runs during compile
            return {
                // name: '',
                // priority: 1,
                // terminal: true,
                scope: {
                    sdmData: '=',
                    trigger: '=sdmTrigger',
                    sdmActions: '&',
                    sdmHeaders: '=',
                    sdmFilter: '='
                }, // {} = isolate, true = child, false/undefined = no change
                // controllerAs: 'tableController',
                // controller: TableController,
                // require: 'ngModel', // Array = multiple requires, ? = optional, ^ = check parent elements
                restrict: 'E', // E = Element, A = Attribute, C = Class, M = Comment
                templateUrl: 'components/treeViews/tableTemplate.html',
                // templateUrl: '',
                replace: true,
                // transclude: true,
                link: {
                    post: function($scope, $element) {
                        _sdmData = $scope.sdmData;
                        var containerElement = $element[0]
                            .getElementsByClassName('sdm-table-content')[0]
                            .getElementsByClassName('container')[0];

                        $scope.headersTitles = getHeaderTitles($scope.sdmHeaders);

                        sdmCellOnHover = function() {
                            if (typeof this.sdmCellCompiled === 'undefined') {
                                $compile(this.parentElement)($scope);
                                this.sdmCellCompiled = true;
                            }
                        };


                        sdmD3Service.d3().then(function(_d3) {
                            d3 = _d3;
                            $scope.$watch('trigger', function(){
                                console.log('scope.data', $scope.sdmData);
                                console.log('scope.trigger', $scope.trigger);
                                var filterSrv = sdmFilterTree(d3);
                                if (typeof $scope.sdmData !== 'undefined'){
                                    updateView(
                                        containerElement,
                                        $scope.sdmData.data,
                                        $scope.sdmActions(),
                                        $scope.trigger,
                                        filterSrv.filter,
                                        $scope.trigger.all);
                                }

                                var getFilter = filterSrv.getFilter;
                                $scope.headersTitles.forEach(function(header){
                                    var searchString = getFilter(header.name).searchString;
                                    if (searchString) {
                                        header.filter = {
                                            string: searchString
                                        };
                                    }
                                });

                                $scope.setFilter = function(header){
                                    //var refreshData = angular.copy($scope.sdmData.data);
                                    //$scope.sdmData.data = refreshData;
                                    //$scope.trigger.sessionKey;
                                    console.log(header);
                                    if (header.filter){
                                        if (!header.filter.string) {
                                            header.filter.excluded = false;
                                        }
                                        filterSrv.createFilter(
                                            header,
                                            header.filter.string,
                                            header.filter.excluded);
                                    }
                                    if (typeof $scope.sdmData !== 'undefined'){
                                        updateView(
                                            containerElement,
                                            $scope.sdmData.data,
                                            $scope.sdmActions(),
                                            $scope.trigger,
                                            filterSrv.filter,
                                            true);
                                    }
                                };

                                $scope.clearFilter = function(header) {
                                    header.filter.string = '';
                                    header.filter.excluded = false;
                                    $scope.setFilter(header);
                                };

                                $scope.clearESC = function(event, header) {
                                    console.log('event', event);
                                    if (event.keyCode === 27) {
                                        header.filter.string = '';
                                        header.filter.excluded = false;
                                        $scope.setFilter(header);
                                    }
                                };

                                $scope.filterExclude = function(header) {
                                    header.filter.excluded = !header.filter.excluded;
                                    $scope.setFilter(header);
                                };
                            });
                        });
                    }
                }
            };
        }
    ]);

    var getHeaderTitles = function(headers) {
        var titles = [];
        angular.forEach(headers, function(value, key){
            if (value.headers) {
                console.log('header properties', value.properties);
                var newTitles = value.headers.map(function(header, i, a){
                    var result = {
                        title: header,
                        name: header.toLowerCase() + 's',
                        nospace: i !== a.length - 1,
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
        }, titles);
        return titles;
    };

    var sessionKey;


    var updateView = function(rootElement, data, actions, trigger, getLeaves, all) {
        sessionKey = trigger.sessionKey?trigger.sessionKey:-1;
        var leaves = getLeaves(data);

        var rows = d3.select(rootElement)
            .selectAll('div.d3row')
            .data(leaves, generateLeafKey);

        rows.exit().remove();

        if (all){
            rows.each(updateRow(actions));
        }
        rows.enter()
            .insert('div')
            .classed('row', true)
            .classed('d3row', true)
            .each(updateRow(actions));

        rows.classed('grey', function(d, i){ return (i + 1)%2;});

        return rows;
    };


    var updateRow = function (actions) {
        return function(leaf) {
            var dataRow = createDataRow(leaf);

            d3.select(this)
                .selectAll('span.sdm-cell')
                .remove();

            var cells = d3.select(this)
                .selectAll('span.sdm-cell')
                .data(dataRow);


            var selection = cells.enter()
                .append('span')
                .classed('sdm-cell',
                    true);

            createCell(selection, actions);
        };
    };


    var createCell = function(selection, actions) {
        selection.each(function(d){
            d3.keys(d.level.properties).forEach(function(p, i, a){
                var classed = [d.level.name, p, 'col col-md-2 col-sm-2 col-lg-2 col-xs-2'].join(' ');
                var d3Element = d3.select(this).append('div')
                    .classed(classed, true);
                var value = d[p];
                if (d.show) {
                    if (i === 0){
                        d3Element.append('input').attr({
                            'type': 'checkbox'
                        }).property({
                            'checked': d.checked||false,
                            'indeterminate': d.indeterminate
                        }).on('click', function(d){
                            console.log(this.checked);
                            actions.checkNode(d);
                        });
                    }
                    d3Element.append('div')
                        .classed('content', true)
                        .classed(UNDEFINED_PLACEHOLDER, function(){return typeof value === 'undefined';})
                        .append('span')
                        .attr({
                            'sdm-popover-click': '',
                            'sdm-popover-class': 'sdm-info-toolbar',
                            'sdm-popover-template-content': 'components/infoToolbar/infoToolbarPopover.html',
                            'sdm-popover-dynamic-position': 'false',
                            'sdm-popover-style-width': '64px',
                            'sdm-popover-style-height': '28px',
                            'sdm-popover-style-top': '24px'
                        })
                        .on('mouseenter', sdmCellOnHover)
                        .append('span')
                        .classed('text', true)
                        .text(value||UNDEFINED_PLACEHOLDER);

                    if (i === a.length - 1){
                        d3Element.append('span').attr('class',
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
                            }).on('click', actions.expandNode);
                    }
                }
            }, this);
        });
    };


    var createDataRow = function(leaf){
        leaf.show = true;
        var dataRow = [leaf];
        var node = leaf;
        var addParentNameToRow = true;
        while (node.parent) {
            addParentNameToRow = node.isFirstChild && addParentNameToRow;
            node.parent.show = addParentNameToRow;
            dataRow.unshift(node.parent);
            node = node.parent;
        }
        return dataRow;
    };

    function _zeroPadding(n, m) {
        var pad = new Array(1 + m).join('0');
        return (pad + n).slice(-pad.length);
    }


    function generateLeafKey(leaf) {
        if (leaf.key) {
            return leaf.key;
        }
        var node = leaf;
        var key = '';
        while (node) {
            key = _zeroPadding(node.index, 4) + key;
            node = node.parent;
        }
        leaf.key = key + sessionKey;
        return leaf.key;
    }


})();
