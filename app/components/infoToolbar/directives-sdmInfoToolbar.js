'use strict';

(function() {
    angular.module('sdm.infoToolbar.directives.sdmInfoToolbar',
            [])
        .directive('sdmInfoToolbar', [ '$location',
            function($location) {
                return {
                    restrict: 'E',
                    scope: false,
                    replace: false, // Replace with the template below
                    transclude: false,// we want to insert custom content inside the directive
                    controller: function(){},
                    controllerAs: 'sdmTBController',
                    link: function($scope, $element, $attrs, controller){
                        $scope.data = $scope.$parent.$parent.data;
                        console.log($scope);
                        controller.showinfo = function() {
                            console.log($scope.$parent.$parent.data);
                        }
                        controller.location = $location.path();
                    }
                }
            }
            ]
        );
})();
