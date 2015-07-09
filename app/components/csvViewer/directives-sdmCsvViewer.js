'use strict';
(function(){
    var isFirstCall = true;
    angular.module('sdm.csvViewer.directives.sdmCsvViewer',
        []).directive('sdmCsvViewer', ['$q', 'sdmCsvParser', function ($q, sdmCsvParser) {
            return {
                restrict: "E",
                scope: {
                    sdmTicketUrl: '=',
                    mimetype: '='
                },
                templateUrl: 'components/csvViewer/csvViewerTemplate.html',
                replace: true,
                link: function ($scope) {
                    $scope.data = [];
                    var unbindWatcher = $scope.$watch('sdmTicketUrl', initViewer);
                    function initViewer(ticketUrl, oldTicket) {
                        console.log(ticketUrl, oldTicket);
                        if (ticketUrl !== oldTicket || isFirstCall) {
                            isFirstCall = false;
                            sdmCsvParser(ticketUrl, $scope.mimetype).then(function(data){
                                console.log(data);
                                $scope.data = data;
                            })
                            unbindWatcher();
                        }
                    }
                }
            }
        }]);
})();

