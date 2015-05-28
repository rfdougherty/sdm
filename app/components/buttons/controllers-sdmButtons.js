'use strict';

(function(){
    var SdmButtonsController = function($scope, $location, sdmViewManager, sdmUserManager, sdmFilterTree) {
        this.status = {
          isopen: false
        };
        this.userData = sdmUserManager.getAuthData();
        console.log(this.userData)

        this.layout = function(value) {
            sdmViewManager.updateViewAppearanceKey('data-layout', value);
            sdmUserManager.changeViewPreference(value);
        };

        this.isActiveButton = function(value) {
            return sdmViewManager.getViewAppearance()['data-layout'] === value;
        };

        this.location = function () {
            return $location.path();
        };

        this.selectionButtonsEnabled = function () {
            var root = sdmViewManager.getCurrentViewData()||{};
            if (!sdmUserManager.getAuthData().access_token) return false;
            return (root.indeterminate || root.checked) && sdmViewManager.getViewAppearance()['data-layout'] === 'table';
        };
        this.toggleSuperUser = function(){
            sdmUserManager.toggleSuperUser().then(function(){
                sdmViewManager.initialize();
            });
        }
    }

    SdmButtonsController.$inject = ['$scope', '$location', 'sdmViewManager', 'sdmUserManager', 'sdmFilterTree'];

    angular.module('sdm.buttons.controllers.sdmButtons',
        ['sdm.main.services.sdmViewManager',
        'sdm.authentication.services.sdmUserManager',
        'sdm.dataFiltering.services.sdmFilterTree'])
        .controller('SdmButtonsController', SdmButtonsController);

})();
