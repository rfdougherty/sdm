'use strict';

angular.module('sdm.APIServices.services.sdmUsers', ['sdmHttpServices'])
    .factory('sdmUsers', ['$q', 'makeAPICall', function($q, makeAPICall){
        var userData = {};
        var timestamp;
        var refreshUsers = function () {
            var d = $q.defer();
            userData = {};
            var url = BASE_URL + 'users';
            makeAPICall.async(url).then(function(users){
                users.forEach(function(user){
                    userData[user._id] = user;
                });
                timestamp = Date.now();
                d.resolve(userData);
            });
            return d.promise;
        };

        if (!Date.now) {
            Date.now = function() { return new Date().getTime(); }
        }

        var getUsers = function () {
            var newTimestamp = Date.now();
            if (!timestamp || newTimestamp - timestamp > 60000) {
                timestamp = newTimestamp;
                return refreshUsers();
            } else {
                var d = $q.defer();
                d.resolve(userData);
                return d.promise
            }
        };

        return {
            getUsers: getUsers,
            refreshUsers: refreshUsers
        }
    }]);
