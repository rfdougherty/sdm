angular.module('sdm.brainbrowser.directives.sdmBrainBrowser',
    []).directive('sdmBrainBrowser', ['$q', function ($q) {
    return {
        restrict: "E",
        scope: {
            sdmTicketUrl: "="
        },
        templateUrl: 'components/brainbrowser/brainbrowserTemplate.html',
        replace: true,
        link: function ($scope) {
            $scope.loadingBB = true;
            var unbindWatcher = $scope.$watch('sdmTicketUrl', initViewer);
            function initViewer(ticketUrl) {
                if (ticketUrl) {
                    console.log(ticketUrl);

                    $scope.showSlider = false;
                    $scope.selectedPoint = {};
                    setTimeout(function(){
                        BrainBrowser.SurfaceViewer.start("bbrowser-viewer", function(viewer) {
                            $scope.viewer = viewer;
                            console.log(viewer);
                            viewer.render();
                            $scope.bbrowserColor = '#808080';
                            $scope.setBackgroundcolor($scope.bbrowserColor);
                            viewer.loadModelFromURL(ticketUrl, {
                                format: "wavefrontobj",
                                complete: function() {
                                    $scope.loadingBB = false;
                                    $scope.$apply();
                                }
                            });
                            viewer.addEventListener("displaymodel", function(ev) {
                                console.log(ev);
                                if (ev.model.children.length) {
                                    console.log(viewer.target);
                                    var shape_name = ev.model.children[0].name;
                                    $scope.changeOpacity = function(alpha){
                                        var alpha = Math.min(100, Math.max(0, alpha)) / 100.0;
                                        viewer.setTransparency(alpha,
                                            {shape_name: shape_name});
                                    }
                                    $scope.showSlider = true;


                                }
                            });
                            $("#bbrowser-viewer").click(
                                function(event) {
                                    console.log(event);
                                    if (!event.shiftKey) {
                                        return;
                                    }
                                    var pick_info = viewer.pick(event.offsetX, event.offsetY);
                                    console.log(pick_info);

                                    if (pick_info) {
                                        var selectedPoint = $scope.selectedPoint;
                                        selectedPoint.x = pick_info.point.x.toPrecision(4);
                                        selectedPoint.y = pick_info.point.y.toPrecision(4);
                                        selectedPoint.z = pick_info.point.z.toPrecision(4);
                                        selectedPoint.vertex = pick_info.index;
                                        var picked_object = pick_info.object;
                                        var model_data = viewer.model_data.get(picked_object.userData.model_name);
                                        var intensity_data = model_data.intensity_data[0];
                                        if (intensity_data){
                                            selectedPoint.value = intensity_data.values[pick_info.index];
                                        }
                                        $scope.$apply();
                                    }
                                }
                            );

                        });
                    }, 0);
                    unbindWatcher();
                }
            };

            $scope.setBackgroundcolor = function(color) {
                if (!$scope.viewer) return;
                $scope.viewer.setClearColor(parseInt('0x' + color.substring(1), 16));
            };

            $scope.resetView = function() {
                if (!$scope.viewer) return;
                $scope.viewer.setView();
            };

            $scope.setRotation = function($event) {
                if (!$scope.viewer) return;
                var axis = $event.target.value;
                $scope.viewer.autorotate[axis] = !$scope.viewer.autorotate[axis];
                console.log($event);
            };
        }
    };
}]);
