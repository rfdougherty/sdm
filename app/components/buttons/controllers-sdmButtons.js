'use strict';

(function(){
    var SdmButtonsController = function($location, sdmViewManager, sdmUserManager, sdmCollectionsInterface) {
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
            var tree = sdmViewManager.getData(viewID);
            var iterator = sdmCollectionsInterface.breadthFirstRefresh(tree);
            var iterate = function() {
                var element = iterator.next();
                if (element) {
                    element.then(function(element){
                        if (element && element.checked) {
                            _updateCountersParent(element);
                        }
                        iterate();
                    });
                } else {
                    sdmViewManager.triggerViewChange(tree);
                }
            };
            iterate();
        };

        var _updateCountersParent = function(node) {
            var checked = true;
            while (node.parent) {
                if (node.parent.checked) {
                    return;
                } else if (checked) {
                    node.parent.childrenChecked += 1;
                    checked = false;
                } else {
                    node.parent.childrenIndeterminate += 1;
                }
                // if we have already updated the upper level return
                if (node.parent.childrenChecked + node.parent.childrenIndeterminate > 1) {
                    return;
                }
                node = node.parent;
            }
        }
    }

    SdmButtonsController.$inject = ['$location', 'sdmViewManager', 'sdmUserManager', 'sdmCollectionsInterface'];

    angular.module('sdm.buttons.controllers.sdmButtons',
        ['sdm.main.services.sdmViewManager',
        'sdm.authentication.services.sdmUserManager',
        'sdm.APIServices.services.sdmCollectionsInterface'])
        .controller('SdmButtonsController', SdmButtonsController);

})();
