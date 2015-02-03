'use strict';

(function() {
    angular.module('sdm.authentication.directives.sdmNewUser',
        ['sdm.authentication.services.sdmUserManager']).directive('sdmNewUser',
        ['sdmUserManager', function(sdmUserManager) {
            return {
                restrict: 'E',
                scope: false,
                replace: false, // Replace with the template below
                transclude: false,// we want to insert custom content inside the directive
                controller: function(){},
                controllerAs: 'sdmNUController',
                link: function($scope, $element, $attrs, sdmNUController) {
                    $scope.$parent.enableEvents();
                    sdmNUController.username = $scope.$parent.$parent.username;
                    sdmNUController.close = function($event) {
                        sdmUserManager.logout();
                        $scope.$parent._hidePopover($event, 0);
                    }
                }
            }
        }]
    );
})();
