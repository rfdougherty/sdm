'use strict';

angular.module('sdm.removeCollection.directives.sdmRemoveCollection', [
        'sdm.createCollection.services.sdmGetSelection',
        'sdm.APIServices.services.sdmCollectionsInterface',
        'sdm.authentication.services.sdmUserManager',
        'sdm.main.services.sdmViewManager'])
    .directive('sdmRemoveCollection', ['$q', '$rootScope', 'sdmGetSelection', 'sdmCollectionsInterface', 'sdmUserManager', 'sdmViewManager',
        function($q, $rootScope, sdmGetSelection, sdmCollectionsInterface, sdmUserManager, sdmViewManager) {
            return {
                restrict: 'E',
                scope: false,
                replace: false, // Replace with the template below
                transclude: false,// we want to insert custom content inside the directive
                controller: function(){},
                controllerAs: 'sdmRCController',
                link: function($scope, $element, $attrs, sdmRCController) {
                    $scope.$parent.disableEvents();
                    sdmRCController.loadingState = 1;
                    var selection = sdmGetSelection.getSelection();
                    var userData = sdmUserManager.getAuthData();
                    console.log(userData);
                    sdmRCController.updates = [];
                    var execUpdate = function(collection) {
                        if (collection.checked) {
                            return sdmCollectionsInterface.deleteCollection(collection.id)
                        } else {
                            return sdmCollectionsInterface.updateCollection(
                                collection.id,
                                collection.name,
                                collection.notes,
                                null,
                                collection.selection,
                                'remove'
                            )
                        }
                    }
                    selection.then(function(selection){
                        var splittedSelections = sdmCollectionsInterface.splitSelection(selection);
                        angular.forEach(splittedSelections, function(collection, collectionId) {
                            var update, isChecked;
                            collection.count = collection.selection?'':' (empty)';
                            collection.disabled = !(collection.userAccess === 'admin' || userData.root) || !collection.checked;
                            collection.checked = collection.checked && !collection.selection && !collection.disabled;
                            sdmRCController.removeEnabled = sdmRCController.removeEnabled || !collection.disabled;
                            if (collection.selection) {
                                collection.selection.checked = (collection.userAccess !== 'ro' || userData.root);
                                collection.selection.disabled = !collection.selection.checked
                                sdmRCController.removeEnabled = sdmRCController.removeEnabled || !collection.selection.disabled;
                            }
                            sdmRCController.updates.push(collection);
                        });

                        sdmRCController.remove = function($event) {
                            var promises = sdmRCController.updates.filter(function(update){
                                return update.checked || (update.selection && update.selection.checked)
                            }).map(function(update){
                                return execUpdate(update);
                            });
                            $q.all(promises).then(function(){
                                sdmViewManager.refreshView();
                                sdmRCController.completed = true;
                                $scope.$apply();
                                setTimeout(function(){
                                    $scope.$parent.enableEvents();
                                    $scope.$parent._hidePopover($event, 0);
                                }, 1000);
                            });
                        };
                        sdmRCController.loadingState--;
                    });
                    sdmRCController.close = function($event) {
                        $event.stopPropagation();
                        $event.preventDefault();
                        $scope.$parent.enableEvents();
                        $scope.$parent._hidePopover($event, 0);
                    }
                }
            }

        }]);
