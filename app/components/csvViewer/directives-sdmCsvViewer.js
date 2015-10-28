'use strict';
(function(){
    angular.module('sdm.csvViewer.directives.sdmCsvViewer',
        []).directive('sdmCsvViewer', ['$q', 'sdmCsvParser', function ($q, sdmCsvParser) {
            return {
                restrict: "E",
                scope: {
                    sdmTicketUrl: '=',
                    mimetype: '='
                },
                //templateUrl: 'components/csvViewer/csvViewerTemplate.html',
                transclude: false,
                replace: false,
                link: function ($scope, $element) {
                    $scope.$parent.data = [];
                    var isFirstCall = true;
                    var unbindWatcher = $scope.$watch('sdmTicketUrl', initViewer);
                    function initViewer(ticketUrl, oldTicket) {
                        console.log(ticketUrl, oldTicket);
                        if (ticketUrl !== oldTicket || isFirstCall) {
                            isFirstCall = false;
                            if ($scope.mimetype === 'text/tab-separated-values') {
                                var parser = d3.tsv;
                            } else if ($scope.mimetype === 'text/csv') {
                                var parser = d3.csv;
                            } else {
                                return
                            }
                            parser(ticketUrl, function(error, data){
                                console.log(data);
                                var keys = Object.keys(data[0]);
                                var chart = c3.generate({
                                    bindto: '#csv-chart',
                                    size: {
                                        height: $element.find('.csv-chart-container').height() - 5
                                    },
                                    data: {
                                        json: data,
                                        keys: {
                                            value: Object.keys(data[0])
                                        }
                                    },
                                    axis: {
                                        x: {
                                            tick: {
                                                format: function(x){}
                                            }
                                        },
                                        y: {
                                            min: 0.1,
                                        }
                                    }
                                });
                                $scope.$parent.csvHideAll = function(){
                                    chart.hide(keys);
                                }
                                $scope.$parent.csvShowAll = function(){
                                    chart.show(keys);
                                }
                            });

                            sdmCsvParser(ticketUrl, $scope.mimetype).then(function(data){
                                console.log(data);
                                $scope.$parent.data = data;
                            })

                            unbindWatcher();
                        }
                    }
                }
            }
        }]);
})();

