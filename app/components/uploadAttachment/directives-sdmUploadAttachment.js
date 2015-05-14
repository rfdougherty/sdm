'use strict';

(function() {
    angular.module('sdm.upload.directives.sdmUploadAttachment',[
            'angularFileUpload', 'ngCookies',
            'sdm.authentication.services.sdmUserManager',
            'sdm.upload.services.SdmMD5'])
        .directive('sdmUploadAttachment', ['$q', '$upload', '$cookieStore', 'sdmUserManager', 'SdmMD5',
            function ($q, $upload, $cookieStore, sdmUserManager, SdmMD5) {
                return {
                    restrict: 'E',
                    scope: false,
                    replace: false, // Replace with the template below
                    transclude: false,// we want to insert custom content inside the directive
                    controller: function(){},
                    controllerAs: 'sdmULController',
                    link: function($scope, $element, $attrs, sdmULController) {
                        console.log('upload', sdmULController);
                        console.log($scope);
                        sdmULController.files = [];

                        sdmULController.addFiles = function() {
                            sdmULController.errorMessage = null;
                            addFilesToQueue(sdmULController.newFiles)
                            processQueue(false);
                        }
                        sdmULController.uploadInProgress = false;
                        sdmULController.queueLength = 0;
                        sdmULController.processedFiles = 0;
                        var processQueue = function(isIterating) {
                            if (sdmULController.uploadInProgress && !isIterating) {
                                return;
                            }
                            sdmULController.progressPercentage = 0;
                            if (!sdmULController.files.length) {
                                sdmULController.uploadInProgress = false;
                                sdmULController.processedFiles = 0;
                                sdmULController.queueLength = 0;
                                return;
                            } else {
                                sdmULController.uploadInProgress = true;
                                var file = sdmULController.files.shift();
                                sdmULController.processingFileName = file.name;
                                uploadFile(file).then(
                                    function() {
                                        sdmULController.processedFiles++;
                                        processQueue(true);
                                    }
                                );
                            }
                        }

                        var addFilesToQueue = function(newFiles) {
                            console.log(newFiles);
                            sdmULController.queueLength += newFiles.length;
                            angular.forEach(newFiles, function(file){
                                if (file.type !== 'directory') {
                                    sdmULController.files.push(file);
                                }
                            });
                        }
                        var currentShaPromise;
                        var sdmMD5;
                        var uploadFile = function(file) {
                            var deferred = $q.defer();
                            var url = BASE_URL + [$scope.node.level.name,
                                $scope.node.id,
                                'file',
                                file.name + '?flavor=attachment'].join('/');
                            var accessData = $cookieStore.get(SDM_KEY_CACHED_ACCESS_DATA);
                            var accessToken = typeof accessData !== undefined? accessData.access_token:undefined;
                            sdmMD5 = new SdmMD5(file);
                            sdmULController.calculatingMD5 = true;
                            sdmMD5.promise.then(function(md5){
                                    console.log(md5);
                                    sdmULController.calculatingMD5 = false;
                                    sdmULController.progressPercentage = 0;
                                    sdmULController.currentFile = uploadToAPI(
                                        url,
                                        file,
                                        accessToken,
                                        md5,
                                        deferred
                                    );
                                },
                                null,
                                function(progress){
                                    sdmULController.progressPercentage = progress;
                                }
                            );
                            return deferred.promise;
                        }

                        var uploadToAPI = function(url, file, accessToken, md5, deferred, retry) {
                            return $upload.http({
                                url: url,
                                data: file,
                                headers: {
                                    'Content-Type': file.type,
                                    //'Content-Disposition': 'attachment; filename="' + file.name + '"',
                                    Authorization: accessToken,
                                    'Content-MD5': md5
                                },
                                method: 'PUT'
                            }).progress(function (evt) {
                                sdmULController.progressPercentage = parseInt(100.0 * evt.loaded / evt.total);
                            }).success(function (data, status, headers, config) {
                                console.log(data);
                                sdmULController.progressPercentage = 100;
                                $scope.sdmIMController.updateAttachmentsAndFiles();
                                deferred.resolve();
                                sdmULController.currentFile = null;
                            }).error(function(data, status, headers, config){
                                sdmULController.currentFile = null
                                console.log(data, status);
                                if (sdmULController.abortedUpload) {
                                    sdmULController.abortedUpload = false;
                                    return;
                                } else if (status === 400) {
                                    addError('Received file was corrupted. Please retry.');
                                } else if ((status === 401 || status === 0) && (!retry || retry < 3)) {
                                    sdmUserManager.refreshToken().then(
                                        function(){
                                            var accessData = $cookieStore.get(SDM_KEY_CACHED_ACCESS_DATA);
                                            var accessToken = typeof accessData !== undefined? accessData.access_token:undefined;
                                            var retry = retry?(retry + 1):1;
                                            uploadToAPI(url, file, accessToken, sha, deferred, retry);
                                        });
                                } else {
                                    addError('Error during upload. Please contact an administrator.');
                                }
                                sdmULController.uploadInProgress = false;
                                sdmULController.processedFiles = 0;
                                sdmULController.queueLength = 0;
                                sdmULController.progressPercentage = 0;
                            });
                        };

                        sdmULController.clearUploadFiles = function($event) {
                            if (sdmULController.currentFile) {
                                sdmULController.currentFile.abort();
                            } else {
                                sdmMD5.abort();
                            }
                            addError('Upload aborted.');
                            sdmULController.abortedUpload = true;
                            sdmULController.files = [];
                            sdmULController.uploadInProgress = false;
                            sdmULController.processedFiles = 0;
                            sdmULController.queueLength = 0;
                        }
                        sdmULController.skipFile = function($event) {
                            if (sdmULController.currentFile) {
                                sdmULController.currentFile.abort();
                            } else {
                                sdmMD5.abort();
                            }
                            addError('Upload skipped.');
                            sdmULController.abortedUpload = true;
                            processQueue(true);
                        }
                        var clearError;
                        var addError = function(message) {
                            if (clearError) {
                                clearTimeout(clearError);
                            }
                            sdmULController.errorMessage = message;
                            clearError = setTimeout(function(){
                                sdmULController.errorMessage = null;
                                $scope.$apply();
                            }, 5000);
                        }

                    }
                }
            }]);
})()
