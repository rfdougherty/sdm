'use strict';

(function() {
    angular.module('sdm.infoToolbar.directives.sdmInfoModal',
            ['sdm.services'])
        .directive('sdmInfoModal', ['$location', 'makeAPICall',
            function($location, makeAPICall) {
                return {
                    restrict: 'E',
                    scope: false,
                    replace: false, // Replace with the template below
                    transclude: false,// we want to insert custom content inside the directive
                    controller: function(){},
                    controllerAs: 'sdmIMController',
                    link: function($scope, $element, $attrs, sdmIMController){
                        $scope.$parent.dialogStyle.height = '500px';//100px';
                        $scope.$parent.dialogStyle.width = '600px';//280px';
                        var node = $scope.$parent.$parent.data;
                        var APIUrl = BASE_URL + node.level.name + '/' + node.id;
                        var level = node.level.name;
                        sdmIMController.data = {};
                        var path = [];
                        var n = node;
                        while (n.parent){
                            path.unshift(n.parent.level.name==='sessions'?n.parent.name + ' - ' + n.parent.subject:n.parent.name);
                            n = n.parent;
                        }
                        sdmIMController.baseUrl = BASE_URL + 'acquisitions/' + node.id + '/file';
                        sdmIMController.path = path.slice(1).join(' : ');
                        sdmIMController.title = level.slice(0, level.length - 1) + ' details';
                        makeAPICall.async(APIUrl, {site: node.site}).then(
                            function (apiData) {
                                sdmIMController.data = node.level.getModalData(node, apiData);
                                sdmIMController.files = apiData.files||[];
                                console.log(sdmIMController);
                            });

                        sdmIMController.download = function(file) {
                            var url = BASE_URL + 'acquisitions/' + node.id + '/file';
                            var data = {
                                name: file.name,
                                ext: file.ext
                            };
                            makeAPICall.async(url, {site: node.site,}, 'POST', data).then(function(response){
                                window.open(response.url, '_self');
                            })
                        };

                        sdmIMController.close = function ($event) {
                            $scope.$parent.enableEvents();
                            $scope.$parent._hidePopover($event, 0);
                        };
                    }
                }
            }
            ]
        );
})();
