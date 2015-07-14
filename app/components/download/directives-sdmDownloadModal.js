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
                        sdmDLController.loadingState = -1;
                        var selectionPromise = sdmGetSelection.getSelection();
                        $scope.$parent.disableEvents();
                        sdmDLController.cancel = function ($event) {
                            $event.stopPropagation();
                            $event.preventDefault();
                            $scope.$parent.enableEvents();
                            $scope.$parent._hidePopover($event, 0);
                        };
                        sdmDLController.updateLink = function() {
                            sdmDLController.loadingState = 1;
                            selectionPromise.then(function (selection) {
                                console.log('selection', selection);
                                if (selection.length){
                                    sdmDownloadInterface.getDownloadURL(selection, false, sdmDLController.optional).then(function(response){
                                        console.log(response);
                                        sdmDLController.downloadURL = BASE_URL + 'download?ticket=' + response.ticket;
                                        sdmDLController.fileCount = response.file_cnt;
                                        sdmDLController.size = response.size;
                                        sdmDLController.loadingState--;
                                        sdmDLController.loadedOnce = true;
                                    });
                                } else {
                                    sdmDLController.loadedOnce = true;
                                    sdmDLController.fileCount = 0;
                                    sdmDLController.size = '0 Bytes';
                                    sdmDLController.loadingState--;
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
