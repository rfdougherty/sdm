'use strict';

(function(){
    var d3;
    var sdmCellOnHover;
    var scope;
    var calculateTextWidth;

    angular.module('sdm.dataVisualizations.directives.sdmTableView',
        ['sdm.services', 'sdm.dataFiltering.services.sdmFilterTree',
        'sdm.main.services.sdmViewManager'])
    .directive('sdmTableView',
        ['$compile', '$location', '$rootScope',
        'sdmD3Service', 'sdmFilterTree', 'sdmViewManager', 'sdmTextWidthCalculator',
        function($compile, $location, $rootScope, sdmD3Service,
                 sdmFilterTree, sdmViewManager, sdmTextWidthCalculator) {
            return {
                // name: '',
                // priority: 1,
                // terminal: true,
                scope: {
                    sdmData: '=',
                    trigger: '=sdmTrigger'
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
                        scope = $scope;
                        var currentPath = $location.path();
                        sdmFilterTree.setView(currentPath.substring(1, currentPath.length));
                        var containerElement = $element[0]
                            .getElementsByClassName('sdm-table-content')[0]
                            .getElementsByClassName('container')[0];

                        $scope.headersTitles = getHeaderTitles(sdmViewManager.headers());

                        sdmCellOnHover = function(data) {
                            if (typeof this.parentElement.sdmCellCompiled === 'undefined') {
                                console.log('sdmCellOnHover');
                                var newScope = $rootScope.$new();
                                newScope.data = data;
                                $compile(this.parentElement)(newScope);
                                this.parentElement.sdmCellCompiled = true;
                            }
                        };

                        var actions = {
                            expandNode: sdmViewManager.expandNode,
                            getLeaves: sdmFilterTree.filter,
                            selector: sdmFilterTree.selector
                        };

                        calculateTextWidth = sdmTextWidthCalculator;

                        sdmD3Service.init().then(function(_d3){
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

    var headerTitles;

    var getHeaderTitles = function(headers) {
        headerTitles = [];
        angular.forEach(headers, function(value, key){
            if (value.headers) {
                var newTitles = value.headers.map(function(header, i, a){
                    var result = {
                        title: header,
                        name: header.toLowerCase() + 's',
                        nospace: i !== a.length - 1,
                        showcount: i === 0,
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
        }, headerTitles);
        return headerTitles;
    };

    var sessionKey;

    var refresh;
    var rowEntered = {leaf: null, element: null, timer: null};

    var updateView = function(rootElement, data, actions, trigger, selector) {

        refresh = function(selector) {
            return updateView(rootElement, data, actions, trigger, selector)
        };

        sessionKey = trigger.sessionKey?trigger.sessionKey:-1;
        var parsedData = actions.getLeaves(data);
        var leaves = parsedData.leaves;
        headerTitles.forEach(function(header){
            if (header.showcount) {
                header.count = parsedData.counts[header.name]||0;
            }
        });

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

    var _addClass = function(element) {
    };


    var updateRow = function (actions) {
        return function(leaf) {
            if (leaf.fullLine) {
                rowEntered.leaf = leaf;
                rowEntered.element = this;
            }
            var dataRow = createDataRow(leaf);

            if (leaf.fullLine) {
                this.classList.add('full-line');
            } else {
                this.classList.remove('full-line');
            };

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
                    if (i === 0 && !d.hideGlyphs){
                        d.indeterminate = !d.checked && d.childrenChecked + d.childrenIndeterminate > 0;
                        d3Element.append('input').attr({
                                'type': 'checkbox'
                            }).property({
                                'checked': d.checked||false,
                                'indeterminate': d.indeterminate
                            }).attr('class', function(d) {
                                return d.defaultView?'':d.userAccess + '-access';
                            }).on('click', function(d){
                                actions.selector(d);
                                refresh(selectAllNodes);
                                scope.$apply();
                            }).on('mouseenter', function(d){
                                if (!d.defaultView) {
                                    checkboxTooltip.attr({
                                        'class': 'd3-tooltip d3-show'
                                    })
                                }
                            }).on('mouseleave', function(d){
                                if (!d.defaultView) {
                                    checkboxTooltip.attr({
                                        'class': 'd3-tooltip d3-hide'
                                    })
                                }
                            });

                        var text = function(access) {
                            if (access === 'rw') {
                                return 'read-write-access';
                            } else if (access === 'ro') {
                                return 'read-only-access';
                            } else {
                                return access + '-access';
                            }
                        };
                        var checkboxTooltip = d3Element.append('div').attr({
                                'class': 'd3-tooltip d3-hide'
                            }).style('width', function(d){
                                return calculateTextWidth(text(d.userAccess)) + 6 + 'px';
                            }).style('left', function(d) {
                                var width = calculateTextWidth(text(d.userAccess)) + 6;
                                return (8 - width/2) +'px';
                            }).text(function(d){
                                return text(d.userAccess);
                            });
                    }
                    var d3DivContent = d3Element.append('div')
                        .classed('content', true);
                    var d3Text = d3DivContent
                        .append('span');

                    if (d.level.name.search(/^(sessions|projects|collections|acquisitions)$/) >= 0){
                        d3Text.attr({
                            'sdm-popover': '',
                            'sdm-popover-class': 'sdm-info-toolbar',
                            'sdm-popover-template-content': 'components/infoToolbar/infoToolbarPopover.html',
                            'sdm-popover-dynamic-position': 'false',
                            'sdm-popover-style-width': '46px',
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
                        .classed('no-access', function(d) {
                            return d.userAccess === 'no' && !d.defaultView;
                        })
                        .text(value||UNDEFINED_PLACEHOLDER);

                    if (i === a.length - 1 && !d.hideGlyphs){
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
                    if (i === 0 && d.notes) {
                        d3DivContent.style({'width':'70%'});
                        // IMPORTANT: data in this tooltip is added to its scope in the sdmCellOnHover function
                        d3Element.append('div').append('span').attr({
                            'class': 'glyphicon nav-glyph expander glyphicon-comment',
                            'sdm-popover': '',
                            'sdm-popover-class': 'sdm-info-toolbar sdm-note-tooltip',
                            'sdm-popover-template-content': 'components/infoToolbar/notesTooltip.html',
                            'sdm-popover-dynamic-position': 'false',
                            'sdm-popover-style-width': '250px',
                            'sdm-popover-style-height': '13ex',
                            'sdm-popover-style-top': '8px',
                            'sdm-popover-show': 'mouseenter',
                            'sdm-popover-hide': 'mouseleave',
                            'sdm-popover-show-timeout': '400',
                        }).on('mouseenter', sdmCellOnHover, true);;
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
            node.parent.hideGlyphs = !addParentNameToRow && leaf.fullLine;
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
