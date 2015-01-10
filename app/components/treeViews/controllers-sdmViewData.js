'use strict';

(function() {
    var SdmViewData = function($scope, sdmAPIAdapter, sdmUserManager, sdmViewManager) {
        var _this = this;
        _this.trigger = {
            node: null,
            sessionKey: 1
        };
        _this.sdmData = {};

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
            if (newValue.logged_in !== oldValue.logged_in || newValue.root !== oldValue.root || newValue === oldValue) {
                sdmAPIAdapter.treeInit().then(function(result){
                    _this.sdmData.data = result;
                    _this.trigger = {
                        node: result,
                        sessionKey:  (_this.trigger.sessionKey + 1)%10
                    };
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
                    sdmAPIAdapter.expandNode(node).then(
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
                    sdmAPIAdapter.checkNode(node, true);
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

        _this.headers = sdmAPIAdapter.headers();
    }

    SdmViewData.$inject = ['$scope', 'sdmAPIAdapter', 'sdmUserManager', 'sdmViewManager'];

    var controller = angular.module('sdm.treeViews.controllers.sdmViewData', [
        'sdm.treeViews.services.sdmAPIAdapter',
        'sdm.treeViews.services.sdmViewManager',
        'sdm.authentication.services.sdmUserManager'
        ])
        .controller('SdmViewData', SdmViewData);

})()
