'use strict';

(function() {
    var SdmTableViewData = function($scope, sdmUserManager, sdmViewManager) {
        var _this = this;
        var existingData;
        _this.trigger = {
            node: null,
            sessionKey: 1
        };

        sdmViewManager.setCurrentView();
        _this.sdmData = ( existingData = sdmViewManager.getCurrentViewData() )?{data:existingData}:{};
        _this.preferences = sdmViewManager.getViewAppearance();
        sdmViewManager.setCurrentViewData(_this.sdmData.data, _this);
        console.log('controller initialized');
    }

    SdmTableViewData.$inject = ['$scope', 'sdmUserManager', 'sdmViewManager'];

    var controller = angular.module('sdm.dataVisualizations.controllers.sdmTableViewData', [
        'sdm.main.services.sdmViewManager',
        'sdm.authentication.services.sdmUserManager'
        ])
        .controller('SdmTableViewData', SdmTableViewData);

})()
