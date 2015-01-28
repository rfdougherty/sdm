'use strict';

(function() {
    angular.module('sdm.infoToolbar.directives.sdmInfoModal',
            ['sdm.services', 'sdm.download.services.sdmDownloadInterface'])
        .directive('sdmInfoModal', ['$location', 'makeAPICall', 'sdmDownloadInterface',
            function($location, makeAPICall, sdmDownloadInterface) {
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
                        console.log(path);
                        sdmIMController.path = path.slice(1);
                        sdmIMController.title = level.slice(0, level.length - 1) + ' ' + node.name;
                        makeAPICall.async(APIUrl, {site: node.site}).then(
                            function (apiData) {
                                sdmIMController.data = node.level.getModalData(node, apiData);
                                apiData.files.sort(function(file, file1){
                                    return file.type===file1.type?0:file.type>file1.type?1:-1 });
                                sdmIMController.files = apiData.files||[];
                                console.log(apiData.permissions);

                                console.log(sdmIMController);
                            });

                        sdmIMController.download = function(file) {
                            node = {
                                level: level.slice(0, level.length - 1),
                                _id: node.id,
                                file: file
                            };
                            sdmDownloadInterface.getDownloadURL(node, true).then(function(url){
                                window.open(url, '_self');
                            });
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
