'use strict';

(function() {
    angular.module('sdm.userPreferences.directives.sdmUpdateUserPreferences',
            ['sdm.authentication.services.sdmUserManager'])
        .directive('sdmUpdateUserPreferences', ['sdmUserManager',
            function(sdmUserManager) {
                return {
                    restrict: 'E',
                    scope: false,
                    replace: false, // Replace with the template below
                    transclude: false,// we want to insert custom content inside the directive
                    controller: function(){},
                    controllerAs: 'sdmUPController',
                    link: function($scope, $element, $attrs, controller) {
                        controller.cancel = function($event) {
                            $event.stopPropagation();
                            $event.preventDefault();
                            controller.editable = false;
                            var userData = sdmUserManager.getAuthData();
                            controller.firstname = userData.firstname;
                            controller.lastname = userData.lastname;
                            controller.user_uid = userData.user_uid;
                            controller.avatar = userData.avatar;
                            controller.avatarTemp = userData.avatar;

                            $scope.$parent.enableEvents();
                        };
                        controller.makeEditable = function($event) {
                            $event.stopPropagation();
                            $event.preventDefault();
                            controller.editable = true;
                            $scope.$parent.disableEvents();
                        };
                        var userData = sdmUserManager.getAuthData();
                        controller.gravatarURL = GRAVATAR_IMG_URL;
                        controller.editable = false;
                        controller.firstname = userData.firstname;
                        controller.lastname = userData.lastname;
                        controller.user_uid = userData.user_uid;
                        controller.avatar = userData.avatar;
                        controller.avatarTemp = userData.avatar;
                        controller.email = userData.email;
                        sdmUserManager.getUserDataFromAPI().then(function(userData) {
                            controller.firstname = userData.firstname;
                            controller.lastname = userData.lastname;
                            controller.user_uid = userData.user_uid;
                            controller.avatar = userData.avatar;
                            controller.avatarTemp = userData.avatar;
                            controller.email = userData.email;
                            console.log(userData);
                            console.log('user preferences popover created');
                            controller.save = function($event) {
                                $event.stopPropagation();
                                $event.preventDefault();
                                var data = {
                                    firstname: controller.firstname,
                                    lastname: controller.lastname,
                                    email: controller.email,
                                    avatar: controller.avatarTemp
                                }
                                sdmUserManager.updateUserData(data).then(function(){
                                    controller.editable = false;
                                    controller.avatar = controller.avatarTemp;
                                    $scope.$parent.enableEvents();
                                });
                            };
                        });
                    }
                }
            }]
        );
})();
