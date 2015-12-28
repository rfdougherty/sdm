'use strict';

(function() {
    angular.module('sdm.treedata.directives.sdmTreeDataModal',[
        'sdm.createCollection.services.sdmGetSelection'])
        .directive('sdmTreeDataModal', ['sdmGetSelection',
            function (sdmGetSelection) {
                return {
                    restrict: 'E',
                    scope: false,
                    replace: false, // Replace with the template below
                    transclude: false,// we want to insert custom content inside the directive
                    controller: function(){},
                    controllerAs: 'sdmTDController',
                    link: function($scope, $element, $attrs, sdmTDController){
                        sdmTDController.loadingState = -1;
                        var selectionPromise = sdmGetSelection.getTreeData();
                        $scope.$parent.disableEvents();
                        sdmTDController.cancel = function ($event) {
                            $event.stopPropagation();
                            $event.preventDefault();
                            $scope.$parent.enableEvents();
                            $scope.$parent._hidePopover($event, 0);
                        };
                        sdmTDController.updateLink = function() {
                            sdmTDController.loadingState = 1;
                            selectionPromise.then(function (selection) {
                                sdmTDController.selection = JSON.stringify(selection, null, '\t');
                                console.log('treeData selection', selection);

                                sdmTDController.loadingState -= 1;
                            });
                        }
                        sdmTDController.open = function ($event) {
                            $event.stopPropagation();
                            $event.preventDefault();
                            var blob = new Blob([sdmTDController.selection], {type: 'text/plain'});
                            var treeDataURL = URL.createObjectURL(blob);
                            window.open(treeDataURL, '_blank');
                            $scope.$parent.enableEvents();
                            $scope.$parent._hidePopover($event, 0);
                        };
                        sdmTDController.save = function ($event) {
                            $event.stopPropagation();
                            $event.preventDefault();
                            var blob = new Blob([sdmTDController.selection], {type: 'octet/stream'});
                            var treeDataURL = URL.createObjectURL(blob);
                            window.open(treeDataURL, '_blank');
                            $scope.$parent.enableEvents();
                            $scope.$parent._hidePopover($event, 0);
                        };
                        sdmTDController.updateLink();
                    }
                }
            }]);
})()