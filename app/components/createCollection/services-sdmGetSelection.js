'use strict';

angular.module('sdm.createCollection.services.sdmGetSelection', [
    'sdm.dataFiltering.services.sdmFilterTree',
    'sdm.APIServices.services.sdmCollectionsInterface'])
    .factory('sdmGetSelection', ['$q', 'sdmCollectionsInterface', 'sdmFilterTree',
        function($q, sdmCollectionsInterface, sdmFilterTree) {

            var getSelection = function () {
                console.log('getSelection called. viewID:', sdmFilterTree.viewID);
                var deferred = $q.defer();
                var iterator, element, selection;
                if (sdmFilterTree.viewID === 'collections') {
                    iterator = sdmCollectionsInterface.breadthFirstFull(sdmFilterTree.sdmData.data);
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
                    selection = sdmFilterTree.getSelected(sdmFilterTree.sdmData.data);
                    deferred.resolve(selection);
                }
                return deferred.promise;
            };

            return {
                getSelection: getSelection
            }
        }
    ]);
