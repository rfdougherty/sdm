'use strict';

(function() {
    angular.module('sdm.infoToolbar.directives.sdmInfoModal',
            ['sdm.services', 'sdm.download.services.sdmDownloadInterface',
             'sdm.authentication.services.sdmUserManager', 'sdm.main.services.sdmViewManager',
             'sdm.APIServices.services.sdmRoles',
             'sdm.APIServices.services.sdmUsers',
             'sdm.popovers.services.sdmPopoverTrampoline',
             'sdm.util.services.sdmHumanReadableSize'])
        .directive('sdmInfoModal', ['$location', '$document', 'sdmPopoverTrampoline', 'makeAPICall',
            'sdmDownloadInterface', 'sdmUserManager', 'sdmViewManager', 'sdmRoles',
            'sdmUsers', 'sdmHumanReadableSize',
            function($location, $document, sdmPopoverTrampoline, makeAPICall, sdmDownloadInterface,
                sdmUserManager, sdmViewManager, sdmRoles, sdmUsers, sdmHumanReadableSize) {
                var tileViewer = function(nodeId) {
                    var width = 900,
                        height = 625,
                        prefix = prefixMatch(["webkit", "ms", "Moz", "O"]);

                    var tile = d3.geo.tile()
                        .size([width, height]);


                    var zoom = d3.behavior.zoom()
                        .scale(1 << 12)
                        .scaleExtent([1 << 10, 1 << 14])
                        .translate([1 << 11, 1 << 11])
                        .on("zoom", zoomed);

                    var map = d3.select("div.sdm-d3-map")
                        .style("width", width + "px")
                        .style("height", height + "px")
                        .style("margin", 25 + "px")
                        .style("margin-bottom", 50 + "px")
                        .call(zoom);

                    var layer = map.append("div")
                        .attr("class", "sdm-d3-layer");

                    zoomed();

                    function getUrl(z, x, y) {
                            var coordinates = [
                            ['z', z].join('='),
                            ['x', x].join('='),
                            ['y', y].join('=')
                        ].join('&');
                        return BASE_URL + 'acquisitions/' + nodeId +
                               '/tile?' + coordinates;
                    }

                    function zoomed() {
                        var tiles = tile
                            .scale(zoom.scale())
                            .translate(zoom.translate())
                            ();

                        var image = layer
                            .style(prefix + "transform", matrix3d(tiles.scale, tiles.translate))
                          .selectAll(".sd-d3-tile")
                            .data(tiles, function(d) { return d; });

                        image.exit()
                            .remove();

                        image.enter().append("img")
                            .attr("class", "sdm-d3-tile")
                            .attr("src", function(d) {
                              return getUrl(d[2], d[0], d[1])
                            }) //"http://" + ["a", "b", "c", "d"][Math.random() * 4 | 0] + ".tiles.mapbox.com/v3/examples.map-i86nkdio/" + d[2] + "/" + d[0] + "/" + d[1] + ".png"; })
                            .style("left", function(d) { return (d[0] << 8) + "px"; })
                            .style("top", function(d) { return (d[1] << 8) + "px"; });
                    }



                    function matrix3d(scale, translate) {
                        var k = scale / 256, r = scale % 1 ? Number : Math.round;
                        return "matrix3d(" + [k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, r(translate[0] * scale), r(translate[1] * scale), 0, 1 ] + ")";
                    }

                    function prefixMatch(p) {
                        var i = -1, n = p.length, s = document.body.style;
                        while (++i < n) if (p[i] + "Transform" in s) return "-" + p[i].toLowerCase() + "-";
                        return "";
                    }
                }
                return {
                    restrict: 'E',
                    scope: false,
                    replace: false, // Replace with the template below
                    transclude: false,// we want to insert custom content inside the directive
                    controller: function(){},
                    controllerAs: 'sdmIMController',
                    link: function($scope, $element, $attrs, sdmIMController){
                        $scope.$parent.$parent.hideToolbar(null, 0);
                        var node = $scope.$parent.$parent.data;
                        var APIUrl = BASE_URL + node.level.name + '/' + node.id;
                        var level = node.level.name;
                        $scope.node = node;
                        sdmIMController.data = {};
                        var path = [];
                        var n = node;
                        var apiDataNotes;
                        sdmIMController.formatSize = sdmHumanReadableSize;
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
                        sdmIMController.expandedPermissions = false;
                        sdmIMController.expandedAttachments = true;
                        var typeaheadElement = $element.find('#info-change-permissions .typeahead');
                        sdmUsers.getUsers().then(function(data){
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

                        sdmIMController.nodeId = node.id;
                        sdmIMController.tileViewer = function(){tileViewer(sdmIMController.nodeId)};
                        sdmIMController.baseUrl = BASE_URL + 'acquisitions/' + node.id + '/file';
                        console.log(path);
                        sdmIMController.path = path.slice(1);
                        sdmIMController.title = level.slice(0, level.length - 1) + ': ';
                        sdmIMController.name = node.name;
                        sdmIMController.user = sdmUserManager.getAuthData();
                        console.log(sdmIMController.user);
                        sdmIMController.getAttachmentType = function(attachment) {
                            if (attachment.ext){
                                return attachment.ext.slice(1, attachment.length);
                            } else {
                                var nameSplit = attachment.name.split('.');
                                return nameSplit[nameSplit.length - 1];
                            }
                        };
                        makeAPICall.async(APIUrl, {site: node.site}).then(
                            function (apiData) {
                                console.log('apiData', apiData);
                                sdmIMController.data = node.level.getModalData(node, apiData);
                                sdmIMController.attachments = apiData.attachments||[];

                                sdmIMController.files = apiData.files||[];
                                if (sdmIMController.files.length) {
                                    sdmIMController.expandedAttachments = false;
                                    sdmIMController.expandedFiles = true;
                                }
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
                            sdmDownloadInterface.getDownloadURL(_node, true, false).then(function(response){
                                window.open(response.url, '_self');
                            });
                        };

                        sdmIMController.expandSection = function(section) {
                            switch(section) {
                                case 'permissions':
                                    sdmIMController.expandedPermissions = !sdmIMController.expandedPermissions;
                                    sdmIMController.expandedAttachments = false;
                                    sdmIMController.expandedFiles = false;
                                    break;
                                case 'attachments':
                                    sdmIMController.expandedPermissions = false;
                                    sdmIMController.expandedAttachments = !sdmIMController.expandedAttachments;
                                    sdmIMController.expandedFiles = false;
                                    break;
                                case 'files':
                                    sdmIMController.expandedPermissions = false;
                                    sdmIMController.expandedAttachments = false;
                                    sdmIMController.expandedFiles = !sdmIMController.expandedFiles;
                                    break;
                            }
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

                        sdmIMController.removeUser = function ($index, form) {
                            console.log('removing', sdmIMController.apiData.permissions[$index]);
                            var userID = sdmIMController.apiData.permissions[$index]._id;
                            sdmIMController.apiData.permissions.splice($index, 1);
                            sdmIMController.permissionPlaceholder = ' User removed. Save to confirm';
                            sdmIMController.success = true;
                            form.newPermission.hasErrors = false;
                            var viewValue = form.newPermission.$viewValue;
                            sdmIMController.selectedUID = null;
                            setTimeout(function(){
                                $scope.$apply(function(){
                                    sdmIMController.success = false;
                                    sdmIMController.selectedUID = viewValue;
                                });
                            }, 2000);
                            sdmIMController.arePermissionsChanged = true;
                        };

                        sdmIMController.updateAttachments = function() {
                            return makeAPICall.async(APIUrl, {site: node.site}).then(
                                function (apiData) {
                                    sdmIMController.attachments = apiData.attachments || [];
                                }
                            );
                        }

                        sdmIMController.confirmAttachmentRemove = [];

                        sdmIMController.addConfirmAttachment = function($index) {
                            sdmIMController.confirmAttachmentRemove[$index] = true;
                            setTimeout(function(){
                                sdmIMController.confirmAttachmentRemove[$index] = false;
                                $scope.$apply();
                            }, 30000);
                        }

                        sdmIMController.removeAttachment = function(attachment) {
                            var url = APIUrl + '/attachment?name=' + attachment.name
                                + attachment.ext;
                            makeAPICall.async(url, null, 'DELETE', null).then(sdmIMController.updateAttachments);
                        }

                        sdmIMController.downloadAttachment= function($index) {
                            var url = APIUrl + '/attachment?name=' + sdmIMController.attachments[$index].name
                                + sdmIMController.attachments[$index].ext;
                            makeAPICall.async(url, null, 'POST', null).then(function(response){
                                window.open(response.url, '_self');
                            });
                        };

                        sdmIMController.hasPapayaViewer = function(attachment) {
                            var filename = attachment.name + attachment.ext;
                            return filename.search(/\.nii(\.gz)?$/) >= 0;
                        }

                        sdmIMController.viewAttachment = function(attachment) {
                            var fullname = attachment.name + attachment.ext;
                            var url = APIUrl + '/attachment?name=' + fullname;
                            var callback;
                            if (sdmIMController.hasPapayaViewer(attachment)) {
                                callback = function(response) {
                                    papayaParams.images = [response.url];
                                    papaya.Container.startPapaya();
                                };
                            } else {
                                callback = function(response) {
                                    sdmIMController.resourceViewer = {
                                        fileUrl: response.url,
                                        type: sdmIMController.getAttachmentType(attachment)
                                    }
                                };
                            }
                            makeAPICall.async(url, null, 'POST', null).then(callback);
                        };

                        sdmIMController.viewFileInPapaya = function(file) {
                            var _node = {
                                level: level,
                                _id: node.id,
                                file: file
                            };
                            sdmDownloadInterface.getDownloadURL(_node, true, false).then(function(response){
                                papayaParams.images = [response.url];
                                papaya.Container.startPapaya();
                            });
                        }



                        sdmIMController.addUser = function ($event, form) {
                            if (!sdmIMController.selectedUID) {
                                form.hasErrors = true;
                                form.newPermission.hasErrors = true;
                                sdmIMController.selectedUID = null;
                                sdmIMController.permissionPlaceholder = "User UID is missing or invalid";
                                return;
                            } else {
                                if (!sdmIMController.users[sdmIMController.selectedUID]) {
                                    sdmIMController.createUserInModal($event);
                                    return;
                                } else if (sdmIMController.apiData.permissions.map(
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
                            sdmIMController.success = true;
                            form.newPermission.hasErrors = false;
                            setTimeout(function(){
                                $scope.$apply(function(){
                                    sdmIMController.success = false;
                                });
                            }, 2000);
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
