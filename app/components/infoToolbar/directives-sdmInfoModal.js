'use strict';

(function() {
    angular.module('sdm.infoToolbar.directives.sdmInfoModal',
            ['sdm.services', 'sdm.download.services.sdmDownloadInterface',
             'sdm.authentication.services.sdmUserManager', 'sdm.main.services.sdmViewManager',
             'sdm.APIServices.services.sdmRoles',
             'sdm.APIServices.services.sdmUsers',
             'sdm.popovers.services.sdmPopoverTrampoline'])
        .directive('sdmInfoModal', ['$location', 'sdmPopoverTrampoline', 'makeAPICall', 'sdmDownloadInterface', 'sdmUserManager', 'sdmViewManager', 'sdmRoles', 'sdmUsers',
            function($location, sdmPopoverTrampoline, makeAPICall, sdmDownloadInterface, sdmUserManager, sdmViewManager, sdmRoles, sdmUsers) {
                return {
                    restrict: 'E',
                    scope: false,
                    replace: false, // Replace with the template below
                    transclude: false,// we want to insert custom content inside the directive
                    controller: function(){},
                    controllerAs: 'sdmIMController',
                    link: function($scope, $element, $attrs, sdmIMController){
                        $scope.$parent.$parent.hideToolbar(null, 0);
                        $scope.$parent.dialogStyle.height = '500px';//100px';
                        $scope.$parent.dialogStyle.width = '600px';//280px';
                        var node = $scope.$parent.$parent.data;
                        var APIUrl = BASE_URL + node.level.name + '/' + node.id;
                        var level = node.level.name;
                        sdmIMController.data = {};
                        var path = [];
                        var n = node;
                        var apiDataNotes;
                        while (n.parent){
                            path.unshift(n.parent.level.name==='sessions'?n.parent.name + ' - ' + n.parent.subject:n.parent.name);
                            n = n.parent;
                        }
                        sdmIMController.loadingState = 3;
                        sdmIMController.permissionPlaceholder = 'Enter User ID';
                        sdmRoles().then(function(data){
                            sdmIMController.roles = data;
                            sdmIMController.selectedRole = sdmIMController.roles[0];
                            sdmIMController.loadingState--;
                        });
                        var typeaheadElement = $element.find('#info-change-permissions .typeahead');
                        sdmUsers.getUsers().then(function(data){
                            console.log(data);
                            sdmIMController.users = data;
                            typeaheadElement.typeahead({
                                    hint: true,
                                    highlight: true,
                                    minLength: 3
                                },
                                {
                                    name: 'users',
                                    displayKey: 'value',
                                    source: substringMatcher(sdmIMController.users, '_id')
                                }
                            );
                            $element.on('typeahead:autocompleted typeahead:selected', function(event, selectedUID) {
                                console.log('typeahead');
                                sdmIMController.selectedUID = selectedUID.value;
                            });
                            sdmIMController.loadingState--;
                        });
                        var refreshUsers = function() {
                            sdmUsers.getUsers().then(function(data){
                                sdmIMController.users = data;
                                var typeahead

                                typeaheadElement.typeahead('destroy');
                                typeaheadElement.typeahead({
                                        hint: true,
                                        highlight: true,
                                        minLength: 3
                                    },
                                    {
                                        name: 'users',
                                        displayKey: 'value',
                                        source: substringMatcher(sdmIMController.users, '_id')
                                    }
                                );
                            });
                        };
                        sdmIMController.baseUrl = BASE_URL + 'acquisitions/' + node.id + '/file';
                        console.log(path);
                        sdmIMController.path = path.slice(1);
                        sdmIMController.title = level.slice(0, level.length - 1) + ': ';
                        sdmIMController.name = node.name;
                        sdmIMController.user = sdmUserManager.getAuthData();
                        console.log(sdmIMController.user);
                        makeAPICall.async(APIUrl, {site: node.site}).then(
                            function (apiData) {
                                console.log('apiData', apiData);
                                sdmIMController.data = node.level.getModalData(node, apiData);

                                sdmIMController.files = apiData.files||[];
                                sdmIMController.files.sort(function(file, file1){
                                    return file.type===file1.type?0:file.type>file1.type?1:-1 });
                                console.log(apiData.permissions, node.level.name);
                                if (apiData.permissions) {
                                    apiData.permissions.forEach(function(permission){
                                        if (permission._id === sdmIMController.user.user_uid) {
                                            sdmIMController.userPermission = permission.access;
                                        }
                                    });
                                }

                                sdmIMController.isAdmin = sdmIMController.canModify = false;
                                if (sdmIMController.userPermission) {
                                    console.log(sdmIMController.userPermission);
                                    sdmIMController.isAdmin = sdmIMController.userPermission === 'admin';
                                    sdmIMController.canModify = sdmIMController.userPermission.search(/rw$|admin$/) === 0;
                                }
                                if (sdmIMController.user.root) {
                                    sdmIMController.isAdmin = sdmIMController.canModify = true;
                                }

                                apiData.permissions =
                                    node.level.name.search(/collections|projects/) === 0 ?
                                        apiData.permissions : null;
                                sdmIMController.apiData = apiData;
                                apiDataNotes = apiData.notes;
                                sdmIMController.loadingState--;
                                console.log(sdmIMController);
                            },
                            function(reason){
                                console.log('rejected request because of', reason);
                                sdmIMController.dismiss();
                            });

                        sdmIMController.download = function(file) {
                            var _node = {
                                level: level,
                                _id: node.id,
                                file: file
                            };
                            sdmDownloadInterface.getDownloadURL(_node, true).then(function(url){
                                window.open(url, '_self');
                            });
                        };

                        sdmIMController.dismiss = function ($event) {
                            $scope.$parent.enableEvents();
                            $scope.$parent._hidePopover($event, 0);
                        };

                        sdmIMController.close = function ($event) {
                            var areNotesChanged = sdmIMController.apiData && apiDataNotes !== sdmIMController.apiData.notes;
                            if (sdmIMController.arePermissionsChanged || areNotesChanged) {
                                sdmIMController.confirmDismiss = true;
                            } else {
                                $scope.$parent.enableEvents();
                                $scope.$parent._hidePopover($event, 0);
                            }
                        };

                        sdmIMController.removeUser = function ($index) {
                            console.log('removing', sdmIMController.apiData.permissions[$index]);
                            sdmIMController.apiData.permissions.splice($index, 1);
                            sdmIMController.arePermissionsChanged = true;
                        };

                        sdmIMController.addUser = function ($event, form) {
                            if (!sdmIMController.selectedUID) {
                                form.hasErrors = true;
                                form.newPermission.hasErrors = true;
                                sdmIMController.selectedUID = null;
                                sdmIMController.permissionPlaceholder = "User UID is missing";
                                return;
                            } else {
                                if (sdmIMController.apiData.permissions.map(
                                        function(permission){
                                            return permission._id;
                                        }).indexOf(sdmIMController.selectedUID) >= 0 ) {
                                    form.hasErrors = true;
                                    form.newPermission.hasErrors = true;
                                    sdmIMController.selectedUID = null;
                                    sdmIMController.permissionPlaceholder = "User already has permission";
                                    return;
                                }
                            }
                            sdmIMController.apiData.permissions.push({
                                _id: sdmIMController.selectedUID,
                                access: sdmIMController.selectedRole.rid
                            });
                            sdmIMController.selectedUID = '';
                            sdmIMController.permissionPlaceholder = 'Permission added. Save to confirm.';
                            sdmIMController.arePermissionsChanged = true;
                            typeaheadElement.typeahead('val', '');
                        };

                        sdmIMController.createUserInModal = function ($event) {
                            $event.stopPropagation();
                            $event.preventDefault();
                            sdmPopoverTrampoline.trigger(
                                'sdm-create-user',
                                'components/admin/userCreationModal.html',
                                {refreshUsers: refreshUsers}
                            );
                        }

                        sdmIMController.save = function ($event) {
                            var areNotesChanged = apiDataNotes !== sdmIMController.apiData.notes;
                            if (!sdmIMController.arePermissionsChanged && !areNotesChanged) {
                                $scope.$parent.enableEvents();
                                $scope.$parent._hidePopover($event, 0);
                                return;
                            }
                            var url = BASE_URL + node.level.name + '/' + node.id;
                            var payload = {notes: sdmIMController.apiData.notes};
                            if (sdmIMController.arePermissionsChanged) {
                                payload.permissions = sdmIMController.apiData.permissions;
                            }
                            makeAPICall.async(url, {site: node.site}, 'PUT', payload).then(function(){
                                    var currentPath = $location.path();
                                    currentPath = currentPath.substring(1, currentPath.length);
                                    sdmViewManager.refreshView(currentPath);
                                    $scope.$parent.enableEvents();
                                    $scope.$parent._hidePopover($event, 0);
                                });
                        }
                    }
                }
            }
            ]
        );
})();
