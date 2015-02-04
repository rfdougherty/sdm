'use strict';

(function() {
    angular.module('sdm.infoToolbar.directives.sdmInfoToolbar',
            ['sdm.APIServices.services.sdmCollectionsInterface',
             'sdm.main.services.sdmViewManager'])
        .directive('sdmInfoToolbar', [ '$location', 'sdmCollectionsInterface', 'sdmViewManager',
            function($location, sdmCollectionsInterface, sdmViewManager) {
                return {
                    restrict: 'E',
                    scope: false,
                    replace: false, // Replace with the template below
                    transclude: false,// we want to insert custom content inside the directive
                    controller: function(){},
                    controllerAs: 'sdmTBController',
                    link: function($scope, $element, $attrs, sdmTBController){

                        $scope.data = $scope.$parent.$parent.data;
                        console.log($scope.data);
                        $scope.hideToolbar = $scope.$parent.hidePopover;
                        console.log($scope);
                        sdmTBController.location = $location.path();
                        sdmTBController.delete = function(){
                            if ($scope.data.level.name === 'collections') {
                                sdmCollectionsInterface.deleteCollection($scope.data.id).then(function(){
                                    sdmViewManager.refreshView('collections');
                                });
                            }
                            $scope.hideToolbar(null, 0);
                        }
                    }
                }
            }
            ]
        );
})();
