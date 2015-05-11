'use strict';

(function(){

    angular.module('sdm.dataVisualizations.directives.sdmTableView',
        ['sdm.services', 'sdm.dataFiltering.services.sdmFilterTree',
        'sdm.main.services.sdmDataManager',
        'sdm.dataVisualizations.services.sdmD3Interface'])
    .directive('sdmTableView',
        ['sdmD3Service', 'sdmDataManager', 'sdmFilterTree', 'SdmD3Interface',
        function(sdmD3Service, sdmDataManager, sdmFilterTree, SdmD3Interface) {
            return {
                scope: {
                    sdmData: '=',
                    trigger: '=sdmTrigger',
                    viewID: '=sdmViewId'
                },
                restrict: 'E',
                templateUrl: 'components/dataVisualizations/tableTemplate.html',
                replace: true,
                link: {
                    post: function($scope, $element, $attrs) {
                        var containerElement = $element[0]
                            .getElementsByClassName('sdm-table-content')[0]
                            .getElementsByClassName('container')[0];
                        console.log($scope);
                        $scope.headersTitles = sdmDataManager.getHeaderTitles($scope.viewID);

                        var colSize = "-" + Math.floor(16/($scope.headersTitles.length)) + ' ';

                        $scope.colConfig = ['col-md', 'col-xs', 'col-lg', 'col-sm', 'col'].join(colSize);

                        sdmD3Service.init().then(function(d3){
                            var sdmD3Interface = new SdmD3Interface(
                                containerElement,
                                $scope.viewID,
                                $scope.colConfig,
                                $scope.$apply.bind($scope),
                                d3
                            );
                            $scope.$watch('trigger', function(){
                                console.log('scope.data', $scope.sdmData);
                                console.log('scope.trigger', $scope.trigger);
                                if (typeof $scope.sdmData !== 'undefined'){
                                    sdmD3Interface.updateView(
                                        $scope.sdmData.data,
                                        $scope.trigger,
                                        true);
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
                                    sdmFilterTree.setView($scope.viewID);
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
                                        sdmD3Interface.updateView(
                                            $scope.sdmData.data,
                                            $scope.trigger,
                                            true);
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

})();
