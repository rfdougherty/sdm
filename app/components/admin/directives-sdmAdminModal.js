'use strict';

(function(){
    angular.module('sdm.admin.directives.sdmAdminModal', [
        'sdm.admin.services.sdmAdminInterface', 'sdm.main.services.sdmViewManager',
        'sdm.dataFiltering.services.sdmFilterTree'
    ]).directive('sdmAdminModal', ['sdmAdminInterface', 'sdmViewManager', 'sdmFilterTree',
            function(sdmAdminInterface, sdmViewManager, sdmFilterTree) {
                return {
                    restrict: 'E',
                    scope: false,
                    replace: false, // Replace with the template below
                    transclude: false,// we want to insert custom content inside the directive
                    controller: function(){},
                    controllerAs: 'sdmAMController',
                    link: function($scope, $element, $attrs, sdmAMController) {
                        sdmAMController.trigger = {
                            node: null,
                            sessionKey: 1
                        };
                        $scope.$parent.disableEvents();
                        sdmAMController.viewID = 'admin';
                        sdmAMController.currentView = sdmViewManager.getCurrentView();
                        sdmViewManager.setCurrentView('admin');
                        sdmFilterTree.setView('admin');
                        sdmAMController.sdmData = {};
                        sdmAdminInterface.loadGroupsAndUsers().then(
                            function(tree){
                                console.log(tree);
                                sdmAMController.sdmData.data = tree;
                                sdmViewManager.setCurrentViewData(
                                    sdmAMController.sdmData.data,
                                    sdmAMController
                                );
                                sdmViewManager.triggerViewChange(tree);
                            });

                        sdmAMController.close = function($event) {
                            sdmViewManager.setCurrentView(sdmAMController.currentView);
                            sdmFilterTree.setView(sdmAMController.currentView);
                            $scope.$parent.enableEvents();
                            $scope.$parent._hidePopover($event, 0);
                        }
                    }
                }
            }
        ]);
})();
