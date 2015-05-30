'use strict';

(function() {
    angular.module('sdm.uploadDicom.directives.sdmUploadDicom',[
        'sdm.util.services.sdmFileUtilities', 'sdm.uploadDicom.services.sdmDicomUploader', 'sdm.services',
        'sdm.authentication.services.sdmUserManager', 'sdm.main.services.sdmViewManager',
        'sdm.popovers.services.sdmPopoverTrampoline', 'sdm.util.services.sdmHumanReadableSize'
        ]).directive('sdmUploadDicom', [
            '$q', 'sdmFileUtilities',
            'sdmDicomUploader', 'makeAPICall',
            'sdmUserManager', 'sdmViewManager','sdmPopoverTrampoline', 'sdmHumanReadableSize',
            function ($q, sdmFileUtilities, sdmDicomUploader,
                      makeAPICall, sdmUserManager, sdmViewManager,
                      sdmPopoverTrampoline, sdmHumanReadableSize) {
                return {
                    restrict: 'E',
                    scope: false,
                    replace: false, // Replace with the template below
                    transclude: false,// we want to insert custom content inside the directive
                    controller: function(){},
                    controllerAs: 'sdmULDController',
                    link: function($scope, $element, $attrs, sdmULDController) {
                        sdmULDController.data = sdmViewManager.getUploadData();

                        var userData = sdmUserManager.getAuthData();

                        sdmULDController.getProjects = function($event, group) {
                            if (!group) {
                                sdmULDController.data.projects = [];
                                sdmULDController.data.selectedProject = null;
                                return;
                            }
                            return makeAPICall.async(BASE_URL + 'groups/' + group._id + '/projects').then(function(projects){
                                var _projects = userData.root?projects:projects.filter(function(project){
                                    var p = project.permissions;
                                    return p && (p.length > 1 || (
                                        p.length && (p[0].access === 'admin')
                                    ));
                                });
                                sdmULDController.data.projects = _projects.sort(naturalSortByName);
                            });
                        }

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
                                        file.PatientName = tags.PatientName;
                                        file.PatientBirthDate = tags.PatientBirthDate;
                                        file.PatientAge = tags.PatientAge;
                                        if (tags.PatientBirthDate && tags.PatientBirthDate.value && tags.PatientAge && tags.PatientAge.value) {
                                            var experimentDate = tags.AcquisitionDate || tags.StudyDate;
                                            experimentDate = experimentDate.value[0];
                                            var patientBirthDate = tags.PatientBirthDate.value[0];
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

                                        var seriesData = sdmULDController.data.series[tags.SeriesInstanceUID.value[0]];
                                        if (!seriesData) {
                                            sdmULDController.data.series[tags.SeriesInstanceUID.value[0]] = seriesData =
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
                                            seriesData.hrsize = sdmHumanReadableSize(seriesData.size);
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
                                        sdmULDController.data.empty = false;
                                    });

                                }
                            );
                        }
                        var currentSeries;
                        sdmULDController.upload = function() {
                            var previousSeries;
                            angular.forEach(sdmULDController.data.series, function(series, seriesUID) {
                                var overwrite = {
                                    series_uid: seriesUID,
                                    group_name: sdmULDController.data.selectedGroup._id || 'unknown',
                                    project_name: sdmULDController.data.selectedProject.name || 'untitled',
                                    acq_no: series.tags['AcquisitionNumber']? series.tags['AcquisitionNumber'].value[0]:1
                                };
                                var _uploadSeries = function() {
                                    currentSeries = series;
                                    return sdmDicomUploader.uploadSeries(
                                        series, seriesUID, overwrite, sdmULDController.data.anonymize
                                    ).catch(function() {
                                        series.progress = -100;
                                    });
                                }
                                if (!previousSeries) {
                                    currentSeries = series;
                                    previousSeries = sdmDicomUploader.uploadSeries(
                                        series, seriesUID, overwrite, sdmULDController.data.anonymize
                                    ).catch(function(){
                                        series.progress = -100;
                                    });
                                } else {
                                    previousSeries = previousSeries.then( _uploadSeries, _uploadSeries);
                                }
                            });
                        }

                        sdmULDController.clear = function() {
                            sdmULDController.data.series = {};
                            sdmULDController.data.empty = true;
                        }

                        sdmULDController.confirmAnonymize = function($event) {
                            if (!sdmULDController.data.anonymize) {
                                sdmPopoverTrampoline.trigger(
                                    'sdm-anonymize-modal',
                                    'components/uploadDicom/anonymizeModal.html',
                                    {data: sdmULDController.data}
                                    );
                            } else {
                                sdmULDController.data.anonymize = true;
                            }
                        }

                    }
                }
            }]);
})()
