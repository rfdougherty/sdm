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
                        sdmAMController.adminView = 'main';
                        sdmAMController.trigger = {
                            node: null,
                            sessionKey: 1
                        };
                        $scope.$parent.disableEvents();
                        sdmAMController.viewID = 'admin';
                        sdmAMController.currentView = sdmViewManager.getCurrentView();
                        sdmViewManager.setCurrentView('admin');
                        sdmFilterTree.setView('admin');
                        sdmAMController.sdmData = {};
                        sdmAMController.defaultSelectText = 'Select Existing Group';
                        sdmAMController.user = sdmUserManager.getAuthData();
                        sdmAMController.addedPermissions = [{'_id': sdmAMController.user.user_uid, 'access': 'admin'}];
                        sdmAMController.isGroupExisting = false;



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
                                        source: substringMatcher(sdmAMController.users, '_id')
                                    });
                                typeaheadElement.on('typeahead:autocompleted typeahead:selected', function(event, selectedUID) {
                                    console.log(selectedUID);
                                    sdmAMController[property] = selectedUID.value;
                                });
                            });
                            return typeaheadElement;
                        };

                        var groupsth = addTypeahead('#permissions .typeahead', 'selectedUID');
                        var usersth = addTypeahead('.sdm-edit-users .typeahead', 'existingUserID');

                        var refreshTypeahead = function() {
                            groupsth.typeahead('destroy');
                            usersth.typeahead('destroy');
                            groupsth = addTypeahead('#permissions .typeahead', 'selectedUID');
                            usersth = addTypeahead('.sdm-edit-users .typeahead', 'existingUserID');
                        }

                        function loadData() {
                            sdmAdminInterface.loadGroupsAndUsers().then(
                                function(tree){
                                    console.log(tree);
                                    sdmAMController.sdmData.data = tree;
                                    sdmViewManager.setCurrentViewData(
                                        sdmAMController.sdmData.data,
                                        sdmAMController
                                    );
                                    sdmViewManager.triggerViewChange(tree);
                                    sdmAMController.existingGroups = tree.children;
                                });
                        }
                        loadData();

                        sdmAMController.close = function($event) {
                            sdmViewManager.setCurrentView(sdmAMController.currentView);
                            sdmFilterTree.setView(sdmAMController.currentView);
                            $scope.$parent.enableEvents();
                            $scope.$parent._hidePopover($event, 0);
                        }

                        sdmAMController.firstNamePlaceholder = 'Enter user first name';
                        sdmAMController.lastNamePlaceholder = 'Enter user last name';
                        sdmAMController.userIDPlaceholder = 'Enter user ID';
                        sdmAMController.emailPlaceholder = 'Enter user email (optional)';
                        sdmAMController.permissionPlaceholder = 'Enter User ID';
                        sdmAMController.existingUserPlaceholder = 'Enter User ID';
                        sdmAMController.groupPlaceholder = 'Create New Group';

                        function clearUserFields(){
                            sdmAMController.userFirstName = null;
                            sdmAMController.userLastName = null;
                            sdmAMController.userID = null;
                            sdmAMController.email = null;
                            sdmAMController.superuser = null;
                        }

                        sdmAMController.saveUser = function ($event, form) {
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

                        sdmAMController.updateUser = function($event, form) {
                            $event.stopPropagation();
                            if (!form.$valid) {
                                console.log('form', form);
                                return;
                            }
                            sdmAdminInterface.updateUser(
                                sdmAMController.existingUser
                            ).then(loadData).then(function(){
                                sdmAMController.existingUser = {};
                                sdmAMController.existingUserID = null;
                                sdmAMController.existingUserLoaded = false;
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
                            sdmAMController.existingUser.confirmDelete = true;
                        }

                        sdmAMController.confirmDeleteUser = function($event, form) {
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
                                sdmAMController.existingUser.confirmDelete = false;
                                usersth.typeahead('val', '');
                                refreshTypeahead();
                                sdmAMController.existingUserPlaceholder = 'User Deleted';
                                setTimeout(function(){
                                    sdmAMController.existingUserPlaceholder = 'Enter User ID';
                                    $scope.$apply();
                                }, 2000);
                            });
                        }

                        sdmAMController.getUser = function($event) {
                            if ($event.which === 13) {
                                $event.preventDefault();
                                console.log($event);
                                console.log(sdmAMController.existingUserID);
                                sdmAdminInterface.getUser(sdmAMController.existingUserID).then(function(user){
                                    console.log($event);
                                    sdmAMController.existingUser = user;
                                    $timeout(function () { $event.target.blur() }, 0, false);
                                    sdmAMController.existingUserLoaded = true;
                                });
                            }
                        }

                        sdmRoles().then(function(roles){
                            sdmAMController.roles = roles;
                            sdmAMController.selectedRole = sdmAMController.roles[0];
                        });

                        sdmAMController.selectGroup = function() {
                            console.log(sdmAMController.selectedGroup);
                            if (sdmAMController.selectedGroup) {
                                sdmAMController.isGroupExisting = true;
                                sdmAMController.groupName = sdmAMController.selectedGroup.name;
                                sdmAMController.groupId = sdmAMController.selectedGroup.id;
                                sdmAMController.addedPermissions = sdmAMController.selectedGroup.roles;
                                sdmAMController.defaultSelectText = 'Create New Group';
                            } else {
                                sdmAMController.isGroupExisting = false;
                                sdmAMController.groupName = '';
                                sdmAMController.groupId = null;
                                sdmAMController.addedPermissions = [{'_id': sdmAMController.user.user_uid, 'access': 'admin'}];
                                sdmAMController.defaultSelectText = 'Select Existing Group';
                            }
                        };

                        sdmAMController.addUser = function ($event, form) {
                            console.log(form);
                            console.log(sdmAMController.selectedUID);
                            if (!sdmAMController.selectedUID) {
                                form.hasErrors = true;
                                form.newPermission.hasErrors = true;
                                sdmAMController.selectedUID = null;
                                sdmAMController.permissionPlaceholder = "User UID is missing or invalid";
                                return;
                            } else {
                                if (!sdmAMController.users[sdmAMController.selectedUID]) {
                                    form.hasErrors = true;
                                    form.newPermission.hasErrors = true;
                                    sdmAMController.selectedUID = null;
                                    sdmAMController.permissionPlaceholder = "User UID does not exist";
                                    return;
                                } else if (sdmAMController.addedPermissions.map(
                                        function(permission){
                                            return permission._id;
                                        }).indexOf(sdmAMController.selectedUID) >= 0 ) {
                                    form.hasErrors = true;
                                    form.newPermission.hasErrors = true;
                                    sdmAMController.selectedUID = null;
                                    sdmAMController.permissionPlaceholder = "User already has a permission";
                                    return;
                                }
                            }
                            sdmAMController.addedPermissions.push({
                                _id: sdmAMController.selectedUID,
                                access: sdmAMController.selectedRole.rid
                            });
                            sdmAMController.selectedUID = '';
                            sdmAMController.success = true;
                            form.newPermission.hasErrors = false;
                            setTimeout(function(){
                                $scope.$apply(function(){
                                    sdmAMController.success = false;
                                });
                            }, 2000);
                            sdmAMController.permissionPlaceholder = 'Permission added. Save to confirm.';
                            groupsth.typeahead('val', '');
                        };

                        sdmAMController.removeUser = function ($index, form) {
                            sdmAMController.addedPermissions.splice($index, 1);
                            sdmAMController.permissionPlaceholder = ' User removed. Save to confirm';
                            sdmAMController.success = true;
                            form.newPermission.hasErrors = false;
                            var viewValue = form.newPermission.$viewValue;
                            sdmAMController.selectedUID = null;
                            setTimeout(function(){
                                $scope.$apply(function(){
                                    sdmAMController.success = false;
                                    sdmAMController.selectedUID = viewValue;
                                });
                            }, 2000);
                        };

                        sdmAMController.saveGroup = function($event, form) {
                            if (!sdmAMController.groupId){
                                form.hasErrors = true;
                                return;
                            }
                            var roles = sdmAMController.addedPermissions.map(
                                function(permission) {
                                    return {
                                        access: permission.access,
                                        _id: permission._id
                                    };
                                }
                            );
                            var payload = {
                                _id: sdmAMController.groupId,
                                name: sdmAMController.groupName || sdmAMController.groupId,
                                roles: roles
                            }
                            var isNewGroup = sdmAMController.existingGroups.every(function(group){
                                return (group.id !== sdmAMController.groupId)
                            })
                            var method = isNewGroup?'POST':'PUT';
                            sdmAdminInterface.editGroup(method, sdmAMController.groupId, payload).then(
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
                                    sdmAMController.groupPlaceholder = isNewGroup?'Group Created':'Group Updated';
                                    setTimeout(function() {
                                        sdmAMController.groupPlaceholder = 'Create New Group';
                                        $scope.$apply();
                                    }, 2000);
                                }
                            );
                        };

                        sdmAMController.deleteGroup = function($event, form) {
                            if (!sdmAMController.groupId){
                                form.hasErrors = true;
                                return;
                            }
                            sdmAMController.showConfirmGroup = true;
                        }

                        sdmAMController.confirmDeleteGroup = function($event, form) {
                            if (!sdmAMController.groupId){
                                form.hasErrors = true;
                                return;
                            }
                            var method = 'DELETE';
                            sdmAdminInterface.editGroup(method, sdmAMController.groupId).then(
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