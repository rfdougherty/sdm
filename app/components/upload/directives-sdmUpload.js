'use strict';

(function() {
    angular.module('sdm.upload.directives.sdmUpload',['angularFileUpload', 'ngCookies'])
        .directive('sdmUpload', ['$q', '$upload', '$cookieStore',
            function ($q, $upload, $cookieStore) {
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
                        var shaWorker = new Worker('utils/rusha.js');
                        var jobid = 0;
                        var deferreds = {};
                        shaWorker.onmessage = function(e) {
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
                                    kind: 'other'
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
                            var filesTooLong = sdmULController.newFiles.filter(function(file){
                                console.log(file);
                                return file.size > Math.pow(2, 28) - 200;
                            });
                            console.log(filesTooLong);
                            if (filesTooLong.length) {
                                console.error('These files are bigger than 255 MB: ', filesTooLong);
                                addError('It is possible to upload only files smaller than 255MB');
                            } else {
                                addFilesToQueue(sdmULController.newFiles)
                                processQueue(false);
                            }
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
                            sdmULController.queueLength += newFiles.length;
                            newFiles.forEach(function(file){
                                sdmULController.files.push(file);
                            });
                        }
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
                            fileFormDataName.push(file.name);

                            fileFormDataName.push('sha');
                            $q.all(shaPromises).then(function(results) {
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

                                console.log(shaList);
                                var shaFile = createFile(shaList);
                                shaFile.name = 'sha';
                                sdmULController.currentFile = $upload.upload({
                                    url: url,
                                    file: [metadataFile, file, shaFile],
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
                                    } else {
                                        addError('Error during upload. Please contact an administrator.');
                                    }
                                    sdmULController.uploadInProgress = false;
                                    sdmULController.processedFiles = 0;
                                    sdmULController.queueLength = 0;
                                    sdmULController.progressPercentage = 0;
                                });
                            });
                            return deferred.promise;
                        }
                        sdmULController.clearUploadFiles = function($event) {
                            if (sdmULController.currentFile) {
                                sdmULController.currentFile.abort();
                                addError('Upload aborted.');
                                sdmULController.abortedUpload = true;
                                sdmULController.files = [];
                                sdmULController.uploadInProgress = false;
                                sdmULController.processedFiles = 0;
                                sdmULController.queueLength = 0;
                            }
                        }
                        sdmULController.skipFile = function($event) {
                            if (sdmULController.currentFile) {
                                console.log(sdmULController.currentFile);
                                sdmULController.currentFile.abort();
                                addError('Upload skipped.');
                                sdmULController.abortedUpload = true;
                                processQueue(true);
                            }
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
