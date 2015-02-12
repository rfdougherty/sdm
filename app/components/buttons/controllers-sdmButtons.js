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

        this.refreshView = function($event) {
            var element = angular.element($event.currentTarget);
            element.addClass('loading');
            sdmViewManager.refreshView().then(function(){
                element.removeClass('loading');
            });
        };

        this.location = function () {
            return $location.path();
        };
    }

    SdmButtonsController.$inject = ['$location', 'sdmViewManager', 'sdmUserManager'];

    angular.module('sdm.buttons.controllers.sdmButtons',
        ['sdm.main.services.sdmViewManager',
        'sdm.authentication.services.sdmUserManager'])
        .controller('SdmButtonsController', SdmButtonsController);

})();
