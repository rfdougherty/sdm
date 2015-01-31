'use strict';

(function() {
    angular.module('sdm.authentication.directives.sdmLoginModal',
        ['sdm.authentication.services.sdmUserManager']).directive('sdmLoginModal',
        ['sdmUserManager', function(sdmUserManger){
            return {
                restrict: 'E',
                scope: false,
                replace: false, // Replace with the template below
                transclude: false,// we want to insert custom content inside the directive
                controller: function(){},
                controllerAs: 'sdmLMController',
                link: function($scope, $element, $attrs, sdmLMController) {
                    $scope.$parent.enableEvents();
                    sdmLMController.authenticate = function($event) {
                        return sdmUserManger.authenticate().then(function(){
                            $scope.$parent._hidePopover($event, 0);
                        });
                    };

                    sdmLMController.cancel = function($event) {
                        $scope.$parent._hidePopover($event, 0);
                    }
                }
            }
        }]
    );
})();
