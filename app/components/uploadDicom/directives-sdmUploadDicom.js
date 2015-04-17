'use strict';

(function() {
    angular.module('sdm.uploadDicom.directives.sdmUploadDicom',[
        'sdm.util.services.sdmFileUtilities', 'sdm.uploadDicom.services.sdmDicomUploader', 'sdm.services',
        'sdm.authentication.services.sdmUserManager', 'sdm.main.services.sdmViewManager',
        ]).directive('sdmUploadDicom', [
            '$q', 'sdmFileUtilities',
            'sdmDicomUploader', 'makeAPICall',
            'sdmUserManager', 'sdmViewManager',
            function ($q, sdmFileUtilities, sdmDicomUploader, makeAPICall, sdmUserManager, sdmViewManager) {
                return {
                    restrict: 'E',
                    scope: false,
                    replace: false, // Replace with the template below
                    transclude: false,// we want to insert custom content inside the directive
                    controller: function(){},
                    controllerAs: 'sdmULDController',
                    link: function($scope, $element, $attrs, sdmULDController) {
                        sdmULDController.series = {};
                        sdmULDController.empty = true;
                        sdmULDController.anonymize = true;
                        var userData = sdmUserManager.getAuthData();

                        var dicomTags = ['PatientName',
                            'PatientBirthDate',
                            'SeriesInstanceUID',
                            'ImagesInAcquisition',
                            'SeriesDate',
                            'SeriesTime',
                            'StudyDate',
                            'StudyTime',
                            'SeriesDescription',
                            'StudyID',
                            'SOPInstanceUID',
                            'SOPClassUID',
                            'Manufacturer',
                            'PatientID',
                            'PatientAge',
                            'AcquisitionNumber',
                            'AcquisitionDate'
                        ];

                        var padTimeField = function(value) {
                            return value < 10?'0' + value : value;
                        }

                        var toTimeString = function(milliseconds) {
                            var seconds = Math.floor(milliseconds/1000);
                            var minutes = Math.floor(seconds/60);
                            seconds = padTimeField(seconds % 60);

                            var hours = padTimeField(Math.floor(minutes/60));
                            minutes = padTimeField(minutes % 60);

                            return [hours, minutes].join(':');
                        }

                        sdmULDController.addFiles = function() {
                            angular.forEach(sdmULDController.newFiles, function(file){
                                var promise = sdmFileUtilities.validateDicomFile(file)
                                    .then(
                                        function(file) {
                                            return sdmFileUtilities.readFile(file)
                                        }
                                    ).then(function(fileContent) {
                                        var dicom = sdmFileUtilities.parseContent(fileContent);
                                        var tags = {};
                                        dicomTags.forEach(function(tag){
                                            tags[tag] = sdmFileUtilities.getDicomTag(dicom, tag);
                                        });
                                        console.log(tags);
                                        file.PatientName = tags.PatientName;
                                        file.PatientBirthDate = tags.PatientBirthDate;
                                        file.PatientAge = tags.PatientAge;
                                        if (tags.PatientBirthDate && tags.PatientBirthDate.value && tags.PatientAge && tags.PatientAge.value) {
                                            var experimentDate = tags.AcquisitionDate || tags.StudyDate;
                                            experimentDate = experimentDate.value[0];
                                            var patientBirthDate = tags.PatientBirthDate.value[0];
                                            console.log(experimentDate, patientBirthDate)
                                            var months = (experimentDate.getFullYear() - patientBirthDate.getFullYear()) * 12 +
                                                (experimentDate.getMonth() - patientBirthDate.getMonth()) -
                                                (patientBirthDate.getDay() > experimentDate.getDay());
                                            var padAge = function(n){
                                                var a = [];
                                                var rest;
                                                for (var i=0; i < 3; i++) {
                                                    rest = n%10;
                                                    a.push(rest);
                                                    n = (n - rest)/10;
                                                }
                                                var age = '';
                                                while (a.length){
                                                    age += a.pop();
                                                }
                                                return age;
                                            }
                                            if (months >= 0){
                                                if (months < 960) {
                                                    file.PatientAge.value[0] = padAge(months) + 'M';
                                                } else {
                                                    var years = (months - months%12)/12;
                                                    file.PatientAge.value[0] = padAge(years) + 'Y';
                                                }
                                            }
                                        }

                                        /**
                                        var nameSlice = file.slice(
                                            file.tags.PatientName.offsetStart + 8,
                                            file.tags.PatientName.offsetEnd
                                        )
                                        sdmFileUtilities.readFile(nameSlice).then(function(patientName) {
                                            console.log(patientName);
                                        });
                                        **/
                                        var seriesData = sdmULDController.series[tags.SeriesInstanceUID.value[0]];
                                        if (!seriesData) {
                                            sdmULDController.series[tags.SeriesInstanceUID.value[0]] = seriesData =
                                                {
                                                    files: {},
                                                    tags: tags,
                                                    selected: true,
                                                    datetime: 'no date available',
                                                    length: 0,
                                                    size: 0,
                                                    progress: 0
                                                };
                                        }
                                        file.uid = tags.SOPInstanceUID.value[0] + '.dcm';
                                        if (!seriesData.files[file.uid]) {
                                            seriesData.length++;
                                            seriesData.size += file.size;
                                        }
                                        seriesData.files[file.uid] = file;

                                        if (tags.SeriesDate) {
                                            seriesData.datetime = tags.SeriesDate.value[0].toLocaleDateString();
                                            if (tags.SeriesTime) {
                                                seriesData.datetime += ' ' + toTimeString(tags.SeriesTime.value[0]);
                                            }
                                        } else if (tags.StudyDate) {
                                            seriesData.datetime = tags.StudyDate.value[0].toLocaleDateString();
                                            if (tags.StudyTime) {
                                                seriesData.datetime += ' ' + toTimeString(tags.StudyTime.value[0]);
                                            }
                                        }
                                        sdmULDController.empty = false;
                                    });

                                }
                            );
                        }
                        var currentSeries;
                        sdmULDController.upload = function() {
                            var previousSeries;
                            angular.forEach(sdmULDController.series, function(series, seriesUID) {
                                var overwrite = {
                                    series_uid: seriesUID,
                                    group_name: sdmULDController.group || 'Unknown',
                                    project_name: sdmULDController.project || 'unknown',
                                    manufacturer: series.tags['Manufacturer'].value[0],
                                    acq_no: series.tags['AcquisitionNumber']? series.tags['AcquisitionNumber'].value[0]:1
                                };
                                var _uploadSeries = function() {
                                    currentSeries = series;
                                    return sdmDicomUploader.uploadSeries(
                                        series, seriesUID, overwrite, sdmULDController.anonymize
                                    );
                                }
                                if (!previousSeries) {
                                    currentSeries = series;
                                    previousSeries = sdmDicomUploader.uploadSeries(
                                        series, seriesUID, overwrite, sdmULDController.anonymize
                                    );
                                } else {
                                    if (sdmULDController.abort) {
                                        return;
                                    }
                                    previousSeries = previousSeries.then( _uploadSeries, _uploadSeries);
                                }
                            });
                            sdmULDController.abort = false;
                        }

                        sdmULDController.abort = function() {
                            sdmULDController.abort = true;
                            currentSeries.abort();
                        }

                        sdmULDController.clear = function() {
                            sdmULDController.series = {};
                            sdmULDController.empty = true;
                        }

                        var getGroups = function() {
                            makeAPICall.async(BASE_URL + 'projects/groups').then(function(groups){
                                sdmULDController.groups = groups;
                                sdmULDController.groups.forEach(function(group){
                                    group.name = group.name||group._id
                                });
                                sdmULDController.groups.sort(naturalSortByName);
                            });
                        }
                        getGroups();

                        sdmULDController.getProjects = function($event, group) {
                            console.log($event);
                            if (!group) {
                                sdmULDController.projects = [];
                                sdmULDController.selectedProject = null;
                                return;
                            }
                            return makeAPICall.async(BASE_URL + 'projects', {group: group._id}).then(function(projects){
                                var _projects = userData.root?projects:projects.filter(function(project){
                                    var p = project.permissions;
                                    return p && (p.length > 1 || (
                                        p.length && (p[0].access === 'admin')
                                    ));
                                });
                                sdmULDController.projects = _projects.sort(naturalSortByName);
                            });
                        }

                    }
                }
            }]);
})()
