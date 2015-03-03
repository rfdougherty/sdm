'use strict';

(function() {
    angular.module('sdm.moveSessions.directives.sdmMoveSessions',['sdm.services',
        'sdm.createCollection.services.sdmGetSelection',
        'sdm.authentication.services.sdmUserManager',
        'sdm.main.services.sdmViewManager'])
        .directive('sdmMoveSessions', ['$q', 'makeAPICall', 'sdmGetSelection', 'sdmUserManager', 'sdmViewManager',
            function ($q, makeAPICall, sdmGetSelection, sdmUserManager, sdmViewManager) {
                return {
                    restrict: 'E',
                    scope: false,
                    replace: false, // Replace with the template below
                    transclude: false,// we want to insert custom content inside the directive
                    controller: function(){},
                    controllerAs: 'sdmMSController',
                    link: function($scope, $element, $attrs, sdmMSController){
                        sdmMSController.loadingState = 2;
                        var userData = sdmUserManager.getAuthData();
                        makeAPICall.async(BASE_URL + 'projects/groups').then(function(groups){
                            sdmMSController.groups = groups;
                            sdmMSController.groups.forEach(function(group){
                                group.name = group.name||group._id
                            });
                            sdmMSController.groups.sort(naturalSortByName);
                            sdmMSController.loadingState--;
                        });
                        sdmMSController.projects = [];
                        sdmMSController.getProjects = function ($event, group) {
                            if (!group) {
                                sdmMSController.projects = [];
                                sdmMSController.selectedProject = null;
                                return;
                            }
                            return makeAPICall.async(BASE_URL + 'projects', {group: group._id}).then(function(projects){
                                var _projects = userData.root?projects:projects.filter(function(project){
                                    var p = project.permissions;
                                    return p && (p.length > 1 || (
                                        p.length && (p[0].access === 'admin')
                                    ));
                                });
                                sdmMSController.projects = _projects.sort(naturalSortByName);
                            });
                        };
                        $scope.$parent.disableEvents();
                        var selectionPromise = sdmGetSelection
                            .getSelectionOnLevel('sessions')
                            .then(function (selection) {
                                sdmMSController.hasPermissionsOnSelection = true;
                                if (!userData.root) {
                                    for (var i = 0; i < selection.length; i++) {
                                        if (!(selection[i].userAccess === 'admin')) {
                                            sdmMSController.hasPermissionsOnSelection = false;
                                        }
                                    }
                                }
                                sdmMSController.hasData = !!selection.length;
                                sdmMSController.loadingState--;
                                return selection;
                            });
                        var changeHeight = function(value) {
                            //$scope.$apply(function(){
                                var height = $scope.$parent.dialogStyle['height'];
                                height = parseInt(height.substr(0, height.length - 2));
                                $scope.$parent.dialogStyle['height'] = height + value + 'px';
                            //});
                        }
                        sdmMSController.cancel = function ($event) {
                            console.log('cancel');
                            $event.stopPropagation();
                            $event.preventDefault();
                            $scope.$parent._hidePopover($event, 0);
                            $scope.$parent.enableEvents();
                        };
                        sdmMSController.moveSessions = function($event) {
                            selectionPromise.then(function (selection) {
                                var url = BASE_URL + 'sessions/';
                                var payload = {
                                    project: sdmMSController.selectedProject._id
                                };
                                var promises = selection.map(function (selected) {
                                    return makeAPICall.async(url + selected.id, null, 'PUT', payload);
                                });
                                sdmMSController.loadingState = 1;
                                $q.all(promises).then(function(results){
                                        if (sdmMSController.isFailed) {
                                            changeHeight(-34);
                                        }
                                        sdmMSController.isFailed = false;
                                        sdmMSController.loadingState = 0;
                                        sdmViewManager.refreshCurrentView();
                                        $scope.$parent._hidePopover($event, 0);
                                        $scope.$parent.enableEvents();
                                    },
                                    function () {
                                        changeHeight(34);
                                        sdmMSController.loadingState = 0;
                                        sdmMSController.isFailed = true;
                                    });
                            });

                        };
                        sdmMSController.adminGroups = [];
                        var getAdminGroups = function() {
                            var groupsURL = BASE_URL + 'groups';
                            var data = {'admin': 'true'};
                            makeAPICall.async(groupsURL, data).then(function(result) {
                                sdmMSController.adminGroups = result;
                            });
                        }
                        getAdminGroups();
                    }
                }
            }]);
})()
