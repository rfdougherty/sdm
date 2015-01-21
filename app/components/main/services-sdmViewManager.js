'use strict';

(function(){

    var sdmViewManager = function(sdmCollectionsInterface) {
        var viewAppearances = {
            'data-layout': 'table'
        };

        var viewData = {
            'projects': null,
            'collections': null
        };

        var viewController;

        function getViewAppearance() {
            return viewAppearances;
        };

        function updateViewAppearanceKey(key, value) {
            viewAppearances[key] = value;
        }

        function updateViewAppearance(newViewAppearances) {
            angular.extend(viewAppearances, newViewAppearances);
        }

        function setData(viewID, data, _controller) {
            viewData[viewID] = data;
            viewController = _controller;
        }

        function getData(viewID) {
            return viewData[viewID];
        }

        function triggerViewChange(node) {
            viewController.trigger = {
                node: node,
                sessionKey:  (viewController.trigger.sessionKey + 1)%10,
                all: true
            }
        }

        return {
            getViewAppearance: getViewAppearance,
            updateViewAppearanceKey: updateViewAppearanceKey,
            updateViewAppearance: updateViewAppearance,
            setData: setData,
            getData: getData,
            triggerViewChange: triggerViewChange
        }
    }

    sdmViewManager.$inject = ['sdmCollectionsInterface'];

    angular.module('sdm.main.services.sdmViewManager',['sdm.APIServices.services.sdmCollectionsInterface'])
        .factory('sdmViewManager', sdmViewManager);
})();
