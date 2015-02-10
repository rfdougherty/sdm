'use strict';

angular.module('sdm.createCollection.services.sdmGetSelection', [
    'sdm.dataFiltering.services.sdmFilterTree',
    'sdm.main.services.sdmViewManager'])
    .factory('sdmGetSelection', ['$q', 'sdmViewManager', 'sdmFilterTree',
        function($q, sdmViewManager, sdmFilterTree) {

            var getSelection = function () {
                console.log('getSelection called. viewID:', sdmFilterTree.viewID);
                var deferred = $q.defer();
                var iterator, element, selection;
                var data = sdmViewManager.getCurrentViewData();
                console.log('getSelected', data);
                if (sdmFilterTree.viewID === 'collections') {
                    iterator = sdmViewManager.breadthFirstFull(data);
                    selection = [];
                    var iterate = function () {
                        var element = iterator.next();
                        if (element) {
                            element.then(function(element){
                                if (element && element.checked && element.level.name === 'acquisitions') {
                                    selection.push(element);
                                }
                                iterate();
                            });
                        } else {
                            console.log('selection', selection);
                            deferred.resolve(selection);
                        }
                    };
                    iterate();
                } else {
                    selection = sdmFilterTree.getSelected(data);
                    deferred.resolve(selection);
                }
                return deferred.promise;
            };

            return {
                getSelection: getSelection
            }
        }
    ]);
