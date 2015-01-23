'use strict';

var _sdmCCController;
(function() {
    angular.module('sdm.createCollection.directives.sdmCreateCollection',
        [
            'sdm.createCollection.services.sdmGetSelection', 'sdm.authentication.services.sdmUserManager',
            'sdm.main.services.sdmViewManager',
            'sdm.APIServices.services.sdmRoles', 'sdm.APIServices.services.sdmUsers',
            'sdm.APIServices.services.sdmCollectionsInterface'])
        .directive('sdmCreateCollection', [
            '$q', '$location', 'sdmGetSelection', 'sdmUserManager', 'sdmViewManager', 'sdmRoles', 'sdmUsers', 'sdmCollectionsInterface',
            function($q, $location, sdmGetSelection, sdmUserManager, sdmViewManager, sdmRoles, sdmUsers, sdmCollectionsInterface) {


                var substringMatcher = function(elements, field) {
                  return function findMatches(q, cb) {
                    var matches, substrRegex;

                    // an array that will be populated with substring matches
                    matches = [];

                    // regex used to determine if a string contains the substring `q`
                    substrRegex = new RegExp(q, 'i');

                    // iterate through the pool of strings and for any string that
                    // contains the substring `q`, add it to the `matches` array
                    $.each(elements, function(i, element) {
                      if (substrRegex.test(element[field])) {
                        // the typeahead jQuery plugin expects suggestions to a
                        // JavaScript object, refer to typeahead docs for more info
                        matches.push({ value: element[field] });
                      }
                    });

                    cb(matches);
                  };
                };

                return {
                    restrict: 'E',
                    scope: false,
                    replace: false, // Replace with the template below
                    transclude: false,// we want to insert custom content inside the directive
                    controller: function(){},
                    controllerAs: 'sdmCCController',
                    link: function($scope, $element, $attrs, controller) {
                        console.log('scopeCreateCollection', $scope);
                        var currentPath = $location.path();
                        var viewID = currentPath.substring(1, currentPath);
                        _sdmCCController = controller;
                        controller.curator = sdmUserManager.getAuthData();
                        console.log('curator', controller.curator);
                        controller.addedPermissions = [{'_id': controller.curator.user_uid, 'access': 'admin'}];
                        controller.users = {};
                        $scope.form.name = {}

                        function initialize() {
                            $scope.$parent.dialogStyle.height = '500px';//100px';
                            $scope.$parent.dialogStyle.width = '600px';//280px';
                            controller.defaultSelectText = '(Select Existing Collection)';
                            sdmUsers.getUsers().then(function(data){
                                console.log(data);
                                controller.users = data;

                                $element.find('#share .typeahead').typeahead({
                                        hint: true,
                                        highlight: true,
                                        minLength: 3
                                    },
                                    {
                                        name: 'users',
                                        displayKey: 'value',
                                        source: substringMatcher(controller.users, '_id')
                                    });
                                $element.on('typeahead:autocompleted typeahead:selected', function(event, selectedUID) {
                                    controller.selectedUID = selectedUID.value;
                                });
                            });
                        }
                        initialize();
                        sdmRoles().then(function(data){
                            controller.roles = data;
                            controller.selectedRole = controller.roles[0];
                        });

                        $scope.$parent.disableEvents();
                        var selection = sdmGetSelection.getSelection();
                        controller.cancel = function ($event) {
                            $event.stopPropagation();
                            $event.preventDefault();
                            $scope.$parent.enableEvents();
                            $scope.$parent._hidePopover($event, 0);
                        };

                        controller.save = function ($event, form) {
                            $event.stopPropagation();
                            $event.preventDefault();
                            if (!form.$valid) {
                                console.log('form', form);
                                form.hasErrors = true;
                                return;
                            }
                            console.log(controller.collectionsCurator);
                            console.log(controller.collectionID );
                            if (!controller.collectionsCurator) {
                                throw 'existing collections not initialized yet';
                            } else {
                                if (!controller.collectionID &&
                                    controller.collectionsCurator.indexOf(controller.collectionName) >= 0 ) {
                                    form.hasErrors = true;
                                    form.name.hasErrors = true;
                                    return;
                                }
                            }

                            $scope.$parent.enableEvents();

                            selection.then(function(selection) {
                                console.log('selection', selection);
                                function updateCollection(_id) {
                                    sdmCollectionsInterface.updateCollection(
                                        _id,
                                        controller.collectionName,
                                        controller.collectionNotes||'',
                                        controller.addedPermissions,
                                        selection,
                                        'add'
                                    ).then(function(){
                                        sdmViewManager.refreshView('collections');
                                    });

                                }
                                if (controller.collectionID) {
                                    updateCollection(controller.collectionID);
                                } else {
                                    sdmCollectionsInterface.createCollection(
                                        controller.collectionName,
                                        controller.collectionNotes||'',
                                        controller.addedPermissions
                                    ).then(function(response){
                                        console.log('collection created', response);
                                        updateCollection(response._id);
                                    });
                                }
                            });

                            $scope.$parent._hidePopover($event, 0);
                        };

                        controller.delete = function($event) {
                            $event.stopPropagation();
                            $event.preventDefault();
                            sdmCollectionsInterface.deleteCollection(controller.collectionID).then(
                                function(){
                                    sdmViewManager.refreshView('collections');
                                });
                            $scope.$parent.enableEvents();
                            $scope.$parent._hidePopover($event, 0);
                        };

                        controller.addUser = function () {
                            if (!controller.selectedUID) {
                                return;
                            }
                            controller.addedPermissions.push({
                                _id: controller.selectedUID,
                                access: controller.selectedRole.rid
                            });
                            controller.selectedUID = '';
                        };

                        controller.removeUser = function ($index) {
                            controller.addedPermissions.splice($index, 1);
                        };

                        controller.selectCollection = function() {
                            if (controller.selectedCollection) {
                                console.log(controller.selectedCollection);
                                controller.collectionName = controller.selectedCollection.name;
                                controller.collectionID = controller.selectedCollection._id;
                                controller.collectionNotes = controller.selectedCollection.notes;
                                sdmCollectionsInterface.getCollection(controller.collectionID).then(
                                    function(collection){
                                        console.log(collection);
                                        controller.addedPermissions = collection.permissions;
                                        console.log(collection.permissions);
                                });
                                controller.defaultSelectText = '(Create New Collection)';
                            } else {
                                controller.collectionName = '';
                                controller.collectionID = null;
                                controller.collectionNotes = '';
                                controller.addedPermissions = [{'_id': controller.curator.user_uid, 'access': 'admin'}];
                                controller.defaultSelectText = '(Select Existing Collection)';
                            }
                        };

                        sdmCollectionsInterface.getCollections().then(
                            function(collections){
                                controller.existingCollections =
                                    controller.curator.root?collections:collections.filter(
                                        function(collection){
                                            var access = collection.permissions[0].access;
                                            return access === 'admin' || access === 'modify';
                                        });
                                controller.collectionsCurator = controller.existingCollections.filter(
                                    function (collection) {
                                        return collection.curator._id = controller.curator.user_uid;

                                    }
                                ).map(function(collection){return collection.name});
                            }
                        );

                    }
                }
            }]
        );
})();
