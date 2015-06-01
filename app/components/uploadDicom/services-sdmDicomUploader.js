'use strict';


angular.module('sdm.uploadDicom.services.sdmDicomUploader',
    ['sdm.services', 'sdm.util.services.sdmFileUtilities'])
    .factory('sdmDicomUploader', ['$q', 'makeAPICall', 'sdmFileUtilities', function($q, makeAPICall, sdmFileUtilities) {
        var uploadURL = BASE_URL + 'upload';
        var buildHeader = function(overwrite) {
            var header = {
                filetype: 'dicom',
                overwrite: overwrite
            };
            console.log(header);
            var headerData = sdmFileUtilities.createFile(JSON.stringify(header));
            return headerData;
        }
        var _counter = 0;
        var sendFile = function(data, filename, _id) {
            var URL = uploadURL + '?filename=' + filename;
            if (_id) {
                URL += '&ticket=' + _id;
            }
            var deferred = $q.defer();
            sdmFileUtilities.calculateMD5(data).then(function(md5){
                makeAPICall.async(
                    URL,
                    null,
                    'POST',
                    data,
                    {'Content-MD5': md5},
                    null,
                    null,
                    true
                ).then(function(response) {
                    deferred.resolve(response)
                },
                function() {
                    deferred.reject();
                });
            },
            function() {
                deferred.reject();
            });
            return deferred.promise
        }

        var sendComplete = function(_id) {
            return makeAPICall.async(uploadURL + '?complete=true&ticket=' + _id, null, 'POST');
        }

        var uploadDicom = function(dicom, name, _id, anonymize) {
            var deferred = $q.defer();
            var processDicom = anonymize?sdmFileUtilities.anonymizeDicom:sdmFileUtilities.readFile;
            processDicom(dicom, true).then(
                function (dicomData) {
                    return sendFile(dicomData, name, _id).then(
                        function(){
                            console.log(name, 'uploaded');
                            deferred.resolve();
                        },
                        function() {
                            console.log(name, 'rejected');
                            deferred.reject();
                        });
                }
            );

            return deferred.promise
        }

        var uploadSeries = function(series, seriesUID, overwrite, anonymize) {
            series.uploading = true;
            var seriesD = $q.defer();
            if (series.removed) {
                seriesD.resolve();
                return seriesD.promise;
            }
            series.progress = 0;

            var headerData = buildHeader(overwrite);

            sendFile(headerData, 'METADATA.json').then(function(response){
                var _id = response.ticket;
                var i = 0;
                var numQueues = 12;
                var queues = [];
                var queueCompleteDeferreds = [];
                for (var i = 0;i < numQueues;i++) {
                    queues.push([])
                    queueCompleteDeferreds.push($q.defer());
                }
                var queueIndex = 0;
                series.completedFiles = 0;
                angular.forEach(series.files, function(dicom, name){
                    var uploadWrap = function(){
                        return uploadDicom(dicom, name, _id, anonymize).then(
                            function() {
                                var increment = 100*dicom.size/series.size;
                                series.progress += increment;
                                series.completedFiles++;
                            }
                        );
                    }
                    queueIndex = (queueIndex + 1) % numQueues;
                    var queue = queues[queueIndex];
                    var promise;
                    if (queue.length > 0) {
                        promise = queue[queue.length - 1].then(uploadWrap);
                    } else {
                        promise = uploadWrap();
                    }
                    queue.push(promise);
                });
                var queueCompletePromises = []
                angular.forEach(queueCompleteDeferreds, function(deferred, i){
                    queueCompletePromises.push(deferred.promise);
                    var queue = queues[i];
                    if (queue.length > 0) {
                        queue[queue.length - 1].then(function() {
                            deferred.resolve();
                        },
                        function() {
                            deferred.reject();
                        });
                    } else {
                        deferred.resolve();
                    }
                });

                $q.all(queueCompletePromises).then(function(){
                    if (series.completedFiles === series.length) {
                        sendComplete(_id).then(
                            function(){
                                console.log('series completed');
                                series.progress = 100;
                                seriesD.resolve();
                                queues = null;
                            },
                            function(){
                                seriesD.reject();
                                console.log('series rejected: completion failed')
                                queues = null;
                            });
                    } else {
                        seriesD.reject();
                        console.log('series rejected: some files have not been uploaded');
                        queues = null;
                    }

                },
                function(){
                    seriesD.reject();
                    console.log('series rejected: error during upload');
                    queues = null;
                });
            });
            return seriesD.promise;
        }

        return {
            uploadSeries: uploadSeries
        }
    }]);
