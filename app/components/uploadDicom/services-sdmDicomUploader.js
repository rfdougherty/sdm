'use strict';


angular.module('sdm.uploadDicom.services.sdmDicomUploader',
    ['sdm.services', 'sdm.util.services.sdmFileUtilities'])
    .factory('sdmDicomUploader', ['$q', 'makeAPICall', 'sdmFileUtilities', function($q, makeAPICall, sdmFileUtilities) {
        var uploadURL = BASE_URL + 'incremental';
        var buildHeader = function(overwrite) {
            var header = {
                filetype: 'dicom',
                overwrite: overwrite
            };
            console.log(header);
            var headerData = sdmFileUtilities.createFile(JSON.stringify(header));
            return headerData;
        }

        var sendFile = function(data, filename, _id) {
            var URL = uploadURL + '?filename=' + filename;
            if (_id) {
                URL += '&_id=' + _id;
            }
            var deferred = $q.defer();
            sdmFileUtilities.calculateSHA1(data).then(function(sha1Hash){
                makeAPICall.async(
                    URL,
                    null,
                    'POST',
                    data,
                    {'Content-MD5': sha1Hash}
                ).then(function(response) {
                    deferred.resolve(response)
                });
            });
            return deferred.promise
        }

        var sendComplete = function(_id) {
            return makeAPICall.async(uploadURL + '?complete=true&_id=' + _id, null, 'POST');
        }

        var uploadDicom = function(dicom, name, _id, anonymize) {
            var deferred = $q.defer();
            var processDicom = anonymize?sdmFileUtilities.anonymizeDicom:sdmFileUtilities.readFile;
            processDicom(dicom, true).then(
                function (dicomData) {
                    return sendFile(dicomData, name, _id).then(function(){
                        deferred.resolve();
                    });
                }
            );

            return deferred.promise
        }

        var uploadSeries = function(series, seriesUID, overwrite, anonymize) {
            var seriesD = $q.defer();
            if (!series.selected) {
                seriesD.reject();
                return seriesD.promise
            }
            series.progress = 0;

            var headerData = buildHeader(overwrite);
            series.abort = function() {
                seriesD.reject('promise aborted for', seriesUID);
            }

            sendFile(headerData, 'metadata.json').then(function(_id){
                var promises = [];
                angular.forEach(series.files, function(dicom, name){
                    var promise = uploadDicom(dicom, name, _id, anonymize).then(
                        function() {
                            var increment = 100*dicom.size/series.size;
                            increment -= increment%0.1
                            series.progress += increment;
                        }
                    );
                    promises.push( promise );
                });
                $q.all(promises).then(function(){
                    sendComplete(_id).then(
                        function(){
                            series.progress = 100;
                            seriesD.resolve();
                        },
                        function(){
                            series.progress = 0;
                            seriesD.reject();
                        });
                },
                function(){
                    series.progress = 0;
                    seriesD.reject();
                });
            });
            return seriesD.promise;
        }

        return {
            uploadSeries: uploadSeries
        }
    }]);
