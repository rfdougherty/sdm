'use strict';

(function() {
    angular.module('sdm.createCollection.directives.sdmCreateCollection',
        [
            'sdm.createCollection.services.sdmGetSelection', 'sdm.authentication.services.sdmUserManager',
            'sdm.main.services.sdmViewManager',
            'sdm.APIServices.services.sdmRoles', 'sdm.APIServices.services.sdmUsers',
            'sdm.APIServices.services.sdmCollectionsInterface',
            'sdm.popovers.services.sdmPopoverTrampoline'])
        .directive('sdmCreateCollection', [
            '$q', '$location', 'sdmPopoverTrampoline', 'sdmGetSelection', 'sdmUserManager',
            'sdmViewManager', 'sdmRoles', 'sdmUsers', 'sdmCollectionsInterface',
            function($q, $location, sdmPopoverTrampoline, sdmGetSelection, sdmUserManager,
                     sdmViewManager, sdmRoles, sdmUsers, sdmCollectionsInterface) {

                return {
                    restrict: 'E',
                    scope: false,
                    replace: false, // Replace with the template below
                    transclude: false,// we want to insert custom content inside the directive
                    controller: function(){},
                    controllerAs: 'sdmCCController',
                    link: function($scope, $element, $attrs, sdmCCController) {
                        console.log('scopeCreateCollection', $scope);
                        var currentPath = $location.path();
                        var viewID = currentPath.substring(1, currentPath);
                        var  typeaheadElement;
                        sdmCCController.curator = sdmUserManager.getAuthData();
                        console.log('curator', sdmCCController.curator);

                        sdmCCController.users = {};

                        sdmCCController.permissionPlaceholder = 'Enter User ID';
                        sdmCCController.collectionPlaceholder = 'Give your collection a name';
                        sdmCCController.collectionUpdatePlaceholder = 'Edit your collection name';
                        sdmCCController.loadingState = 2;
                        function initialize() {
                            sdmUsers.getUsers().then(function(data){
                                console.log(data);
                                sdmCCController.users = data;
                                sdmCCController.loadingState--;
                            });
                        }
                        function initializeTypeahead() {
                            if (!typeaheadElement) {
                                typeaheadElement = $element.find('#collection-permissions .typeahead');
                                typeaheadElement.typeahead({
                                        hint: true,
                                        highlight: true,
                                        minLength: 3
                                    },
                                    {
                                        name: 'users',
                                        displayKey: 'value',
                                        source: substringMatcher(sdmCCController.users, '_id')
                                    });
                                typeaheadElement.on('typeahead:autocompleted typeahead:selected', function(event, selectedUID) {
                                    sdmCCController.selectedUID = selectedUID.value;
                                });
                                var typeahead_hint_element = angular.element('#collection-permissions .tt-hint');
                                typeahead_hint_element.css('background-color', 'transparent');
                            }
                        }
                        function initializeCollections() {
                            return sdmCollectionsInterface.getCollections().then(
                                function(collections){
                                    console.log(collections);
                                    var existingCollections =
                                        sdmCCController.curator.root?collections:collections.filter(
                                            function(collection){
                                                console.log(collection.permissions);
                                                for (var i = 0; i < collection.permissions.length; i++) {
                                                    if (collection.permissions[i]._id === sdmCCController.curator.user_uid) {
                                                        collection.userAccess = collection.permissions[i].access;
                                                        return collection.userAccess.search(/rw$|admin$/) === 0;
                                                    }
                                                }
                                                return false;
                                            });
                                    sdmCCController.existingCollections = existingCollections.sort(naturalSortByName);
                                    sdmCCController.collectionsCurator = sdmCCController.existingCollections.filter(
                                        function (collection) {
                                            return collection.curator === sdmCCController.curator.user_uid;
                                        }
                                    ).map(function(collection){return collection.name});
                                }
                            );
                        }
                        var refreshUsers = function() {
                            sdmUsers.getUsers().then(function(data){
                                sdmCCController.users = data;
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
                                        source: substringMatcher(sdmCCController.users, '_id')
                                    }
                                );
                            });
                        };
                        initialize();
                        initializeCollections();
                        sdmRoles().then(function(data){
                            sdmCCController.roles = data;
                            sdmCCController.loadingState--;
                        });

                        $scope.$parent.disableEvents();
                        var selection = sdmGetSelection.getSelection();
                        sdmCCController.cancel = function ($event) {
                            $event.stopPropagation();
                            $event.preventDefault();
                            $scope.$parent.enableEvents();
                            $scope.$parent._hidePopover($event, 0);
                        };

                        var findCollectionByID = function(_id) {
                            var results = sdmCCController.existingCollections.filter(function(g){
                                return g._id === _id;
                            });
                            return results.length === 0?undefined:results[0];
                        }

                        sdmCCController.save = function ($event, form, newCollection) {
                            $event.stopPropagation();
                            $event.preventDefault();
                            if (!form.$valid) {
                                console.log('form', form);
                                form.hasErrors = true;
                                sdmCCController.collectionPlaceholder = 'Please enter a name for the collection';
                                return;
                            }
                            console.log(sdmCCController.collectionsCurator);
                            console.log(sdmCCController.collectionName );
                            if (!sdmCCController.collectionsCurator) {
                                throw 'existing collections not initialized yet';
                            } else {
                                if (newCollection &&
                                    sdmCCController.collectionsCurator.indexOf(sdmCCController.collectionName) >= 0 ) {
                                    form.hasErrors = true;
                                    form.collectionName.hasErrors = true;
                                    sdmCCController.collectionPlaceholder =
                                        'Collection "' + sdmCCController.collectionName + '" already exists';
                                    sdmCCController.collectionName = null;
                                    return;
                                }
                            }



                            selection.then(function(selection) {
                                console.log('selection', selection);
                                function updateCollection(_id) {
                                    sdmCollectionsInterface.updateCollection(
                                        _id,
                                        sdmCCController.selectedCollection.name,
                                        sdmCCController.addedPermissions.map(function(p) {
                                            return {
                                                _id: p._id,
                                                access: p.access
                                            }
                                        }),
                                        selection,
                                        'add'
                                    ).then(function(){
                                        sdmViewManager.refreshView('collections');
                                    });

                                }
                                if (!newCollection) {
                                    updateCollection(sdmCCController.selectedCollection._id);
                                    $scope.$parent.enableEvents();
                                    $scope.$parent._hidePopover($event, 0);
                                } else {
                                    sdmCCController.addedPermissions = [
                                        {
                                            '_id': sdmCCController.curator.user_uid,
                                            name: sdmCCController.curator.firstname + ' ' + sdmCCController.curator.lastname,
                                            'access': 'admin'
                                        }
                                        ];
                                    sdmCollectionsInterface.createCollection(
                                        sdmCCController.collectionName,
                                        sdmCCController.addedPermissions.map(function(p) {
                                            return {
                                                _id: p._id,
                                                access: p.access
                                            }
                                        })
                                    ).then(function(result){
                                        initializeCollections().then(function(){
                                            sdmCCController.selectedCollection = findCollectionByID(result._id);
                                            sdmCCController.collectionName = null;
                                            initializeTypeahead();
                                        }).then(function(){
                                            updateCollection(sdmCCController.selectedCollection._id);
                                        });
                                    })
                                }
                            });
                        };

                        sdmCCController.delete = function($event) {
                            $event.stopPropagation();
                            $event.preventDefault();
                            sdmCollectionsInterface.deleteCollection(sdmCCController.selectedCollection._id).then(
                                function(){
                                    initializeCollections();
                                    sdmViewManager.refreshView('collections');
                                    sdmCCController.selectedCollection = null;
                                    typeaheadElement.typeahead('destroy');
                                    typeaheadElement = null;
                                });
                        };

                        sdmCCController.addUser = function ($event, form) {
                            if (!sdmCCController.selectedUID) {
                                form.hasErrors = true;
                                form.newPermission.hasErrors = true;
                                sdmCCController.selectedUID = null;
                                sdmCCController.permissionPlaceholder = "User UID is missing or invalid";
                                return;
                            } else {
                                if (!sdmCCController.users[sdmCCController.selectedUID]) {
                                    sdmCCController.createUserInModal($event);
                                    return;
                                } else if (sdmCCController.addedPermissions.map(
                                        function(permission){
                                            return permission._id;
                                        }).indexOf(sdmCCController.selectedUID) >= 0 ) {
                                    form.hasErrors = true;
                                    form.newPermission.hasErrors = true;
                                    sdmCCController.selectedUID = null;
                                    sdmCCController.permissionPlaceholder = "User already has a permission";
                                    return;
                                }
                            }
                            console.log(sdmCCController.selectedRole);
                            var selectedName;
                            var selectedUser = sdmCCController.users[sdmCCController.selectedUID];
                            if (selectedUser && selectedUser.lastname) {
                                selectedName = selectedUser.firstname + ' ' + selectedUser.lastname;
                            } else {
                                selectedName = sdmCCController.selectedUID;
                            }
                            sdmCCController.addedPermissions.push({
                                _id: sdmCCController.selectedUID,
                                name: selectedName,
                                access: sdmCCController.selectedRole.rid
                            });
                            sdmCCController.selectedUID = null;
                            sdmCCController.success = true;
                            form.newPermission.hasErrors = false;
                            setTimeout(function(){
                                $scope.$apply(function(){
                                    sdmCCController.success = false;
                                    sdmCCController.permissionPlaceholder = 'Enter User ID';
                                });
                            }, 2000);
                            sdmCCController.permissionPlaceholder = 'Permission added. Save to confirm.';
                            typeaheadElement.typeahead('val', '');
                        };

                        sdmCCController.removeUser = function ($index, form) {
                            sdmCCController.addedPermissions.splice($index, 1);
                            sdmCCController.permissionPlaceholder = ' User removed. Save to confirm';
                            sdmCCController.success = true;
                            console.log(form);
                            form.newPermission.hasErrors = false;
                            var viewValue = form.newPermission.$viewValue;
                            sdmCCController.selectedUID = null;
                            setTimeout(function(){
                                $scope.$apply(function(){
                                    sdmCCController.success = false;
                                    sdmCCController.selectedUID = viewValue;
                                    sdmCCController.permissionPlaceholder = 'Enter User ID';
                                });
                            }, 2000);
                        };

                        sdmCCController.createUserInModal = function ($event) {
                            $event.stopPropagation();
                            $event.preventDefault();
                            sdmPopoverTrampoline.trigger(
                                'sdm-create-user',
                                'components/admin/userCreationModal.html',
                                {refreshUsers: refreshUsers}
                            );
                        }

                        sdmCCController.selectCollection = function() {
                            if (sdmCCController.selectedCollection) {
                                initializeTypeahead();
                                sdmCollectionsInterface.getCollection(sdmCCController.selectedCollection._id).then(
                                    function(collection){
                                        collection.permissions.forEach(function (p) {
                                            var user = sdmCCController.users[p._id];
                                            if (user && user.lastname) {
                                                p.name = user.firstname + ' ' + user.lastname;
                                            } else {
                                                p.name = p._id;
                                            }
                                        });
                                        sdmCCController.addedPermissions = collection.permissions;
                                });

                            }
                        };

                    }
                }
            }]
        );
})();
