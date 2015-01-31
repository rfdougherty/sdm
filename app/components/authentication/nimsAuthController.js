'use strict';

var nimsAuthControllers = angular.module('sdm.authentication.controllers',
    ['sdm.authentication.services.sdmUserManager']);
var _auth_data;
var _user_manager;

nimsAuthControllers.controller('LoginController', [
    '$scope', 'sdmUserManager',
    function($scope, sdmUserManager) {
        $scope.gravatarURL = GRAVATAR_IMG_URL;

        $scope.authenticate = function(){
            sdmUserManager.authenticate().catch(function(status){
                console.log(status);
            });
        };
        $scope.toggleSuperUser = sdmUserManager.toggleSuperUser;
        $scope.logout = sdmUserManager.logout;
        $scope.getAuthData= sdmUserManager.getAuthData;

        $scope.userData = sdmUserManager.getAuthData();

        if (typeof $scope.userData.access_token !== 'undefined') {
            sdmUserManager.login($scope.userData.access_token);
        }
    }]);
