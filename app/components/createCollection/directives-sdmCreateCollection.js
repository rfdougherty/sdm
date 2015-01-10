'use strict';

(function() {
    angular.module('sdm.createCollection.directives.sdmCreateCollection',
        ['sdm.dataFiltering.services.sdmFilterTree', 'sdm.services', 'sdm.authentication.services.sdmUserManager'])
        .directive('sdmCreateCollection', ['$q', 'sdmFilterTree', 'sdmUserManager', 'callAPI',
            function($q, sdmFilterTree, sdmUserManager, callAPI) {
                return {
                    restrict: 'E',
                    scope: false,
                    replace: false, // Replace with the template below
                    transclude: false,// we want to insert custom content inside the directive
                    controller: function(){},
                    controllerAs: 'sdmCCController',
                    link: function($scope, $element, $attrs, controller) {
                        console.log(sdmFilterTree.sdmData.data);
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

                        controller.save = function ($event) {
                            $event.stopPropagation();
                            $event.preventDefault();
                            $scope.$parent.enableEvents();
                            selection.promise.then(function(selection) {
                                console.log(selection);
                            });
                            $scope.$parent._hidePopover($event, 0);
                        };
                        controller.curator = sdmUserManager.getAuthData().user_uid;
                    }
                }
            }]
        );
})();
