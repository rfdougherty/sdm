'use strict';
var _q;

angular.module('sdm.util.services.sdmFileUtilities',
    [])
    .factory('sdmFileUtilities',
        ['$q', function($q) {
            _q = $q;
            var subDict;
            daikon.reverseDict = {};
            for (var key1 in daikon.Dictionary.dict) {
                if (daikon.Dictionary.dict.hasOwnProperty(key1)) {
                    subDict = daikon.Dictionary.dict[key1];
                    for (var key2 in subDict) {
                        if (subDict.hasOwnProperty(key2)) {
                            if (daikon.reverseDict[subDict[key2][1]]) {
                                throw new Error('repeated key in daikon dict', subDict[key2][1]);
                            }
                            daikon.reverseDict[subDict[key2][1]] = [key1, key2];
                        }
                    }
                }
            }
            console.log(daikon.reverseDict);
            function getDicomTag(image, tagName) {
                return image.tags[daikon.reverseDict[tagName].join('')];
            }

            var parseContent = function(fileContent) {
                var data = new DataView(fileContent);
                //daikon.Parser.verbose = true;
                return daikon.Series.parseImage(data);
            }

            var validateDicomFile = function(file) {
                var deferred = $q.defer();
                if (file.type === 'directory') {
                    console.log('Ignoring folder', file.name);
                    file.status = "Not valid";
                    deferred.reject();
                    return deferred.promise;
                }
                if (file.name.substring(0, 1) == '.') {
                    console.log('Ignoring hidden file:', file.name);
                    file.status = "Not valid";
                    deferred.reject();
                    return deferred.promise;
                }
                var fr = new FileReader();
                var blob = file.slice(128, 132);

                fr.onloadend = function(evt){
                    var magic = evt.target.result;
                    var isDicom = (magic == 'DICM');

                    if (isDicom) {
                        deferred.resolve(file);
                    } else {
                        // Could not parse the dicom file
                        console.log('Ignoring non-dicom file:', file.name);
                        file.status = "Not valid";
                        deferred.reject();
                    }
                }
                fr.readAsBinaryString(blob);
                return deferred.promise
            };


            var readFile = function(file, binary){
                var deferred = $q.defer();

                var fr = new FileReader();
                fr.onload = function(evt) {
                    var result = binary?new Uint8Array(evt.target.result):evt.target.result;
                    deferred.resolve(result);
                }

                fr.onerror = function(evt){
                    console.log("Error reading file ", file.name, ':', evt.target.error);
                    file.status = "Cannot read file";
                    deferred.reject();
                }
                fr.readAsArrayBuffer(file);
                return deferred.promise;
            };

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
            var createFile = function(s) {
                var b = new Blob([s], {type: 'plain/text'});
                return b;
            }

            var anonymizeDicom = function(dicom, binary) {
                var deferred = $q.defer();
                readFile(dicom).then(function(buffer){
                    var view = new Uint8Array(buffer);
                    if (dicom.PatientName) {
                        anonymizeField(
                            view,
                            dicom.PatientName.offsetStart + 8,
                            dicom.PatientName.offsetEnd
                        );
                    }
                    if (dicom.PatientBirthDate) {
                        anonymizeField(
                            view,
                            dicom.PatientBirthDate.offsetStart + 8,
                            dicom.PatientBirthDate.offsetEnd
                        );
                    }
                    if (dicom.PatientAge && dicom.PatientAge.value) {
                        console.log(dicom.PatientAge);
                        setField(
                            view,
                            dicom.PatientAge.offsetStart + 8,
                            dicom.PatientAge.offsetEnd,
                            dicom.PatientAge.value[0]
                        )
                    }
                    if (binary) {
                        deferred.resolve(view);
                    } else {
                        deferred.resolve(buffer);
                    }
                    parseContent(buffer)

                });
                return deferred.promise
            }

            var anonymizeField = function(view, start, end) {
                for (var i = start;i < end; i++) {
                    view[i] = 0x20;
                }
            }

            var setField = function(view, start, end, value) {
                if (value.length !== end - start) {
                    throw new Error('invalid length for string', value);
                }
                for (var i = start; i < end; i++) {
                    view[i] = value.charCodeAt(i - start);
                }
            }


            return {
                readFile: readFile,
                createFile: createFile,
                parseContent: parseContent,
                validateDicomFile: validateDicomFile,
                anonymizeDicom: anonymizeDicom,
                getDicomTag: getDicomTag,
                calculateSHA1: calculateSHA1
            }

        }]
    );
