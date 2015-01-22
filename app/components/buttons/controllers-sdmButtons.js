'use strict';

(function(){
    var SdmButtonsController = function($location, sdmViewManager, sdmUserManager) {
        this.layout = function(value) {
            sdmViewManager.updateViewAppearanceKey('data-layout', value);
            sdmUserManager.changeViewPreference(value);
        };

        this.isActiveButton = function(value) {
            return sdmViewManager.getViewAppearance()['data-layout'] === value;
        };

        this.refreshView = function() {
            var currentPath = $location.path();
            var viewID = currentPath.substring(1, currentPath.length);
            sdmViewManager.refreshView(viewID);
        };
    }

    SdmButtonsController.$inject = ['$location', 'sdmViewManager', 'sdmUserManager'];

    angular.module('sdm.buttons.controllers.sdmButtons',
        ['sdm.main.services.sdmViewManager',
        'sdm.authentication.services.sdmUserManager'])
        .controller('SdmButtonsController', SdmButtonsController);

})();
