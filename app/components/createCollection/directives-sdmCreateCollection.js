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
                        sdmCCController.curator = sdmUserManager.getAuthData();
                        console.log('curator', sdmCCController.curator);
                        sdmCCController.addedPermissions = [{'_id': sdmCCController.curator.user_uid, 'access': 'admin'}];
                        sdmCCController.users = {};
                        sdmCCController.permissionPlaceholder = 'Enter User ID';
                        sdmCCController.collectionPlaceholder = 'Create New Collection';
                        sdmCCController.loadingState = 2;
                        var typeaheadElement = $element.find('#share .typeahead');
                        function initialize() {
                            sdmCCController.defaultSelectText = 'Select Existing Collection';
                            sdmUsers.getUsers().then(function(data){
                                console.log(data);
                                sdmCCController.users = data;

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
                                $element.on('typeahead:autocompleted typeahead:selected', function(event, selectedUID) {
                                    sdmCCController.selectedUID = selectedUID.value;
                                });
                                sdmCCController.loadingState--;
                            });
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
                        sdmRoles().then(function(data){
                            sdmCCController.roles = data;
                            sdmCCController.selectedRole = sdmCCController.roles[0];
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

                        sdmCCController.save = function ($event, form) {
                            $event.stopPropagation();
                            $event.preventDefault();
                            if (!form.$valid) {
                                console.log('form', form);
                                form.hasErrors = true;
                                sdmCCController.collectionPlaceholder = 'Please enter a name for the collection';
                                return;
                            }
                            console.log(sdmCCController.collectionsCurator);
                            console.log(sdmCCController.collectionID );
                            if (!sdmCCController.collectionsCurator) {
                                throw 'existing collections not initialized yet';
                            } else {
                                if (!sdmCCController.collectionID &&
                                    sdmCCController.collectionsCurator.indexOf(sdmCCController.collectionName) >= 0 ) {
                                    form.hasErrors = true;
                                    form.collectionName.hasErrors = true;
                                    sdmCCController.collectionPlaceholder =
                                        'Collection "' + sdmCCController.collectionName + '" already exists';
                                    sdmCCController.collectionName = null;
                                    return;
                                }
                            }

                            $scope.$parent.enableEvents();

                            selection.then(function(selection) {
                                console.log('selection', selection);
                                function updateCollection(_id) {
                                    sdmCollectionsInterface.updateCollection(
                                        _id,
                                        sdmCCController.collectionName,
                                        sdmCCController.collectionNotes||'',
                                        sdmCCController.addedPermissions,
                                        selection,
                                        'add'
                                    ).then(function(){
                                        sdmViewManager.refreshView('collections');
                                    });

                                }
                                if (sdmCCController.collectionID) {
                                    updateCollection(sdmCCController.collectionID);
                                } else {
                                    sdmCollectionsInterface.createCollection(
                                        sdmCCController.collectionName,
                                        sdmCCController.collectionNotes||'',
                                        sdmCCController.addedPermissions
                                    ).then(function(response){
                                        console.log('collection created', response);
                                        updateCollection(response._id);
                                    });
                                }
                            });

                            $scope.$parent._hidePopover($event, 0);
                        };

                        sdmCCController.delete = function($event) {
                            $event.stopPropagation();
                            $event.preventDefault();
                            sdmCollectionsInterface.deleteCollection(sdmCCController.collectionID).then(
                                function(){
                                    sdmViewManager.refreshView('collections');
                                });
                            $scope.$parent.enableEvents();
                            $scope.$parent._hidePopover($event, 0);
                        };

                        sdmCCController.addUser = function ($event, form) {
                            if (!sdmCCController.selectedUID) {
                                form.hasErrors = true;
                                form.newPermission.hasErrors = true;
                                sdmCCController.selectedUID = null;
                                sdmCCController.permissionPlaceholder = "User UID is missing";
                                return;
                            } else {
                                if (sdmCCController.addedPermissions.map(
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
                            sdmCCController.addedPermissions.push({
                                _id: sdmCCController.selectedUID,
                                access: sdmCCController.selectedRole.rid
                            });
                            sdmCCController.selectedUID = '';
                            sdmCCController.permissionPlaceholder = 'Permission added. Save to confirm.';
                        };

                        sdmCCController.removeUser = function ($index) {
                            sdmCCController.addedPermissions.splice($index, 1);
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
                                console.log(sdmCCController.selectedCollection);
                                sdmCCController.collectionName = sdmCCController.selectedCollection.name;
                                sdmCCController.collectionID = sdmCCController.selectedCollection._id;
                                sdmCCController.collectionNotes = sdmCCController.selectedCollection.notes;
                                sdmCollectionsInterface.getCollection(sdmCCController.collectionID).then(
                                    function(collection){
                                        console.log(collection);
                                        sdmCCController.addedPermissions = collection.permissions;
                                        console.log(collection.permissions);
                                });
                                sdmCCController.defaultSelectText = 'Create New Collection';
                            } else {
                                sdmCCController.collectionName = '';
                                sdmCCController.collectionID = null;
                                sdmCCController.collectionNotes = '';
                                sdmCCController.addedPermissions = [{'_id': sdmCCController.curator.user_uid, 'access': 'admin'}];
                                sdmCCController.defaultSelectText = 'Select Existing Collection';
                            }
                        };

                        sdmCollectionsInterface.getCollections().then(
                            function(collections){
                                console.log(collections);
                                var existingCollections =
                                    sdmCCController.curator.root?collections:collections.filter(
                                        function(collection){
                                            console.log(collection.permissions);
                                            for (var i = 0; i < collection.permissions.length; i++) {
                                                if (collection.permissions[i]._id === sdmCCController.curator.user_uid) {
                                                    collection.userAccess = collection.permissions[i].access;
                                                    return collection.userAccess.search(/modify$|admin$/) === 0;
                                                }
                                            }
                                            return false;
                                        });
                                sdmCCController.existingCollections = existingCollections.sort(naturalSortByName);
                                sdmCCController.collectionsCurator = sdmCCController.existingCollections.filter(
                                    function (collection) {
                                        return collection.curator._id === sdmCCController.curator.user_uid;
                                    }
                                ).map(function(collection){return collection.name});
                            }
                        );

                    }
                }
            }]
        );
})();
