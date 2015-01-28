'use strict';

(function() {
    angular.module('sdm.download.directives.sdmDownloadModal',['sdm.download.services.sdmDownloadInterface'])
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
                        $scope.$parent.dialogStyle.height = '500px';//100px';
                        $scope.$parent.dialogStyle.width = '600px';//280px';
                        var selectionPromise = sdmGetSelection.getSelection();
                        $scope.$parent.disableEvents();
                        sdmDLController.cancel = function ($event) {
                            $event.stopPropagation();
                            $event.preventDefault();
                            $scope.$parent.enableEvents();
                            $scope.$parent._hidePopover($event, 0);
                        };
                        sdmDLController.updateLink = function() {
                            selectionPromise.then(function(selection){
                                console.log('selection', selection);
                                if (selection.length){
                                    sdmDownloadInterface.getDownloadURL(selection, sdmDLController.optional).then(function(url){
                                        console.log(url);
                                        //sdmDLController.downloadURL = BASE_URL + 'download?ticket=' + ticket;
                                    });
                                }
                            });
                        }
                        sdmDLController.updateLink();
                    }
                }
            }]);
})()
