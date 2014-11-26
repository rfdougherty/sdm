'use strict';

(function(){
    var SdmButtonsController = function(sdmViewManager, sdmUserManager) {
        this.layout = function(value) {
            sdmViewManager.updateViewAppearanceKey('data-layout', value);
            sdmUserManager.changeViewPreference(value);
        };

        this.isActiveButton = function(value) {
            return sdmViewManager.getViewAppearance()['data-layout'] === value;
        };
    }

    SdmButtonsController.$inject = ['sdmViewManager', 'sdmUserManager'];

    angular.module('sdm.buttons.controllers.sdmButtons',
        ['sdm.treeViews.services.sdmViewManager',
        'sdm.authentication.services.sdmUserManager'])
        .controller('SdmButtonsController', SdmButtonsController);

})();
