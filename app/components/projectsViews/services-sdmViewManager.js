'use strict';

(function(){

    var sdmViewManager = function() {
        var viewAppearances = {
            'data-layout': 'table'
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

        return {
            getViewAppearance: getViewAppearance,
            updateViewAppearanceKey: updateViewAppearanceKey,
            updateViewAppearance: updateViewAppearance
        }
    }

    angular.module('sdm.projectsViews.services.sdmViewManager',[])
        .factory('sdmViewManager', sdmViewManager);
})();
