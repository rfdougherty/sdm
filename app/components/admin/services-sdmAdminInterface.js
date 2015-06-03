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
        var _loadUsersForGroup = function(group) {
            var result = $q.defer();
            var groupURL = BASE_URL + 'groups';
            var userURL = BASE_URL + 'users';
            console.log(group);
            makeAPICall.async(groupURL + '/' + group._id).then(function(group){
                group.roles = group.roles||[];
                var promises = group.roles.map(function(role) {
                    var deferred = $q.defer();
                    makeAPICall.async(userURL + '/' + role._id).then(function(user) {
                        if (!user) {
                            console.log(role._id, 'does not exist')
                            deferred.resolve();
                            return;
                        }
                        var userNode = new DataNode(
                            user,
                            null,
                            levelDescription['users']
                        );
                        userNode.role = roles[role.access];
                        deferred.resolve(userNode);
                    });
                    return deferred.promise;
                });
                $q.all(promises).then(function(users) {
                    console.log(users);
                    users = users.filter(function(user){return user});
                    console.log(users);
                    users.sort(naturalSortByName);
                    var groupNode = new DataNode(
                        group,
                        null,
                        levelDescription['groups'],
                        users
                    );
                    groupNode.roles = group.roles;
                    users.forEach(
                        function(user, i){
                            user.index = i;
                            user.parent = groupNode;
                        }
                    );
                    console.log(groupNode);
                    result.resolve(groupNode);
                });
            });
            return result.promise;
        }

        var loadGroupsAndUsers = function() {
            var result = $q.defer();
            makeAPICall.async(BASE_URL + 'groups').then(function(groups) {
                var promises = groups.map(_loadUsersForGroup);
                $q.all(promises).then(function(groups) {
                    console.log(groups);
                    groups.sort(naturalSortByName);
                    var tree = new DataNode(
                            {name: 'root'},
                            null,
                            levelDescription['roots'],
                            groups
                        );
                    groups.forEach(
                        function(group, i){
                            group.index = i;
                            group.parent = tree;
                            group._children = group.children;
                            group.children = null;
                        });
                    result.resolve(tree);
                });
            });
            return result.promise;
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
            loadGroupsAndUsers: loadGroupsAndUsers,
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
