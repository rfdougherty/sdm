'use strict';

(function(){
    angular.module('sdm.admin.directives.sdmCreateUser', ['sdm.admin.services.sdmAdminInterface'])
        .directive('sdmCreateUser', ['sdmAdminInterface',
            function(sdmAdminInterface) {
                return {
                    restrict: 'E',
                    scope: false,
                    replace: false, // Replace with the template below
                    transclude: false,// we want to insert custom content inside the directive
                    controller: function(){},
                    controllerAs: 'sdmCUController',
                    link: function($scope, $element, $attrs, sdmCUController) {
                        console.log($scope);
                        $scope.$parent.disableEvents();
                        sdmCUController.firstNamePlaceholder = 'Enter user first name';
                        sdmCUController.lastNamePlaceholder = 'Enter user last name';
                        sdmCUController.userIDPlaceholder = 'Enter user ID';
                        sdmCUController.emailPlaceholder = 'Enter user email (optional)';
                        sdmCUController.cancel = function ($event) {
                            $event.stopPropagation();
                            $event.preventDefault();
                            $scope.$parent.enableEvents();
                            $scope.$parent._hidePopover($event, 0);
                        };

                        sdmCUController.save = function ($event, form) {
                            $event.stopPropagation();
                            if (!form.$valid) {
                                console.log('form', form);
                                return;
                            }
                            sdmAdminInterface.createNewUser(
                                sdmCUController.userFirstName,
                                sdmCUController.userLastName,
                                sdmCUController.userID,
                                sdmCUController.email,
                                sdmCUController.superuser
                                ).then(function(){
                                    $scope.$parent.$parent.refreshUsers();
                                });
                            $scope.$parent.enableEvents();
                            $scope.$parent._hidePopover($event, 0);
                        }
                    }
                }
            }]);
})();
