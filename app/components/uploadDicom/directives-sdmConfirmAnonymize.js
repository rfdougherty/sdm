'use strict';

(function() {
    angular.module('sdm.uploadDicom.directives.sdmConfirmAnonymize',
        []).directive('sdmConfirmAnonymize',
        [function() {
            return {
                restrict: 'E',
                scope: false,
                replace: false,
                transclude: false,
                controller: function(){},
                controllerAs: 'sdmCAController',
                link: function($scope, $element, $attrs, sdmCAController) {
                    $scope.$parent.disableEvents();
                    //console.log($scope);

                    sdmCAController.cancel = function($event) {
                        $scope.$parent.$parent.data.anonymize = true;

                        $scope.$parent._hidePopover($event, 0);
                    }

                    sdmCAController.confirm = function($event) {
                        $scope.$parent.$parent.data.anonymize = false;
                        $scope.$parent._hidePopover($event, 0);
                    }
                }
            }
        }]
    );
})();
