'use strict';

var _sdmCCController;
(function() {
    angular.module('sdm.createCollection.directives.sdmCreateCollection',
        [
            'sdm.dataFiltering.services.sdmFilterTree', 'sdm.authentication.services.sdmUserManager',
            'sdm.APIServices.services.sdmRoles', 'sdm.APIServices.services.sdmUsers',
            'sdm.APIServices.services.sdmCollectionInterface'])
        .directive('sdmCreateCollection', [
            '$q', 'sdmFilterTree', 'sdmUserManager', 'sdmRoles', 'sdmUsers', 'sdmCollectionInterface',
            function($q, sdmFilterTree, sdmUserManager, sdmRoles, sdmUsers, sdmCollectionInterface) {


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
                        _sdmCCController = controller;
                        controller.curator = sdmUserManager.getAuthData();
                        console.log('curator', controller.curator);
                        controller.addedPermissions = [{'uid': controller.curator._id, 'access': 'admin'}];
                        controller.users = [];

                        function initialize() {
                            $scope.$parent.dialogStyle.height = '500px';//100px';
                            $scope.$parent.dialogStyle.width = '600px';//280px';
                            controller.defaultSelectText = '(Select Existing Collection)';
                            sdmUsers().then(function(data){
                                console.log(data);
                                controller.users = data;

                                $element.find('#share .typeahead').typeahead({
                                        hint: true,
                                        highlight: true,
                                        minLength: 1
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
                        console.log(sdmFilterTree.sdmData.data);
                        sdmRoles().then(function(data){
                            controller.roles = data;
                            controller.selectedRole = controller.roles[0];
                        });

                        $scope.$parent.disableEvents();
                        var selection = $q.defer();
                        setTimeout(function () {
                            selection.resolve(sdmFilterTree.getSelected(sdmFilterTree.sdmData.data));
                        }, 0);
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
                            $scope.$parent.enableEvents();

                            selection.promise.then(function(selection) {

                                function updateCollection(_id) {
                                    sdmCollectionInterface.updateCollection(
                                        _id,
                                        controller.collectionName,
                                        controller.collectionNotes||'',
                                        controller.addedPermissions,
                                        selection,
                                        'add'
                                    );

                                }
                                if (controller.collectionID) {
                                    updateCollection(controller.collectionID);
                                } else {
                                    sdmCollectionInterface.createCollection(
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
                            sdmCollectionInterface.deleteCollection(controller.collectionID);
                            $scope.$parent.enableEvents();
                            $scope.$parent._hidePopover($event, 0);
                        };

                        controller.addUser = function () {
                            if (!controller.selectedUID) {
                                return;
                            }
                            controller.addedPermissions.push({
                                uid: controller.selectedUID,
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
                                sdmCollectionInterface.getCollection(controller.collectionID).then(
                                    function(collection){
                                        controller.addedPermissions = collection.permissions;
                                });
                                controller.defaultSelectText = '(Create New Collection)';
                            } else {
                                controller.collectionName = '';
                                controller.collectionID = null;
                                controller.collectionNotes = '';
                                controller.addedPermissions = [{'uid': controller.curator._id, 'access': 'admin'}];
                                controller.defaultSelectText = '(Select Existing Collection)';
                            }
                        };

                        sdmCollectionInterface.getCollections().then(
                            function(collections){
                                controller.existingCollections = collections;
                            }
                        );

                    }
                }
            }]
        );
})();
