'use strict';

(function(){
    var SdmButtonsController = function($location, sdmViewManager, sdmUserManager, sdmFilterTree) {
        this.layout = function(value) {
            sdmViewManager.updateViewAppearanceKey('data-layout', value);
            sdmUserManager.changeViewPreference(value);
        };

        this.isActiveButton = function(value) {
            if (value === 'pencil') {
                return sdmViewManager.getViewAppearance()['editable'];
            }
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

        var switchToNormalView = function () {
            sdmFilterTree.removeGlobalFilter(onlyModifiableItems);
            sdmViewManager.updateViewAppearanceKey('editable', false);
            sdmViewManager.refreshView();
        };


        this.selectionButtonsEnabled = function () {
            var root = sdmViewManager.getCurrentViewData()||{};
            if (!sdmUserManager.getAuthData().access_token) return false;
            //if ($location.path() === '/search') return false;
            return (root.indeterminate || root.checked) && sdmViewManager.getViewAppearance()['data-layout'] === 'table';
        };

    }

    SdmButtonsController.$inject = ['$location', 'sdmViewManager', 'sdmUserManager', 'sdmFilterTree'];

    angular.module('sdm.buttons.controllers.sdmButtons',
        ['sdm.main.services.sdmViewManager',
        'sdm.authentication.services.sdmUserManager',
        'sdm.dataFiltering.services.sdmFilterTree'])
        .controller('SdmButtonsController', SdmButtonsController);

})();
