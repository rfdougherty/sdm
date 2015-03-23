'use strict';

(function() {
    angular.module('sdm.infoToolbar.directives.sdmInfoToolbar',
            ['sdm.APIServices.services.sdmCollectionsInterface',
             'sdm.main.services.sdmViewManager'])
        .directive('sdmInfoToolbar', [ '$location', '$compile', 'sdmCollectionsInterface', 'sdmViewManager',
            function($location, $compile, sdmCollectionsInterface, sdmViewManager) {
                return {
                    restrict: 'E',
                    scope: false,
                    replace: false, // Replace with the template below
                    transclude: false,// we want to insert custom content inside the directive
                    controller: function(){},
                    controllerAs: 'sdmTBController',
                    link: function($scope, $element, $attrs, sdmTBController) {
                        $scope.data = $scope.$parent.$parent.data;
                        console.log($scope.data);
                        $scope.hideToolbar = $scope.$parent.hidePopover;
                        console.log($scope);
                        sdmTBController.location = $location.path();
                        var appended;
                        var originalWidth;
                        sdmTBController.toggleDeleteButton = function(){
                            if ($scope.data.level.name === 'collections') {
                                if (appended) {
                                    appended.remove();
                                    $scope.$parent.dialogStyle.width = originalWidth;
                                    appended = null;
                                } else {
                                    var button = '<input type="button"' +
                                        ' id="info-toolbar-delete" class="btn btn-default btn-xs btn-danger"' +
                                        ' ng-click="sdmTBController.delete($event)"' +
                                        ' value="Delete"></input>';
                                    appended = $compile(button)($scope);
                                    $element.append(appended);
                                    originalWidth = $scope.$parent.dialogStyle.width;
                                    $scope.$parent.dialogStyle.width = '89px';
                                }
                            }
                        };
                        sdmTBController.delete = function(){
                            if ($scope.data.level.name === 'collections') {
                                sdmCollectionsInterface.deleteCollection($scope.data.id).then(function(){
                                    sdmViewManager.refreshView('collections');
                                });
                            }
                            $scope.hideToolbar(null, 0);
                        };
                    }
                }
            }
            ]
        );
})();
