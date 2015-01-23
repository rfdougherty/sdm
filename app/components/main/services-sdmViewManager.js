'use strict';

(function(){

    var sdmViewManager = function(sdmCollectionsInterface, sdmProjectsInterface) {
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

        function refreshView(viewID) {
            var iterator;
            var tree = getData(viewID);
            if (!tree) {
                return;
            }
            if (viewID === 'collections') {
                iterator = sdmCollectionsInterface.breadthFirstRefresh(tree);
            } else if (viewID === 'projects') {
                iterator = sdmProjectsInterface.breadthFirstRefresh(tree);
            }

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
                    triggerViewChange(tree);
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

        return {
            getViewAppearance: getViewAppearance,
            updateViewAppearanceKey: updateViewAppearanceKey,
            updateViewAppearance: updateViewAppearance,
            setData: setData,
            getData: getData,
            refreshView: refreshView
        }
    }

    sdmViewManager.$inject = ['sdmCollectionsInterface', 'sdmProjectsInterface'];

    angular.module('sdm.main.services.sdmViewManager',
        ['sdm.APIServices.services.sdmCollectionsInterface',
         'sdm.APIServices.services.sdmProjectsInterface'])
        .factory('sdmViewManager', sdmViewManager);
})();
