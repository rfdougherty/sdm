'use strict';

(function() {
    angular.module('sdm.download.directives.sdmDownloadModal',['sdm.download.services.sdmDownloadInterface',
        'sdm.createCollection.services.sdmGetSelection'])
        .directive('sdmDownloadModal', ['sdmDownloadInterface', 'sdmGetSelection',
            function (sdmDownloadInterface, sdmGetSelection) {
                return {
                    restrict: 'E',
                    scope: false,
                    replace: false, // Replace with the template below
                    transclude: false,// we want to insert custom content inside the directive
                    controller: function(){},
                    controllerAs: 'sdmDLController',
                    link: function($scope, $element, $attrs, sdmDLController){
                        var selectionPromise = sdmGetSelection.getSelection();
                        $scope.$parent.disableEvents();
                        sdmDLController.cancel = function ($event) {
                            $event.stopPropagation();
                            $event.preventDefault();
                            $scope.$parent.enableEvents();
                            $scope.$parent._hidePopover($event, 0);
                        };
                        sdmDLController.updateLink = function() {
                            selectionPromise.then(function (selection) {
                                console.log('selection', selection);
                                if (selection.length){
                                    sdmDownloadInterface.getDownloadURL(selection, false, sdmDLController.optional).then(function(response){
                                        console.log(response);
                                        sdmDLController.downloadURL = response.url;
                                        sdmDLController.fileCount = response.file_cnt;
                                        sdmDLController.size = response.size;
                                    });
                                }
                            });
                        }
                        sdmDLController.updateLink();
                        sdmDLController.download = function($event) {
                            window.open(sdmDLController.downloadURL, '_self');
                            $event.stopPropagation();
                            $event.preventDefault();
                            $scope.$parent.enableEvents();
                            $scope.$parent._hidePopover($event, 0);
                        }
                    }
                }
            }]);
})()
