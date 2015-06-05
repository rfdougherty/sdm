'use strict';

(function(){
    var sdmAdminInterface = function($q, makeAPICall, sdmUsers, sdmViewManager, sdmDataManager, sdmRoles) {
        var roles = {};
        sdmRoles().then(function(_roles){
            _roles.forEach(function(role) {
                roles[role.rid] = role.name;
            });
        });
        var createNewUser = function(firstname, lastname, userid, email, wheel) {
            var url = BASE_URL + 'users';
            var payload = {
                _id: userid,
                firstname: firstname,
                lastname: lastname,
                wheel: wheel
            }
            if (email) {
                payload.email = email;
            }
            return makeAPICall.async(url, null, 'POST', payload).then(function(){
                sdmUsers.refreshUsers();
            });
        }
        var updateUser = function(user) {
            var url = BASE_URL + 'users/' + user._id;
            var payload = {
                firstname: user.firstname,
                lastname: user.lastname,
                wheel: user.wheel,
                email: user.email
            }
            if (user.email) {
                payload.email = user.email;
            }
            return makeAPICall.async(url, null, 'PUT', payload).then(function(){
                sdmUsers.refreshUsers();
            });
        }
        var deleteUser = function(user) {
            var url = BASE_URL + 'users/' + user._id;
            var payload = {
                firstname: user.firstname,
                lastname: user.lastname,
                wheel: user.wheel,
                email: user.email
            }
            return makeAPICall.async(url, null, 'DELETE').then(function(){
                sdmUsers.refreshUsers();
            });
        }
        var viewID = 'admin';
        var levelDescription = sdmDataManager.headers(viewID);
        var loadUsersForGroup = function(group) {
            var groupURL = BASE_URL + 'groups';
            return makeAPICall.async(groupURL + '/' + group._id).then(function(group){
                return group.roles
            });
        }

        var loadGroups = function() {
            return makeAPICall.async(BASE_URL + 'groups?admin=true');
        };

        var editGroup = function(method, groupId, payload) {
            var URL = BASE_URL + 'groups';
            if (method === 'PUT' || method === 'DELETE') {
               URL += ('/' + groupId);
            }
            return makeAPICall.async(URL, null, method, payload);
        }

        var getUser = function(userId) {
            var URL = BASE_URL + 'users/' + userId;
            return makeAPICall.async(URL)
        }

        return {
            createNewUser: createNewUser,
            loadGroups: loadGroups,
            loadUsersForGroup: loadUsersForGroup,
            editGroup: editGroup,
            getUser: getUser,
            updateUser: updateUser,
            deleteUser: deleteUser
        }
    };

    sdmAdminInterface.$inject = [
        '$q', 'makeAPICall', 'sdmUsers',
        'sdmViewManager', 'sdmDataManager', 'sdmRoles'
    ];

    angular.module('sdm.admin.services.sdmAdminInterface',
        [
            'sdm.services', 'sdm.APIServices.services.sdmUsers',
            'sdm.main.services.sdmDataManager', 'sdm.APIServices.services.sdmRoles'
        ]).factory('sdmAdminInterface', sdmAdminInterface);
})();
