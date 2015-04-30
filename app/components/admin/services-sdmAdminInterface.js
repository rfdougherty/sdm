'use strict';

(function(){
    var sdmAdminInterface = function($q, makeAPICall, sdmUsers, sdmViewManager, sdmDataManager) {
        var createNewUser = function(firstname, lastname, userid, email, superuser) {
            console.log(firstname, lastname, userid, email, superuser);
            var url = BASE_URL + 'users';
            var payload = {
                _id: userid,
                firstname: firstname,
                lastname: lastname,
                wheel: superuser,
                email: email
            }
            return makeAPICall.async(url, null, 'POST', payload).then(function(){
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

                var promises = group.roles.map(function(role) {
                    var deferred = $q.defer();
                    makeAPICall.async(userURL + '/' + role._id).then(function(user) {
                        var userNode = new DataNode(
                            user,
                            null,
                            levelDescription['users']
                        );
                        userNode.role = role.access;
                        deferred.resolve(userNode);
                    });
                    return deferred.promise;
                });
                $q.all(promises).then(function(users) {
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

        return {
            createNewUser: createNewUser,
            loadGroupsAndUsers: loadGroupsAndUsers,
            editGroup: editGroup
        }
    };

    sdmAdminInterface.$inject = [
        '$q', 'makeAPICall', 'sdmUsers',
        'sdmViewManager', 'sdmDataManager'
    ];

    angular.module('sdm.admin.services.sdmAdminInterface',
        [
            'sdm.services', 'sdm.APIServices.services.sdmUsers',
            'sdm.main.services.sdmDataManager'
        ]).factory('sdmAdminInterface', sdmAdminInterface);
})();
