'use strict';

var nimsAuthControllers = angular.module('sdm.authentication.controllers',
    ['sdm.authentication.services.sdmUserManager',
    'sdm.main.services.sdmViewManager']);

nimsAuthControllers.controller('LoginController', [
    '$scope', 'sdmUserManager', 'sdmViewManager',
    function($scope, sdmUserManager, sdmViewManager) {
        $scope.gravatarURL = GRAVATAR_IMG_URL;
        $scope.userData = sdmUserManager.getAuthData();

        $scope.authenticate = function(){
            sdmUserManager.authenticate().then(function(){
                $scope.userData = sdmUserManager.getAuthData();
                sdmViewManager.initialize();
                sdmViewManager.updateViewAppearance($scope.userData.preferences)
            });
        };
        $scope.toggleSuperUser = function(){
            sdmUserManager.toggleSuperUser().then(function(){
                sdmViewManager.initialize();
            });
        }
        $scope.logout = function(){
            sdmUserManager.logout();
            sdmViewManager.initialize();
        }


        if (typeof $scope.userData.access_token !== 'undefined') {
            sdmUserManager.login($scope.userData.access_token);
        }
    }]);
