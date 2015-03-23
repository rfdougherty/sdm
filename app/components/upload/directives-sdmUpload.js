'use strict';

(function() {
    angular.module('sdm.upload.directives.sdmUpload',[
            'angularFileUpload', 'ngCookies',
            'sdm.authentication.services.sdmUserManager'])
        .directive('sdmUpload', ['$q', '$upload', '$cookieStore', 'sdmUserManager',
            function ($q, $upload, $cookieStore, sdmUserManager) {
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
                        var shaWorker, jobid, deferreds;
                        var initializeShaWorker = function(){
                            shaWorker = new Worker('utils/rusha.js');
                            jobid = 0;
                            deferreds = {};

                            shaWorker.onmessage = function(e) {
                                console.log(e);
                                if (typeof e.data.progress !== 'undefined') {
                                    sdmULController.progressPercentage = e.data.progress;
                                    $scope.$apply();
                                    return;
                                }
                                var deferred = deferreds[e.data.id];
                                if (deferred) {
                                    deferreds[e.data.id] = null;
                                    deferred.resolve(e.data.hash);
                                } else {
                                    console.warn('this message has already been resolved: ', e);
                                }
                            };
                            shaWorker.onerror = function(e, filename, lineno) {
                                console.log(e);
                            };
                        }
                        initializeShaWorker();
                        var calculateSHA1 = function(file, deferred) {
                            deferred = deferred || $q.defer();
                            var _jobid = jobid++;
                            deferreds[_jobid] = deferred;
                            shaWorker.postMessage({
                                id: _jobid,
                                data: file
                            });
                            return deferred.promise;
                        }
                        var calculateMetadata = function(files) {
                            var metadata = [];
                            var m;
                            for (var i = 0; i < files.length; i++) {
                                m = {
                                    name: files[i].name,
                                    size: files[i].size,
                                    ext: '',
                                    kinds: ['other']
                                };
                                metadata.push(m);
                            }
                            return metadata;
                        }
                        var createFile = function(json) {
                            var s = JSON.stringify(json);
                            var b = new Blob([s], {type: 'plain/text'});
                            return b;
                        }

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
                                sdmULController.files.push(file);
                            });
                        }
                        var currentShaPromise;
                        var uploadFile = function(file) {
                            var deferred = $q.defer();
                            var url = BASE_URL + [$scope.node.level.name, $scope.node.id, 'attachment'].join('/');
                            var accessData = $cookieStore.get(SDM_KEY_CACHED_ACCESS_DATA);
                            var accessToken = typeof accessData !== undefined? accessData.access_token:undefined;
                            var metadataFile = createFile(calculateMetadata([file]));
                            var fileFormDataName = ['metadata'];
                            var shaPromises = [];
                            shaPromises.push(calculateSHA1(metadataFile));
                            shaPromises.push(calculateSHA1(file));
                            sdmULController.calculatingSHA1 = true;
                            fileFormDataName.push(file.name);

                            fileFormDataName.push('sha');
                            $q.all(shaPromises).then(function(results) {
                                sdmULController.calculatingSHA1 = false;
                                var shaList = results.map(function(sha, i){
                                    if (i === 0) {
                                        return {
                                            name: metadataFile.name = 'metadata',
                                            sha1: sha
                                        }
                                    }
                                    return {
                                        name: file.name,
                                        sha1: sha
                                    }
                                })
                                sdmULController.progressPercentage = 0;
                                console.log(shaList);
                                var shaFile = createFile(shaList);
                                shaFile.name = 'sha';
                                sdmULController.currentFile = uploadToAPI(
                                    url,
                                    [metadataFile, file, shaFile],
                                    accessToken,
                                    fileFormDataName,
                                    deferred
                                );
                            });
                            return deferred.promise;
                        }

                        var uploadToAPI = function(url, files, accessToken, fileFormDataName, deferred, retry) {
                            $upload.upload({
                                url: url,
                                file: files,
                                headers: {
                                    Authorization: accessToken
                                },
                                method: 'PUT',
                                fileFormDataName: fileFormDataName
                            }).progress(function (evt) {
                                sdmULController.progressPercentage = parseInt(95.0 * evt.loaded / evt.total);
                            }).success(function (data, status, headers, config) {
                                console.log(data);
                                sdmULController.progressPercentage = 100;
                                $scope.sdmIMController.updateAttachments();
                                deferred.resolve();
                                console.log('file ' + config.file[1].name + 'uploaded. Response: ' + data);
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
                                            uploadToAPI(url, files, accessToken, fileFormDataName, deferred, retry);
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
                                shaWorker.terminate();
                                shaWorker = undefined;
                                initializeShaWorker();
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
                                console.log(sdmULController.currentFile);
                                sdmULController.currentFile.abort();
                            } else {
                                shaWorker.terminate();
                                shaWorker = undefined;
                                initializeShaWorker();
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
