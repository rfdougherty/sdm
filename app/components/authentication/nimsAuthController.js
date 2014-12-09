'use strict';

var nimsAuthControllers = angular.module('sdm.authentication.controllers',
    ['sdm.authentication.services.sdmUserManager']);
var _auth_data;

nimsAuthControllers.controller('LoginController', [
    '$scope', 'sdmUserManager',
    function($scope, sdmUserManager) {
        $scope.gravatarURL = GRAVATAR_IMG_URL;
        $scope.authenticate = function(){
            sdmUserManager.authenticate().then(
                function(result){
                    angular.extend($scope, result);
                });
        };

        $scope.toggleSuperUser = function(){
            sdmUserManager.toggleSuperUser().then(
                function(result){
                    angular.extend($scope, result);
                });
        };

        $scope.logout = function(){
            angular.extend($scope, sdmUserManager.logout());
        };

        $scope.getAuthData= function(){
            return sdmUserManager.getAuthData();
        };


        $scope.$watch(function(){
            var userData = sdmUserManager.getAuthData();

            return userData?userData.logged_in:null;
        }, function(newVal, oldVal){
            if (typeof newVal !== 'undefined') {
                $scope.logged_in = newVal;
            }
        });

        var authData = sdmUserManager.getAuthData();
        if (typeof authData !== 'undefined') {
            sdmUserManager.login(authData.access_token).then(
            function(newAuthData){
                console.log('newAuthData', newAuthData);
                angular.extend($scope, newAuthData);
                $scope.emailHash = $scope.email_hash;
            });
        }
    }]);
