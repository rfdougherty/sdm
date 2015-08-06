'use strict';

(function(){
    angular.module('sdm.admin.directives.sdmAdminModal', [
        'sdm.admin.services.sdmAdminInterface', 'sdm.main.services.sdmViewManager',
        'sdm.dataFiltering.services.sdmFilterTree', 'sdm.authentication.services.sdmUserManager',
        'sdm.APIServices.services.sdmRoles', 'sdm.APIServices.services.sdmUsers',
    ]).directive('sdmAdminModal', ['$timeout', 'sdmAdminInterface', 'sdmViewManager', 'sdmFilterTree', 'sdmUserManager', 'sdmRoles', 'sdmUsers',
            function($timeout, sdmAdminInterface, sdmViewManager, sdmFilterTree, sdmUserManager, sdmRoles, sdmUsers) {
                return {
                    restrict: 'E',
                    scope: false,
                    replace: false, // Replace with the template below
                    transclude: false,// we want to insert custom content inside the directive
                    controller: function(){},
                    controllerAs: 'sdmAMController',
                    link: function($scope, $element, $attrs, sdmAMController) {
                        sdmAMController.adminView = 'edit users';
                        sdmAMController.trigger = {
                            node: null,
                            sessionKey: 1
                        };
                        //$scope.$parent.disableEvents();
                        sdmAMController.viewID = 'admin';
                        sdmAMController.currentView = sdmViewManager.getCurrentView();
                        sdmViewManager.setCurrentView('admin');
                        sdmFilterTree.setView('admin');
                        sdmAMController.sdmData = {};
                        sdmAMController.defaultSelectText = 'Select';
                        sdmAMController.user = sdmUserManager.getAuthData();
                        console.log(sdmAMController.user);
                        sdmAMController.addedPermissions = [
                            {
                                '_id': sdmAMController.user.user_uid,
                                name: [sdmAMController.user.firstname, sdmAMController.user.lastname].join(' '),
                                'access': 'admin'
                            }];
                        sdmAMController.isGroupExisting = false;
                        sdmAMController.wheel = false;
                        sdmAMController.existingUser = {};



                        var addTypeahead = function(selector, property) {
                            var typeaheadElement = $element.find(selector);

                            sdmUsers.getUsers().then(function(users) {
                                sdmAMController.users = users;
                                typeaheadElement.typeahead({
                                        hint: true,
                                        highlight: true,
                                        minLength: 3
                                    },
                                    {
                                        name: 'users',
                                        displayKey: 'value',
                                        source: substringMatcher(sdmAMController.users, 'extendedId')
                                    });
                                typeaheadElement.on('typeahead:autocompleted typeahead:selected', function(event, selectedUID) {
                                    console.log(selectedUID);
                                    sdmAMController[property] = selectedUID.element._id;
                                });
                            });
                            return typeaheadElement;
                        };

                        var groupsth = addTypeahead('#group-permissions .typeahead', 'selectedUID');
                        var usersth = addTypeahead('.sdm-edit-users .typeahead', 'existingUserID');

                        var refreshTypeahead = function() {
                            groupsth.typeahead('destroy');
                            usersth.typeahead('destroy');
                            groupsth = addTypeahead('#group-permissions .typeahead', 'selectedUID');
                            usersth = addTypeahead('.sdm-edit-users .typeahead', 'existingUserID');
                        }

                        function loadData() {
                            return sdmAdminInterface.loadGroups().then(
                                function(groups){
                                    sdmAMController.existingGroups = groups;
                                });
                        }
                        loadData();

                        sdmAMController.close = function($event) {
                            sdmViewManager.setCurrentView(sdmAMController.currentView);
                            sdmFilterTree.setView(sdmAMController.currentView);
                            //$scope.$parent.enableEvents();
                            $scope.$parent._hidePopover($event, 0);
                        }

                        sdmAMController.firstNamePlaceholder = 'Enter user first name';
                        sdmAMController.lastNamePlaceholder = 'Enter user last name';
                        sdmAMController.userIDPlaceholder = 'Enter user ID';
                        sdmAMController.emailPlaceholder = 'Enter user email (optional)';
                        sdmAMController.permissionPlaceholder = 'Enter User ID';
                        sdmAMController.existingUserPlaceholder = 'Search User ID';
                        sdmAMController.groupNamePlaceholder = 'Edit your group name';
                        sdmAMController.createGroupPlaceholder = 'Give your group a name';

                        function clearUserFields(){
                            sdmAMController.userFirstName = null;
                            sdmAMController.userLastName = null;
                            sdmAMController.userID = null;
                            sdmAMController.email = null;
                            sdmAMController.wheel = false;
                        }

                        sdmAMController.saveUser = function ($event, form) {
                            if (sdmAMController.existingUser && sdmAMController.existingUser._id) {
                                updateUser($event, form);
                                return
                            }
                            $event.stopPropagation();
                            if (!form.$valid) {
                                console.log('form', form);
                                return;
                            }
                            sdmAdminInterface.createNewUser(
                                sdmAMController.userFirstName,
                                sdmAMController.userLastName,
                                sdmAMController.userID,
                                sdmAMController.email,
                                sdmAMController.wheel
                            ).then(loadData).then(clearUserFields).then(refreshTypeahead)
                                .then(function(){
                                    sdmAMController.userIDPlaceholder = 'User Created';
                                    setTimeout(function(){
                                        sdmAMController.userIDPlaceholder = 'Enter User ID';
                                        $scope.$apply();
                                    }, 2000);
                                });
                        }

                        var updateUser = function($event, form) {
                            $event.stopPropagation();
                            if (!form.$valid) {
                                console.log('form', form);
                                return;
                            }
                            sdmAMController.existingUser.firstname = sdmAMController.userFirstName;
                            sdmAMController.existingUser.lastname = sdmAMController.userLastName;
                            sdmAMController.existingUser.email = sdmAMController.email;
                            sdmAMController.existingUser.wheel = sdmAMController.wheel;

                            sdmAdminInterface.updateUser(
                                sdmAMController.existingUser
                            ).then(loadData).then(function(){
                                sdmAMController.existingUser = null;
                                sdmAMController.existingUserID = null;
                                sdmAMController.existingUserLoaded = false;
                                clearUserFields();
                                usersth.typeahead('val', '');
                                refreshTypeahead();
                                sdmAMController.existingUserPlaceholder = 'User Updated';
                                setTimeout(function(){
                                    sdmAMController.existingUserPlaceholder = 'Enter User ID';
                                    $scope.$apply();
                                }, 2000);
                            });
                        }

                        sdmAMController.deleteUser = function($event, form) {
                            $event.stopPropagation();
                            if (!form.$valid) {
                                console.log('form', form);
                                return;
                            }
                            sdmAdminInterface.deleteUser(
                                sdmAMController.existingUser
                            ).then(loadData).then(function(){
                                sdmAMController.existingUser = {};
                                sdmAMController.existingUserID = null;
                                sdmAMController.existingUserLoaded = false;
                                usersth.typeahead('val', '');
                                refreshTypeahead();
                                sdmAMController.existingUserPlaceholder = 'User Deleted';
                                setTimeout(function(){
                                    sdmAMController.existingUserPlaceholder = 'Enter User ID';
                                    $scope.$apply();
                                }, 2000);
                                sdmAMController.clearForm();
                            });
                        }

                        sdmAMController.getUser = function($event) {
                            if ($event.which === 13) {
                                $event.stopPropagation();
                                $event.preventDefault();
                                console.log($event);
                                console.log(sdmAMController.existingUserID);
                                sdmAdminInterface.getUser(sdmAMController.existingUserID).then(function(user){
                                    console.log($event);
                                    sdmAMController.existingUser = user;
                                    sdmAMController.userFirstName = user.firstname;
                                    sdmAMController.userLastName = user.lastname;
                                    sdmAMController.email = user.email;
                                    sdmAMController.wheel = user.wheel||false;
                                    $timeout(function () { $event.target.blur() }, 0, false);
                                    sdmAMController.existingUserLoaded = true;

                                });
                            } else {
                                sdmAMController.existingUser = null;
                                sdmAMController.userFirstName = null;
                                sdmAMController.userLastName = null;
                                sdmAMController.email = null;
                                sdmAMController.wheel = false;
                            }
                        }
                        sdmAMController.clearForm = function() {
                            sdmAMController.existingUser = null;
                            sdmAMController.existingUserID = null;
                            sdmAMController.userID = null;
                            sdmAMController.userFirstName = null;
                            sdmAMController.userLastName = null;
                            sdmAMController.email = null;
                            sdmAMController.wheel = false;
                            sdmAMController.existingUserLoaded = false;
                            usersth.typeahead('val', '');
                        }

                        sdmRoles().then(function(roles){
                            console.log(roles);
                            sdmAMController.roles = roles;
                        });
                        var typeahead_hint_element_color;
                        sdmAMController.selectGroup = function() {
                            console.log(sdmAMController.selectedGroup);
                            if (sdmAMController.selectedGroup) {
                                sdmAdminInterface.loadUsersForGroup(sdmAMController.selectedGroup).then(function (roles) {
                                    sdmAMController.addedPermissions = roles;
                                    sdmAMController.addedPermissions.forEach(function(permission){
                                        var user = sdmAMController.users[permission._id]
                                        if (user && user.lastname) {
                                            permission.name = [user.firstname, user.lastname].join(' ')
                                        } else {
                                            permission.name = permission._id
                                        }
                                    })
                                    var typeahead_hint_element = angular.element('#group-permissions .tt-hint');
                                    typeahead_hint_element_color = typeahead_hint_element.css('background-color');
                                    typeahead_hint_element.css('background-color', 'transparent');
                                })
                            }
                        };

                        sdmAMController.addUser = function ($event, form) {
                            console.log(form);
                            console.log(sdmAMController.selectedUID);
                            if (!sdmAMController.selectedUID) {
                                form.hasErrors = true;
                                form.newPermission.hasErrors = true;
                                sdmAMController.selectedUID = null;
                                sdmAMController.selectedRole = null;
                                sdmAMController.permissionPlaceholder = "User UID is missing or invalid";
                                groupsth.typeahead('val', '');
                                return;
                            } else {
                                if (!sdmAMController.users[sdmAMController.selectedUID]) {
                                    form.hasErrors = true;
                                    form.newPermission.hasErrors = true;
                                    sdmAMController.selectedUID = null;
                                    sdmAMController.selectedRole = null;
                                    sdmAMController.permissionPlaceholder = "User UID doesn't exist";
                                    groupsth.typeahead('val', '');
                                    return;
                                } else if (sdmAMController.addedPermissions.map(
                                        function(permission){
                                            return permission._id;
                                        }).indexOf(sdmAMController.selectedUID) >= 0 ) {
                                    form.hasErrors = true;
                                    form.newPermission.hasErrors = true;
                                    sdmAMController.selectedUID = null;
                                    sdmAMController.selectedRole = null;
                                    sdmAMController.permissionPlaceholder = "User already has permission";
                                    groupsth.typeahead('val', '');
                                    return;
                                }
                            }
                            var user = sdmAMController.users[sdmAMController.selectedUID];
                            sdmAMController.addedPermissions.push({
                                _id: sdmAMController.selectedUID,
                                access: sdmAMController.selectedRole,
                                name: [user.firstname, user.lastname].join(' ')
                            });
                            saveGroup(false).then(function(){
                                sdmAMController.selectedUID = '';
                                sdmAMController.success = true;
                                form.newPermission.hasErrors = false;
                                sdmAMController.permissionPlaceholder = 'Permission added.';
                                sdmAMController.selectedRole = null;
                                setTimeout(function(){
                                    $scope.$apply(function(){
                                        sdmAMController.success = false;
                                        sdmAMController.permissionPlaceholder = 'Enter User ID';
                                    });
                                }, 2000);
                            });
                        };

                        sdmAMController.save = function($index, form) {
                            saveGroup(false, true).then(function(){
                                sdmAMController.selectedGroup = null;
                                sdmAMController.groupId = null;
                                sdmAMController.saveSuccess = true;
                                setTimeout(function(){
                                    $scope.$apply(function(){
                                        sdmAMController.saveSuccess = false;
                                    });
                                }, 2000);
                            });
                        }

                        var saveGroup = function(isNew, name){
                            console.log(sdmAMController);
                            var roles = sdmAMController.addedPermissions.map(
                                function(permission) {
                                    return {
                                        access: permission.access,
                                        _id: permission._id
                                    };
                                }
                            );
                            var payload = {
                                _id: isNew?sdmAMController.groupId:sdmAMController.selectedGroup._id,
                                roles: roles
                            }
                            if (name) {
                                if (isNew) {
                                    payload.name = sdmAMController.groupId;
                                } else if (sdmAMController.selectedGroup && sdmAMController.selectedGroup.name) {
                                    payload.name = sdmAMController.selectedGroup.name
                                }
                            }
                            var method = isNew?'POST':'PUT';
                            return sdmAdminInterface.editGroup(method, payload._id, payload)
                        }

                        sdmAMController.removeUserFromGroup = function ($index, form) {
                            sdmAMController.addedPermissions.splice($index, 1);
                            saveGroup(false).then(function(){
                                sdmAMController.permissionPlaceholder = ' User removed';
                                sdmAMController.success = true;
                                form.newPermission.hasErrors = false;
                                var viewValue = form.newPermission.$viewValue;
                                sdmAMController.selectedUID = null;
                                setTimeout(function(){
                                    $scope.$apply(function(){
                                        sdmAMController.success = false;
                                        sdmAMController.selectedUID = viewValue;
                                        sdmAMController.permissionPlaceholder = 'Enter User ID';
                                    });
                                }, 2000);
                            });
                        };

                        sdmAMController.updateUserPermission = function(form) {
                            saveGroup(false).then(function(){
                                sdmAMController.permissionPlaceholder = ' User permission changed';
                                sdmAMController.success = true;
                                form.newPermission.hasErrors = false;
                                var viewValue = form.newPermission.$viewValue;
                                sdmAMController.selectedUID = null;
                                setTimeout(function(){
                                    $scope.$apply(function(){
                                        sdmAMController.success = false;
                                        sdmAMController.selectedUID = viewValue;
                                        sdmAMController.permissionPlaceholder = 'Enter User ID';
                                    });
                                }, 2000);
                            });
                        }

                        var findGroupByID = function(_id) {
                            var results = sdmAMController.existingGroups.filter(function(g){
                                return g._id === _id;
                            });
                            return results.length === 0?undefined:results[0];
                        }

                        sdmAMController.createGroup = function($event, form) {
                            if (!sdmAMController.groupId || findGroupByID(sdmAMController.groupId)){
                                form.hasErrors = true;
                                sdmAMController.createWarning = sdmAMController.groupId?"Group already exists":"Please enter the group name"
                                setTimeout(function(){
                                    $scope.$apply(function(){
                                        sdmAMController.createWarning = null;
                                    });
                                }, 2000)
                                return;
                            }
                            saveGroup(true, true).then(loadData).then(function() {
                                sdmAMController.selectedGroup = findGroupByID(sdmAMController.groupId);
                                sdmAdminInterface.loadUsersForGroup(sdmAMController.selectedGroup).then(function (roles) {
                                    sdmAMController.addedPermissions = roles;
                                    sdmAMController.addedPermissions.forEach(function(permission){
                                        var user = sdmAMController.users[permission._id]
                                        if (user && user.lastname) {
                                            permission.name = [user.firstname, user.lastname].join(' ')
                                        } else {
                                            permission.name = permission._id
                                        }
                                    })
                                    var typeahead_hint_element = angular.element('#group-permissions .tt-hint');
                                    typeahead_hint_element_color = typeahead_hint_element.css('background-color');
                                    typeahead_hint_element.css('background-color', 'transparent');
                                });
                                sdmAMController.createSuccess = true;
                                setTimeout(function(){
                                    $scope.$apply(function(){
                                        sdmAMController.createSuccess = false;
                                    });
                                }, 2000)
                            });
                        }

                        sdmAMController.saveGroup = function($event) {
                            saveGroup(false, true).then(loadData).then(function(){
                                sdmAMController.selectedGroup = findGroupByID(sdmAMController.selectedGroup._id);
                                sdmViewManager.refreshView('projects');
                                sdmAMController.updateSuccess = true;
                                setTimeout(function(){
                                    $scope.$apply(function(){
                                        sdmAMController.updateSuccess = false;
                                    });
                                }, 2000)
                            });
                        }

                        sdmAMController.deleteGroup = function($event, form) {
                            if (!sdmAMController.selectedGroup){
                                form.hasErrors = true;
                                return;
                            }
                            console.log(sdmAMController.selectedGroup._id);
                            var method = 'DELETE';
                            sdmAdminInterface.editGroup(method, sdmAMController.selectedGroup._id).then(
                                function() {
                                    sdmAMController.selectedGroup = null;
                                    sdmAMController.isGroupExisting = false;
                                    sdmAMController.groupName = '';
                                    sdmAMController.groupId = null;
                                    sdmAMController.addedPermissions = [{'_id': sdmAMController.user.user_uid, 'access': 'admin'}];
                                    sdmAMController.defaultSelectText = 'Select Existing Group';
                                    sdmAMController.showConfirmGroup = false;
                                    loadData();
                                    sdmViewManager.refreshView('projects');
                                    sdmAMController.groupPlaceholder = 'Group Deleted';
                                    var typeahead_hint_element = angular.element('#group-permissions .tt-hint');
                                    typeahead_hint_element.css('background-color', typeahead_hint_element_color);
                                    setTimeout(function() {
                                        sdmAMController.groupPlaceholder = 'Create New Group';
                                        $scope.$apply();
                                    }, 2000);
                                }
                            );
                        }

                    }
                }
            }
        ]);
})();
