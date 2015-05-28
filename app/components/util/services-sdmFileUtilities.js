'use strict';
var _q;

angular.module('sdm.util.services.sdmFileUtilities',
    ['sdm.upload.services.SdmMD5'])
    .factory('sdmFileUtilities',
        ['$q', 'SdmMD5', function($q, SdmMD5) {
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

            var sdmMD5;
            var calculateMD5= function(file, deferred) {
                deferred = deferred || $q.defer();
                sdmMD5 = new SdmMD5(file);
                sdmMD5.promise.then(function(md5){
                    deferred.resolve(md5);
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
                calculateMD5: calculateMD5
            }

        }]
    );
