'use strict';

angular.module('sdm.APIServices.services.sdmUsers', ['sdmHttpServices'])
    .factory('sdmUsers', ['$q', 'makeAPICall', function($q, makeAPICall){
        var userData = {};
        var timestamp= {};
        var refreshUsers = function (siteObj) {
            var d = $q.defer();
            var url = BASE_URL + 'users';
            var site;
            if (siteObj) {
                site = siteObj._id;
                url += ('?site=' + site);
            } else {
                site = null;
            }
            var siteUsers = userData[site] = {};
            makeAPICall.async(url).then(function(users){
                users.forEach(function(user){
                    if (user.firstname && user.lastname){
                        user.extendedId =
                            user.firstname + ' ' +
                            user.lastname + ': ' +
                            user._id;
                    } else {
                        user.extendedId =
                            user.firstname ? user.firstname + ': ':'' +
                            user.lastname ? user.lastname + ': ':'' +
                            user._id;
                    }
                    user.site = site;
                    siteUsers[user._id] = user;
                });
                timestamp[site] = Date.now();
                d.resolve(siteUsers);
            });
            return d.promise;
        };

        if (!Date.now) {
            Date.now = function() { return new Date().getTime(); }
        }

        var getUsers = function (siteObj) {
            var newTimestamp = Date.now();
            var site = siteObj?siteObj._id:null;
            if (!timestamp[site] || newTimestamp - timestamp[site] > 60000) {
                timestamp[site] = newTimestamp;
                return refreshUsers(siteObj);
            } else {
                var d = $q.defer();
                d.resolve(userData[site]);
                return d.promise
            }
        };

        return {
            getUsers: getUsers,
            refreshUsers: refreshUsers
        }
    }]);
