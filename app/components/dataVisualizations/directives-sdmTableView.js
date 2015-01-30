'use strict';

(function(){
    var d3;
    var sdmCellOnHover;

    angular.module('sdm.dataVisualizations.directives.sdmTableView',
        ['sdmD3Service', 'sdm.dataFiltering.services.sdmFilterTree'])
    .directive('sdmTableView', ['$compile', '$location', '$rootScope', 'sdmD3Service', 'sdmFilterTree',
        function($compile, $location, $rootScope, sdmD3Service, sdmFilterTree){
            return {
                // name: '',
                // priority: 1,
                // terminal: true,
                scope: {
                    sdmData: '=',
                    trigger: '=sdmTrigger',
                    sdmActions: '&',
                    sdmHeaders: '='
                }, // {} = isolate, true = child, false/undefined = no change
                // controllerAs: 'tableController',
                // controller: TableController,
                // require: 'ngModel', // Array = multiple requires, ? = optional, ^ = check parent elements
                restrict: 'E', // E = Element, A = Attribute, C = Class, M = Comment
                templateUrl: 'components/dataVisualizations/tableTemplate.html',
                // templateUrl: '',
                replace: true,
                // transclude: true,
                link: {
                    post: function($scope, $element, $attrs) {
                        sdmFilterTree.sdmData = $scope.sdmData;
                        var currentPath = $location.path();
                        //console.log(currentPath.substring(1, currentPath.length));
                        sdmFilterTree.setView(currentPath.substring(1, currentPath.length));
                        var containerElement = $element[0]
                            .getElementsByClassName('sdm-table-content')[0]
                            .getElementsByClassName('container')[0];

                        $scope.headersTitles = getHeaderTitles($scope.sdmHeaders);

                        sdmCellOnHover = function(data) {
                            console.log('data', data);
                            if (typeof this.sdmCellCompiled === 'undefined') {
                                var newScope = $rootScope.$new();
                                newScope.data = data;
                                $compile(this.parentElement)(newScope);
                                this.sdmCellCompiled = true;
                            }
                        };

                        var actions = $scope.sdmActions();
                        actions.getLeaves = sdmFilterTree.filter;
                        actions.selector = sdmFilterTree.selector;

                        sdmD3Service.d3().then(function(_d3) {
                            d3 = _d3;
                            $scope.$watch('trigger', function(){
                                console.log('scope.data', $scope.sdmData);
                                console.log('scope.trigger', $scope.trigger);
                                if (typeof $scope.sdmData !== 'undefined'){
                                    updateView(
                                        containerElement,
                                        $scope.sdmData.data,
                                        actions,
                                        $scope.trigger,
                                        $scope.trigger.all?selectAllNodes:null);
                                }

                                var getFilter = sdmFilterTree.getFilter;
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
                                        sdmFilterTree.createFilter(
                                            header,
                                            header.filter.string,
                                            header.filter.excluded);
                                    }
                                    if (typeof $scope.sdmData !== 'undefined'){
                                        updateView(
                                            containerElement,
                                            $scope.sdmData.data,
                                            actions,
                                            $scope.trigger,
                                            selectAllNodes);
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

    var selectAllNodes = function (node) {
        return true;
    };

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

    var refresh;
    var rowEntered = {leaf: null, element: null};

    var updateView = function(rootElement, data, actions, trigger, selector) {

        refresh = function(selector) {
            return updateView(rootElement, data, actions, trigger, selector)
        };

        sessionKey = trigger.sessionKey?trigger.sessionKey:-1;
        var leaves = actions.getLeaves(data);

        var rows = d3.select(rootElement)
            .selectAll('div.d3row')
            .data(leaves, generateLeafKey);

        rows.exit().remove();

        if (selector){
            rows.filter(selector).each(updateRow(actions));
        }
        rows.enter()
            .insert('div')
            .classed('row', true)
            .classed('d3row', true)
            .on('mouseenter', function (leaf){
                if (rowEntered.leaf) {
                    rowEntered.leaf.fullLine = false;
                    updateRow(actions).call(rowEntered.element, rowEntered.leaf);
                }
                leaf.fullLine = true;
                updateRow(actions).call(this, leaf);
                rowEntered.leaf = leaf;
                rowEntered.element = this;
            })
            .each(updateRow(actions));

        rows.classed('grey', function(d, i){ return (i + 1)%2;});

        return rows;
    };


    var updateRow = function (actions) {
        return function(leaf) {
            if (leaf.fullLine) {
                rowEntered.leaf = leaf;
                rowEntered.element = this;
            }
            var dataRow = createDataRow(leaf);

            this.style['font-weight'] = leaf.fullLine?'bold':'normal';

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
                //console.log('property', p);
                if (d.show) {
                    if (i === 0){
                        //console.log('d3', d.name, d);
                        d.indeterminate = !d.checked && d.childrenChecked + d.childrenIndeterminate > 0;
                        d3Element.append('input').attr({
                            'type': 'checkbox'
                        }).property({
                            'checked': d.checked||false,
                            'indeterminate': d.indeterminate
                        }).on('click', function(d){
                            actions.selector(d);
                            refresh(selectAllNodes);
                        });
                    }
                    //
                    var d3Text = d3Element.append('div')
                        .classed('content', true)
                        .classed(UNDEFINED_PLACEHOLDER, function(){return typeof value === 'undefined';})
                        .append('span');

                    if (d.level.name.search(/^(sessions|projects|collections|acquisitions)$/) >= 0){
                            d3Text.attr({
                                'sdm-popover': '',
                                'sdm-popover-class': 'sdm-info-toolbar',
                                'sdm-popover-template-content': 'components/infoToolbar/infoToolbarPopover.html',
                                'sdm-popover-dynamic-position': 'false',
                                'sdm-popover-style-width': '64px',
                                'sdm-popover-style-height': '28px',
                                'sdm-popover-style-top': '24px',
                                'sdm-popover-show': 'mouseenter',
                                'sdm-popover-hide': 'mouseleave',
                                'sdm-popover-show-timeout': '400'
                            }).on('mouseover', sdmCellOnHover, true);
                    }

                    d3Text
                    .append('span')
                    .classed('text', true)
                    //.style('color', globalTableTextColor)
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
            node.parent.show = addParentNameToRow || leaf.fullLine;
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
