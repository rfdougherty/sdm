'use strict';

(function() {
    var SdmTableViewData = function($location, sdmViewManager) {
        var _this = this;
        var existingData;
        var path = $location.path();
        _this.viewID = path.substring(1, path.length);
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

    SdmTableViewData.$inject = ['$location', 'sdmViewManager'];

    var controller = angular.module('sdm.dataVisualizations.controllers.sdmTableViewData', [
        'sdm.main.services.sdmViewManager'
    ]).controller('SdmTableViewData', SdmTableViewData);

})()
