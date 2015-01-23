'use strict';

(function() {
    var SdmProjectsViewData = function($scope, sdmProjectsInterface, sdmUserManager, sdmViewManager) {
        var _this = this;
        var existingData;
        _this.trigger = {
            node: null,
            sessionKey: 1
        };

        _this.sdmData = (existingData = sdmViewManager.getData('projects'))?{data:existingData}:{};
        sdmViewManager.setData('projects', _this.sdmData.data, _this);
        console.log('controller initialized');

        $scope.$watch(function(){
            var userData = sdmUserManager.getAuthData();
            if (typeof userData === 'undefined') {
                return {};
            }
            return {
                logged_in: userData.logged_in,
                root: userData.root,
                preferences: userData.preferences,
                wheel: userData.wheel
            }
        }, function(newValue, oldValue){
            console.log('new', newValue);
            console.log('old', oldValue);
            var existingData;
            if (newValue === oldValue && (existingData = sdmViewManager.getData('projects'))) {
                _this.sdmData.data = existingData;
                _this.trigger = {
                    node: existingData,
                    sessionKey:  (_this.trigger.sessionKey + 1)%10
                };

            } else if (newValue.logged_in !== oldValue.logged_in || newValue.root !== oldValue.root || newValue === oldValue) {
                sdmProjectsInterface.treeInit().then(function(result){
                    _this.sdmData.data = result;
                    _this.trigger = {
                        node: result,
                        sessionKey:  (_this.trigger.sessionKey + 1)%10
                    };
                    sdmViewManager.setData('projects', result, _this);
                    console.log('tree data initialized');
                });
            };

            var isReload = newValue === oldValue;
            var isPreferencesChanged = (
                !angular.equals(newValue.preferences, oldValue.preferences) &&
                !(newValue.logged_in !== oldValue.logged_in && !newValue.logged_in)
            );

            if (isReload || isPreferencesChanged) {
                if (newValue.preferences) {
                    sdmViewManager.updateViewAppearance(newValue.preferences);
                }
                _this.preferences = sdmViewManager.getViewAppearance();
            };
        }, true);

        _this.actions = function(){
            return {
                expandNode: function(node) {
                    console.log('node expanded', node);
                    sdmProjectsInterface.expandNode(node).then(
                        function() {
                            _this.trigger = {
                                node: node,
                                sessionKey: (_this.trigger.sessionKey + 1)%10
                            };
                        }
                    );
                },
                checkNode: function(node) {
                    console.log('selected', node);
                    sdmProjectsInterface.checkNode(node, true);
                    $scope.$apply(function(){
                        _this.trigger = {
                            node: node,
                            sessionKey: (_this.trigger.sessionKey + 1)%10,
                            all: true
                        };
                    });
                }
            }
        };

        _this.headers = sdmProjectsInterface.headers();
    }

    SdmProjectsViewData.$inject = ['$scope', 'sdmProjectsInterface', 'sdmUserManager', 'sdmViewManager'];

    var controller = angular.module('sdm.projectsViews.controllers.sdmProjectsViewData', [
        'sdm.APIServices.services.sdmProjectsInterface',
        'sdm.main.services.sdmViewManager',
        'sdm.authentication.services.sdmUserManager'
        ])
        .controller('SdmProjectsViewData', SdmProjectsViewData);

})()
