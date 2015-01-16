'use strict';

angular.module('sdm.APIServices.services.sdmUsers', ['sdmHttpServices'])
    .factory('sdmUsers', ['$q', 'makeAPICall', function($q, makeAPICall){
        var userData = {};
        var refreshUsers = function () {
            var d = $q.defer();
            userData = {};
            var url = BASE_URL + 'users';
            makeAPICall.async(url).then(function(users){
                users.forEach(function(user){
                    userData[user._id] = user;
                });
                d.resolve(userData);
            });
            return d.promise;
        };

        var userUpdater;

        var refreshImmediate = function () {
            if (userUpdater){
                clearInterval(userUpdater);
            }
            var userPromise = refreshUsers();
            userUpdater = setInterval(refreshUsers, 30000);
            return userPromise;
        };

        var getUsers = function() {
            return userData;
        };



        return {
            refreshImmediate: refreshImmediate,
            getUsers: getUsers
        }
    }]);
