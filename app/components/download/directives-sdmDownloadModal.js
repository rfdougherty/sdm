'use strict';

(function() {
    angular.module('sdm.download.directives.sdmDownloadModal',['sdm.download.services.sdmDownloadInterface',
        'sdm.util.services.sdmHumanReadableSize',
        'sdm.createCollection.services.sdmGetSelection'])
        .directive('sdmDownloadModal', ['sdmDownloadInterface', 'sdmGetSelection', 'sdmHumanReadableSize',
            function (sdmDownloadInterface, sdmGetSelection, sdmHumanReadableSize) {
                return {
                    restrict: 'E',
                    scope: false,
                    replace: false, // Replace with the template below
                    transclude: false,// we want to insert custom content inside the directive
                    controller: function(){},
                    controllerAs: 'sdmDLController',
                    link: function($scope, $element, $attrs, sdmDLController){
                        sdmDLController.loadingState = -1;
                        var selectionPromise = sdmGetSelection.getSelection();
                        $scope.$parent.disableEvents();
                        sdmDLController.filter = {
                            attachments: false,
                            dicom: true,
                            nifti: true,
                            montage: true,
                            other: true
                        };
                        sdmDLController.cancel = function ($event) {
                            $event.stopPropagation();
                            $event.preventDefault();
                            $scope.$parent.enableEvents();
                            $scope.$parent._hidePopover($event, 0);
                        };
                        sdmDLController.updateLink = function() {
                            sdmDLController.loadingState = 1;
                            selectionPromise.then(function (selection) {
                                console.log('selection', selection);
                                if (selection.length){
                                    sdmDownloadInterface.getDownloadURL(selection, false, sdmDLController.filter).then(function(responses){
                                        sdmDLController.responses = responses;
                                        sdmDLController.fileCount = 0;
                                        sdmDLController.size_raw = 0;
                                        sdmDLController.size = 0;
                                        sdmDLController.responses.forEach(function(r){
                                            sdmDLController.fileCount += r.file_cnt;
                                            sdmDLController.size_raw += r.size;
                                            sdmDLController.size = sdmHumanReadableSize(sdmDLController.size_raw);
                                        });
                                        sdmDLController.loadingState--;
                                        sdmDLController.loadedOnce = true;
                                    }).catch(function(error){
                                        sdmDLController.error = "error while retrieving data";
                                        sdmDLController.loadingState--;
                                    });
                                } else {
                                    sdmDLController.loadedOnce = true;
                                    sdmDLController.fileCount = 0;
                                    sdmDLController.size = '0 Bytes';
                                    sdmDLController.loadingState--;
                                }
                            });
                        }
                        sdmDLController.updateLink();
                        sdmDLController.download = function($event) {
                            $event.stopPropagation();
                            $event.preventDefault();
                            sdmDLController.responses.forEach(function(r, i){
                                var iframe = document.getElementById('DownloadIframe' + i);
                                if (iframe) {
                                    iframe.parentElement.removeChild(iframe);
                                }
                                angular.element('<iframe>', {
                                    id: 'DownloadIframe' + i,
                                    style: 'display:none;'})
                                    .appendTo('body');
                                var iframe = document.getElementById('DownloadIframe' + i);
                                var content = iframe.contentDocument;
                                r.attachments = true;
                                var form = '<form action="' + r.url +
                                    '" method="GET"><input name="ticket" value="' + r.ticket +
                                    '"><input name="site" value="' + r.site +
                                    '"><input name="attachments" value="' + r.attachments +
                                    '"></form>';
                                content.write(form);
                                $('form', content).submit();
                            });
                            $scope.$parent.enableEvents();
                            $scope.$parent._hidePopover($event, 0);
                        }
                    }
                }
            }]);
})()
