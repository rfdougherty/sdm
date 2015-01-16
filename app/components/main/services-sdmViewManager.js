'use strict';

(function(){

    var sdmViewManager = function() {
        var viewAppearances = {
            'data-layout': 'table'
        };

        var viewData = {
            'projects': null,
            'collections': null
        };

        function getViewAppearance() {
            return viewAppearances;
        };

        function updateViewAppearanceKey(key, value) {
            viewAppearances[key] = value;
        }

        function updateViewAppearance(newViewAppearances) {
            angular.extend(viewAppearances, newViewAppearances);
        }

        function setData(viewID, data) {
            viewData[viewID] = data;
        }

        function getData(viewID) {
            return viewData[viewID];
        }

        return {
            getViewAppearance: getViewAppearance,
            updateViewAppearanceKey: updateViewAppearanceKey,
            updateViewAppearance: updateViewAppearance,
            setData: setData,
            getData: getData
        }
    }

    angular.module('sdm.main.services.sdmViewManager',[])
        .factory('sdmViewManager', sdmViewManager);
})();
