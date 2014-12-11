'use strict';


(function(){
    var d3;

    angular.module('sdm.treeViews.directives.sdmTableView',
        ['sdmD3Service', 'sdm.dataFiltering.services.sdmFilterTree'])
    .directive('sdmTableView', ['sdmD3Service', 'sdmFilterTree',
        function(sdmD3Service, sdmFilterTree){

            // Runs during compile
            return {
                // name: '',
                // priority: 1,
                // terminal: true,
                scope: {
                    sdmData: '=',
                    trigger: '=sdmTrigger',
                    sdmExpandNode: '&',
                    sdmHeaders: '=',
                    sdmFilter: '='
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
                                        ' ng-repeat="header in headersTitles" ng-class="{nospace:header.nospace}">' +
                                        '<div class="content">' +
                                            '{{header.title}}' +
                                        '</div>' +
                                        '<div class="filter">' +
                                            '<button type="button" class="btn btn-default btn-xs exclude" ng-show="header.filter.string" ' +
                                                'ng-click="filterExclude(header)" ' +
                                                'ng-keyup="clearESC($event, header)">' +
                                                '<span class="glyphicon"' +
                                                ' ng-class="{\'glyphicon-plus-sign\':!header.filter.excluded,' +
                                                            '\'glyphicon-minus-sign\':header.filter.excluded}">' +
                                                '</span>' +
                                            '</button>' +
                                            '<input type="text" ng-model="header.filter.string" ' +
                                                    'ng-model-options = "{ debounce: 100 }" ' +
                                                    'placeholder="filter" ng-change="setFilter(header)" ' +
                                                    'ng-keyup="clearESC($event, header)">' +
                                            '<button type="button" class="btn btn-default btn-xs remove" ng-show="header.filter.string" ng-click="clearFilter(header)">' +
                                                '<span class="glyphicon-remove glyphicon">' +
                                                '</span>' +
                                            '</button>' +
                                        '</div>' +
                                    '</div>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div id="sdm-main-table-content" class="sdm-table-content">' +
                            '<div class="container"></div>' +
                        '</div>' +
                    '</div>',
                // templateUrl: '',
                replace: true,
                // transclude: true,
                link: {
                    post: function($scope, $element) {
                        var containerElement = $element[0]
                            .getElementsByClassName('sdm-table-content')[0]
                            .getElementsByClassName('container')[0];

                        $scope.headersTitles = getHeaderTitles($scope.sdmHeaders);


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
                                        $scope.sdmExpandNode(),
                                        $scope.trigger,
                                        filterSrv.filter);
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
                                            $scope.sdmExpandNode(),
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


    var updateView = function(rootElement, data, clickCallback, trigger, getLeaves, all) {
        sessionKey = trigger.sessionKey?trigger.sessionKey:-1;
        var leaves = getLeaves(data);

        var rows = d3.select(rootElement)
            .selectAll('div.d3row')
            .data(leaves, generateLeafKey);

        rows.exit().remove();

        if (all){
            rows.each(updateRow(clickCallback));
        }
        rows.enter()
            .insert('div')
            .classed('row', true)
            .classed('d3row', true)
            .each(updateRow(clickCallback));

        rows.classed('grey', function(d, i){ return (i + 1)%2;});

        //rows.exit().remove();

        return rows;
    };


    var updateRow = function (clickCallback) {
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

            createCell(selection, clickCallback);
        };
    };

    var createCell = function(selection, clickCallback) {
        selection.each(function(d){
            d3.keys(d.level.properties).forEach(function(p, i, a){
                var classed = [d.level.name, p, 'col col-md-2 col-sm-2 col-lg-2 col-xs-2'].join(' ');
                var d3Element = d3.select(this).append('div')
                    .classed(classed, true);
                var value = d[p];
                if (d.show) {
                    if (i === 0){
                        d3Element.append('input').attr('type', 'checkbox');
                    }
                    d3Element.append('span')
                        .classed('content', true)
                        .classed(UNDEFINED_PLACEHOLDER, function(){return typeof value === 'undefined';})
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
