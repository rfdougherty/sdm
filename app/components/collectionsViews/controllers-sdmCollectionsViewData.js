'use strict';

(function() {
    var SdmCollectionsViewData = function($scope, sdmCollectionsInterface, sdmUserManager, sdmViewManager) {
        var _this = this;
        var existingData;
        _this.trigger = {
            node: null,
            sessionKey: 1
        };

        _this.sdmData = (existingData = sdmViewManager.getData('collections'))?{data:existingData}:{};
        sdmViewManager.setData('collections', _this.sdmData.data, _this);
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
            if (newValue === oldValue && (existingData = sdmViewManager.getData('collections'))) {
                _this.sdmData.data = existingData;
                _this.trigger = {
                    node: existingData,
                    sessionKey:  (_this.trigger.sessionKey + 1)%10
                };

            } else if (newValue.logged_in !== oldValue.logged_in || newValue.root !== oldValue.root || newValue === oldValue) {

                sdmCollectionsInterface.treeInit().then(function(result){
                    _this.sdmData.data = result;
                    _this.trigger = {
                        node: result,
                        sessionKey:  (_this.trigger.sessionKey + 1)%10
                    };
                    sdmViewManager.setData('collections', result, _this);
                    console.log('tree data initialized');
                });
            }

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
                    sdmCollectionsInterface.expandNode(node).then(
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
                    sdmCollectionsInterface.checkNode(node, true);
                    $scope.$apply(function(){
                        _this.trigger = {
                            node: node,
                            sessionKey: (_this.trigger.sessionKey + 1)%10,
                            all: true
                        };
                    });
                },
                deleteCollection: function(collection) {
                    sdmCollectionsInterface.delete(collection);
                }
            }
        };

        _this.headers = sdmCollectionsInterface.headers();
    }

    SdmCollectionsViewData.$inject = ['$scope', 'sdmCollectionsInterface', 'sdmUserManager', 'sdmViewManager'];

    var controller = angular.module('sdm.collectionsViews.controllers.sdmCollectionsViewData', [
        'sdm.APIServices.services.sdmCollectionsInterface',
        'sdm.main.services.sdmViewManager',
        'sdm.authentication.services.sdmUserManager'
        ])
        .controller('SdmCollectionsViewData', SdmCollectionsViewData);

})()
