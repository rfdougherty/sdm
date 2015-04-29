'use strict';

(function() {
    angular.module('sdm.newProject.directives.sdmCreateProject', ['sdm.services', 'sdm.main.services.sdmViewManager'])
        .directive('sdmCreateProject', ['makeAPICall', 'sdmViewManager', function(makeAPICall, sdmViewManager) {
            return {
                    restrict: 'E',
                    scope: false,
                    replace: false, // Replace with the template below
                    transclude: false,// we want to insert custom content inside the directive
                    controller: function(){},
                    controllerAs: 'sdmNPController',
                    link: function($scope, $element, $attrs, sdmNPController) {
                        console.log('init');
                        sdmNPController.loadingState = 1;
                        sdmNPController.placeholder = 'Enter new project name';
                        var groupsURL = BASE_URL + 'groups';
                        var projectsURL = BASE_URL + 'projects';
                        var data = {'admin': 'true'};
                        makeAPICall.async(groupsURL, data).then(function(result) {
                            sdmNPController.groups = result;
                            sdmNPController.loadingState--;
                        });
                        sdmNPController.cancel = function($event) {
                            $scope.$parent._hidePopover($event, 0);
                        }
                        sdmNPController.getProjects = function ($event, group) {
                            sdmNPController.projects = [];
                            if (!group) {
                                return;
                            }
                            return makeAPICall.async(BASE_URL + 'projects', {group: group._id}).then(function(projects){
                                sdmNPController.projects = projects.map(function(p) {
                                    return p.name;
                                });
                            });
                        };
                        console.log($scope.$parent.$parent);
                        var selectCreatedProject = function(projectId) {
                            var sdmMSController = $scope.$parent.$parent.sdmMSController;
                            sdmMSController.selectedGroup = sdmMSController.groups.filter(function(g){
                                return g._id === sdmNPController.selectedGroup._id;
                            })[0];
                            sdmMSController.getProjects(null, sdmMSController.selectedGroup).then(function(){
                                sdmMSController.selectedProject = sdmMSController.projects.filter(function(p){
                                    return p._id === projectId;
                                })[0];
                            });
                        }
                        sdmNPController.save = function($event, form) {
                            if (!form.$valid) {
                                console.log('form', form);
                                sdmNPController.submitted = true;
                                if (form.projectName.$error.sdmListValidator) {
                                    sdmNPController.placeholder = 'Project "' + form.projectName.$viewValue + '" already exists';
                                    sdmNPController.newProject = '';
                                    form.projectName.$error.sdmListValidator = false;
                                } else if (form.projectName.$error.required || form.projectName.$error.required) {
                                    sdmNPController.placeholder = 'Please enter the name of the project.';
                                }
                                return;
                            }
                            var payload = {
                                group_id: sdmNPController.selectedGroup._id,
                                name: sdmNPController.newProject
                            };


                            console.log('payload', payload);
                            makeAPICall.async(projectsURL, null, 'POST', payload).then(function(result) {
                                console.log(result);
                                selectCreatedProject(result._id);
                                sdmViewManager.refreshView();
                                $scope.$parent._hidePopover($event, 0);
                            });
                        }
                    }
            }
        }]);
})
()
