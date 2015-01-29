'use strict';

(function() {
    angular.module('sdm.infoToolbar.directives.sdmInfoModal',
            ['sdm.services', 'sdm.download.services.sdmDownloadInterface',
             'sdm.authentication.services.sdmUserManager',
             'sdm.APIServices.services.sdmRoles',
             'sdm.APIServices.services.sdmUsers'])
        .directive('sdmInfoModal', ['$location', 'makeAPICall', 'sdmDownloadInterface', 'sdmUserManager', 'sdmRoles', 'sdmUsers',
            function($location, makeAPICall, sdmDownloadInterface, sdmUserManager, sdmRoles, sdmUsers) {
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
                        while (n.parent){
                            path.unshift(n.parent.level.name==='sessions'?n.parent.name + ' - ' + n.parent.subject:n.parent.name);
                            n = n.parent;
                        }
                        sdmIMController.permissionPlaceholder = 'Enter User ID';
                        sdmRoles().then(function(data){
                            sdmIMController.roles = data;
                            sdmIMController.selectedRole = sdmIMController.roles[0];
                        });
                        sdmUsers.getUsers().then(function(data){
                            console.log(data);
                            sdmIMController.users = data;

                            $element.find('#info-change-permissions .typeahead').typeahead({
                                    hint: true,
                                    highlight: true,
                                    minLength: 3
                                },
                                {
                                    name: 'users',
                                    displayKey: 'value',
                                    source: substringMatcher(sdmIMController.users, '_id')
                                });
                            $element.on('typeahead:autocompleted typeahead:selected', function(event, selectedUID) {
                                sdmIMController.selectedUID = selectedUID.value;
                            });
                        });



                        sdmIMController.baseUrl = BASE_URL + 'acquisitions/' + node.id + '/file';
                        console.log(path);
                        sdmIMController.path = path.slice(1);
                        sdmIMController.title = level.slice(0, level.length - 1) + ' ' + node.name;
                        makeAPICall.async(APIUrl, {site: node.site}).then(
                            function (apiData) {
                                console.log('apiData', apiData);
                                sdmIMController.data = node.level.getModalData(node, apiData);

                                sdmIMController.files = apiData.files||[];
                                sdmIMController.files.sort(function(file, file1){
                                    return file.type===file1.type?0:file.type>file1.type?1:-1 });
                                sdmIMController.apiData = apiData;

                                console.log(sdmIMController);
                            });

                        sdmIMController.user = sdmUserManager.getAuthData();
                        console.log('user', sdmIMController.user);

                        sdmIMController.download = function(file) {
                            var _node = {
                                level: level.slice(0, level.length - 1),
                                _id: node.id,
                                file: file
                            };
                            sdmDownloadInterface.getDownloadURL(_node, true).then(function(url){
                                window.open(url, '_self');
                            });
                        };

                        sdmIMController.close = function ($event) {
                            $scope.$parent.enableEvents();
                            $scope.$parent._hidePopover($event, 0);
                        };

                        sdmIMController.removeUser = function ($index) {
                            sdmIMController.apiData.permissions.splice($index, 1);
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
                        };

                        sdmIMController.savePermissions = function ($event) {
                            var url = BASE_URL + node.level.name + '/' + node.id;
                            makeAPICall.async(url, {site: node.site}, 'PUT',
                                {permissions: sdmIMController.apiData.permissions}).then(function(){
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
