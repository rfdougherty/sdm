'use strict';
var _inputEl;
(function() {
    angular.module('sdm.infoModal.directives.sdmInfoModal',
            ['sdm.services', 'sdm.download.services.sdmDownloadInterface',
             'sdm.authentication.services.sdmUserManager', 'sdm.main.services.sdmViewManager',
             'sdm.APIServices.services.sdmRoles',
             'sdm.APIServices.services.sdmUsers',
             'sdm.popovers.services.sdmPopoverTrampoline',
             'sdm.util.services.sdmHumanReadableSize',
             'sdm.util.services.sdmTileViewer',
             'sdm.getNodeData.services.sdmGetPermalinks'])
        .directive('sdmInfoModal', ['$location', '$document', '$q', 'sdmPopoverTrampoline', 'makeAPICall',
            'sdmDownloadInterface', 'sdmUserManager', 'sdmViewManager', 'sdmRoles',
            'sdmUsers', 'sdmHumanReadableSize', 'sdmTileViewer', 'sdmGetPermalinks',
            function($location, $document, $q, sdmPopoverTrampoline, makeAPICall, sdmDownloadInterface,
                sdmUserManager, sdmViewManager, sdmRoles, sdmUsers, sdmHumanReadableSize, sdmTileViewer,
                sdmGetPermalinks) {

                return {
                    restrict: 'E',
                    scope: false,
                    replace: false, // Replace with the template below
                    transclude: false,// we want to insert custom content inside the directive
                    controller: function(){},
                    controllerAs: 'sdmIMController',
                    link: function($scope, $element, $attrs, sdmIMController) {
                        $scope.$parent.disableEvents();
                        var node = $scope.$parent.$parent.data;
                        var APIUrl = BASE_URL + node.level.name + '/' + node.id;
                        sdmIMController.getPermalink = function(filename) {
                            return APIUrl + '/file/' + filename + '?user=';
                        }
                        var level = node.level.name;
                        $scope.node = node;
                        sdmIMController.data = {};
                        var path = [];
                        var n = node;
                        sdmIMController.apiDataNotes = [];
                        sdmIMController.formatSize = sdmHumanReadableSize;
                        makeAPICall.async(BASE_URL + level + '/schema', {site: node.site}).then(function(jsonSchema){
                            console.log(jsonSchema);
                            sdmIMController.jsonSchema = jsonSchema;
                        })
                        while (n.parent){
                            path.unshift(n.parent.level.name==='sessions'?n.parent.name + ' - ' + n.parent.subject:n.parent.name);
                            n = n.parent;
                        }
                        sdmIMController.loadingState = 3;
                        sdmIMController.permissionPlaceholder = 'Enter User ID';
                        sdmRoles().then(function(data){
                            sdmIMController.roles = data;
                            sdmIMController.loadingState--;
                        });

                        var typeaheadElement = $element.find('#info-change-permissions .typeahead');
                        var usersPromise = sdmUsers.getUsers().then(function(data){
                            sdmIMController.users = data;
                            sdmIMController.loadingState--;
                            return data;
                        });
                        sdmIMController.sitesName = {};
                        makeAPICall.async(BASE_URL + 'sites?all=true').then(function(sites){
                            var typeaheadArgs = [{
                                hint: true,
                                highlight: true,
                                minLength: 3
                            }];
                            sites.map(function(site){
                                if (site.onload) {
                                    sdmIMController.localSite = site;
                                }
                                sdmIMController.sitesName[site._id] = site.name;
                                return {
                                    usersPromise: sdmUsers.getUsers(site),
                                    site: site
                                };
                            }).forEach(function(value) {
                                typeaheadArgs.push(
                                    {
                                        name: 'users',
                                        displayKey: 'value',
                                        limit: 100,
                                        source: substringMatcher(null, 'extendedId', value.usersPromise),
                                        templates: {
                                            header: '<h4 class="league-name">' + value.site.name + '</h4>'
                                        }
                                    }
                                );
                            });
                            typeaheadElement.typeahead.apply(typeaheadElement, typeaheadArgs);
                            $element.on('typeahead:autocompleted typeahead:selected', function(event, selectedUID) {
                                console.log('typeahead', selectedUID);
                                sdmIMController.selectedUID = selectedUID.element._id;
                                sdmIMController.selectedUIDsite = selectedUID.element.site;
                            });
                        });
                        sdmIMController.getUsername = function(_id) {
                            if (sdmIMController.users) {
                                var user = sdmIMController.users[_id];
                                return (user && user.lastname)?user.firstname + ' ' + user.lastname:_id
                            } else {
                                return _id;
                            }
                        }
                        sdmIMController.nodeId = node.id;
                        sdmIMController.tileViewer = function(filename){
                            sdmTileViewer(sdmIMController.nodeId, filename, node.site, level, 'div.sdm-d3-map');
                        };
                        console.log(path);
                        sdmIMController.path = path.slice(1);
                        sdmIMController.title = level.slice(0, level.length - 1);
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
                        var refreshDataInModal = function(){

                            return makeAPICall.async(APIUrl, {site: node.site}).then(
                                function (apiData) {
                                    console.log('apiData', apiData);
                                    sdmIMController.data = node.level.getModalData(node, apiData);
                                    sdmIMController.data.forEach(function(field){
                                        field.originalValue = field.value;
                                    });
                                    sdmIMController.attachments = [];
                                    sdmIMController.files = [];
                                    apiData.files = apiData.files || [];
                                    apiData.files.forEach(function(file){
                                        if (file.flavor === 'data') {
                                            sdmIMController.files.push(file);
                                        } else if (file.flavor === 'attachment'){
                                            sdmIMController.attachments.push(file);
                                        }
                                    });
                                    sdmIMController.editables = node.level.editables ||{};


                                    if (sdmIMController.files.length) {
                                        sdmIMController.expandedAttachments = false;
                                        sdmIMController.expandedFiles = true;
                                    }
                                    sdmIMController.files.sort(function(file, file1){
                                        return file.filetype===file1.filetype?0:file.filetype>file1.filetype?1:-1 });

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
                                    } else if (apiData.public){
                                        sdmIMController.userPermission = 'ro';
                                    }
                                    if (sdmIMController.user.root) {
                                        sdmIMController.isAdmin = sdmIMController.canModify = true;
                                    }

                                    apiData.permissions =
                                        node.level.name.search(/collections|projects/) === 0 ?
                                            apiData.permissions : null;
                                    sdmIMController.apiData = apiData;
                                    if (sdmIMController.apiData.notes){
                                        sdmUsers.getUsers().then(function(){
                                            sdmIMController.apiDataNotes = sdmIMController.apiData.notes.map(function(note){
                                                var author = sdmIMController.users[note.author];
                                                return {
                                                    author: author.firstname + ' ' + author.lastname,
                                                    text: note.text,
                                                    date: new Date(note.timestamp).toDateString()
                                                }
                                            });
                                        })
                                    }
                                },
                                function(reason){
                                    console.log('rejected request because of', reason);
                                    sdmIMController.dismiss();
                                });
                        }
                        refreshDataInModal().then(function(){
                            sdmIMController.loadingState--;
                            if (
                                    sdmIMController.files.length &&
                                    (
                                        sdmIMController.userPermission === 'admin' || sdmIMController.userPermission === 'rw' ||
                                        sdmIMController.user.root || sdmIMController.userPermission === 'ro'
                                    )
                                ) {
                                sdmIMController.modalView = 'file list';
                            } else if (
                                    sdmIMController.attachments.length || sdmIMController.userPermission === 'admin' ||
                                    sdmIMController.userPermission === 'rw' || sdmIMController.user.root
                                ){

                                sdmIMController.modalView = 'attachments';
                            } else {
                                sdmIMController.modalView = 'notes';
                            }
                        });

                         sdmIMController.download = function(file) {
                             var url = APIUrl + '/file/' + file.filename + '?ticket';
                             makeAPICall.async(url, {site: node.site}, 'GET', null).then(function(response){
                                 window.open(url + '=' + response.ticket + '&site=' + node.site, '_self');
                             });
                         };

                        sdmIMController.close = function ($event) {
                            $scope.$parent.enableEvents();
                            $scope.$parent._hidePopover($event, 0);
                        };
                        sdmIMController.createNewNote = function($event){
                            if ($event.keyCode === 13 & !$event.shiftKey) {
                                $event.preventDefault();
                                $event.stopPropagation();
                                sdmIMController.apiData.notes = sdmIMController.apiData.notes||[];
                                sdmIMController.newNote = sdmIMController.newNote.replace(/\10/, '\n')
                                console.log({a: sdmIMController.newNote})
                                sdmIMController.apiData.notes.push({text: sdmIMController.newNote||''});
                                var url = BASE_URL + node.level.name + '/' + node.id;
                                var payload = {
                                    notes: sdmIMController.apiData.notes
                                }
                                makeAPICall.async(url, {site: node.site}, 'PUT', payload).then(refreshDataInModal).then(
                                    function(){
                                        var currentPath = $location.path();
                                        currentPath = currentPath.substring(1, currentPath.length);
                                        sdmViewManager.refreshView(currentPath);
                                    });
                                sdmIMController.newNote = null;
                                return;
                            }
                        }

                        sdmIMController.removeNote = function($index){
                            var length = sdmIMController.apiData.notes.length;
                            sdmIMController.apiData.notes.splice(length - $index - 1, 1);
                            var url = BASE_URL + node.level.name + '/' + node.id;
                            var payload = {
                                notes: sdmIMController.apiData.notes
                            }

                            makeAPICall.async(url, {site: node.site}, 'PUT', payload).then(refreshDataInModal).then(
                                function(){
                                    var currentPath = $location.path();
                                    currentPath = currentPath.substring(1, currentPath.length);
                                    sdmViewManager.refreshView(currentPath);
                                });
                            sdmIMController.newNote = null;
                        }

                        sdmIMController.removeUser = function ($index, form) {
                            console.log('removing', sdmIMController.apiData.permissions[$index]);
                            var userID = sdmIMController.apiData.permissions[$index]._id;
                            sdmIMController.apiData.permissions.splice($index, 1);
                            var url = BASE_URL + node.level.name + '/' + node.id;
                            var payload = {};

                            payload.permissions = sdmIMController.apiData.permissions;

                            makeAPICall.async(url, {site: node.site}, 'PUT', payload).then(function() {
                                sdmIMController.permissionPlaceholder = ' User removed';
                                sdmIMController.success = true;
                                form.newPermission.hasErrors = false;
                                var viewValue = form.newPermission.$viewValue;
                                sdmIMController.selectedUID = null;
                                setTimeout(function(){
                                    $scope.$apply(function(){
                                        sdmIMController.success = false;
                                        sdmIMController.selectedUID = viewValue;
                                        sdmIMController.permissionPlaceholder = 'Enter User ID';
                                    });
                                }, 2000);
                            });
                        };

                        sdmIMController.updateAttachmentsAndFiles = function() {
                            sdmViewManager.refreshView();
                            return makeAPICall.async(APIUrl, {site: node.site}).then(
                                function (apiData) {
                                    sdmIMController.attachments = [];
                                    sdmIMController.files = [];
                                    apiData.files.forEach(function(file){
                                        if (file.flavor === 'data') {
                                            sdmIMController.files.push(file);
                                        } else if (file.flavor === 'attachment'){
                                            sdmIMController.attachments.push(file);
                                        }
                                    });
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
                            var url = APIUrl + '/file/' + attachment.filename;
                            makeAPICall.async(url, {site: node.site}, 'DELETE', null).then(sdmIMController.updateAttachmentsAndFiles);
                        }

                        sdmIMController.downloadAttachment= function($index) {
                            var url = APIUrl + '/file/' + sdmIMController.attachments[$index].filename + '?ticket';

                            makeAPICall.async(url, {site: node.site}, 'GET', null).then(function(response){

                                window.open(url + '=' + response.ticket + '&site=' + node.site, '_self');
                            });
                        };

                        sdmIMController.hasPapayaViewer = function(attachment) {
                            var filename = attachment.filename;
                            return filename.search(/\.nii(\.gz)?$/) >= 0;
                        }

                        sdmIMController.hasBbrowserViewer = function(attachment) {
                            var filename = attachment.filename;
                            return filename.search(/\.obj$/) >= 0;
                        }

                        sdmIMController.hasCsvViewer = function(attachment) {
                            return attachment.mimetype === 'text/csv' || attachment.mimetype === 'text/tab-separated-values';
                        }

                        sdmIMController.viewAttachment = function(attachment) {
                            var url = APIUrl + '/file/' + attachment.filename + '?ticket';
                            var callback;
                            if (sdmIMController.hasBbrowserViewer(attachment)) {
                                callback = function(response) {
                                    sdmIMController.ticketUrl =
                                        url + '=' + response.ticket +
                                        '&site=' + node.site +
                                        '&view=true';
                                };
                            }  else if (sdmIMController.hasCsvViewer(attachment)) {
                                callback = function(response) {
                                    sdmIMController.mimetype = attachment.mimetype;
                                    sdmIMController.filename = attachment.filename;
                                    sdmIMController.csvTicketUrl =
                                        url + '=' + response.ticket +
                                        '&site=' + node.site +
                                        '&view=true';
                                };
                            }
                            else if (sdmIMController.hasPapayaViewer(attachment)) {
                                callback = function(response) {
                                    papayaParams.images = [
                                        url + '=' + response.ticket +
                                        '&site=' + node.site + '&view=true'
                                    ];
                                    papayaParams.showOrientation = false;
                                    setTimeout(function(){
                                        papaya.Container.startPapaya();
                                    }, 0)
                                };
                            } else {
                                callback = function(response) {
                                    sdmIMController.resourceViewer = {
                                        fileUrl: url + '=' + response.ticket +
                                            '&site=' + node.site +
                                            '&view=true',
                                        mimetype: attachment.mimetype
                                    }
                                };
                            }
                            makeAPICall.async(url, {site: node.site}, 'GET', null).then(callback);
                        };

                        sdmIMController.viewFileInPapaya = function(file) {
                            var url = APIUrl + '/file/' + file.filename + '?ticket';
                            makeAPICall.async(url, {site: node.site}, 'GET', null).then(function(response){
                                papayaParams.images = [url + '=' + response.ticket + '&site=' + node.site];
                                papayaParams.showOrientation = false;
                                setTimeout(function(){
                                    papaya.Container.startPapaya();
                                }, 0);
                            });
                        }

                        sdmIMController.updateValue = function(field) {
                            var values = [];
                            field.optionsSelected.forEach(
                                function(o){
                                    values.push(sdmIMController.editables[field.key].dropdown[o]);
                                }
                            );
                            field.value = values.join(',');
                        }

                        sdmIMController.edit = function($event, field) {
                            if (sdmIMController.editables[field.key]){
                                field.editing = !field.editing;
                                var inputEl = $event.currentTarget.parentElement.getElementsByTagName('input')[0];
                                setTimeout(function(){
                                    inputEl.focus()
                                }, 0);
                            }
                        }

                        sdmIMController.addUser = function ($event, form) {
                            if (!sdmIMController.selectedUID) {
                                form.hasErrors = true;
                                form.newPermission.hasErrors = true;
                                sdmIMController.selectedUID = null;
                                sdmIMController.permissionPlaceholder = "User UID is missing or invalid";
                                return;
                            } else {
                                if (!sdmIMController.selectedUIDsite && !sdmIMController.users[sdmIMController.selectedUID]) {
                                    sdmIMController.permissionPlaceholder = 'User ' + sdmIMController.selectedUID + ' does not exist';
                                    form.hasErrors = true;
                                    form.newPermission.hasErrors = true;
                                    sdmIMController.selectedUID = null;
                                    //sdmIMController.createUserInModal($event);
                                    return;
                                } else {
                                    var matches = sdmIMController.apiData.permissions.filter(function(permission){
                                        return permission._id === sdmIMController.selectedUID &&
                                            (permission.site === sdmIMController.selectedUIDsite ||
                                             sdmIMController.localSite._id === sdmIMController.selectedUIDsite);
                                    });
                                    if (matches.length > 0) {
                                        form.hasErrors = true;
                                        form.newPermission.hasErrors = true;
                                        sdmIMController.selectedUID = null;
                                        sdmIMController.permissionPlaceholder = "User already has permission";
                                        return;
                                    }
                                }
                            }
                            var permission = {
                                _id: sdmIMController.selectedUID,
                                access: sdmIMController.selectedRole.rid
                            }
                            if (sdmIMController.selectedUIDsite !== sdmIMController.localSite._id){
                                permission.site = sdmIMController.selectedUIDsite;
                            }
                            sdmIMController.apiData.permissions.push(permission);

                            var url = BASE_URL + node.level.name + '/' + node.id;
                            var payload = {};

                            payload.permissions = sdmIMController.apiData.permissions;

                            makeAPICall.async(url, {site: node.site}, 'PUT', payload).then(function() {
                                sdmIMController.selectedUID = '';
                                sdmIMController.permissionPlaceholder = 'Permission added.';
                                sdmIMController.success = true;
                                form.newPermission.hasErrors = false;
                                setTimeout(function(){
                                    $scope.$apply(function(){
                                        sdmIMController.success = false;
                                        sdmIMController.permissionPlaceholder = 'Enter User ID';
                                    });
                                }, 2000);
                                sdmIMController.selectedRole = null;
                                typeaheadElement.typeahead('val', '');
                            });
                        };

                        sdmIMController.updatePermissions = function($event, form) {
                            var url = BASE_URL + node.level.name + '/' + node.id;
                            var payload = {};

                            payload.permissions = sdmIMController.apiData.permissions;

                            makeAPICall.async(url, {site: node.site}, 'PUT', payload).then(function(){
                                var currentPath = $location.path();
                                currentPath = currentPath.substring(1, currentPath.length);
                                sdmViewManager.refreshView(currentPath);
                            });
                        }
                        sdmIMController.saveFields = function ($event) {
                            var url = BASE_URL + node.level.name + '/' + node.id;
                            var payload = {};//{notes: sdmIMController.apiData.notes};
                            var name;
                            console.log(sdmIMController.data);
                            sdmIMController.data.filter(function(field) {
                                return sdmIMController.editables[field.key]
                            }).forEach(
                                function (field){
                                    sdmIMController.editables[field.key].update(payload, field.value);
                                    if (field.key === 'Name') {
                                        name = field.value;
                                    }
                                }
                            )
                            makeAPICall.async(url, {site: node.site}, 'PUT', payload).then(function(){
                                    var currentPath = $location.path();
                                    currentPath = currentPath.substring(1, currentPath.length);
                                    sdmViewManager.refreshView(currentPath);
                                    if (name) {
                                        sdmIMController.name = node.name = name;
                                    }
                                });
                        }
                        sdmIMController.permalinks = [];
                        sdmGetPermalinks(node).then(function(permalinks) {
                            sdmIMController.permalinks = permalinks;
                            var blob = new Blob(permalinks, {type: 'text/plain'});
                            sdmIMController.permalinksURL = URL.createObjectURL(blob);
                        });
                        sdmIMController.getPermalinksList = function() {
                            window.open(sdmIMController.permalinksURL);
                        }
                    }
                }
            }
            ]
        );
})();
