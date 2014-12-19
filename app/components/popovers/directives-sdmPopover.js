'use strict';

(function() {
    angular.module('sdm.popovers.directives.sdmPopover', [])
        .directive('sdmPopoverClick', ['$compile', '$document',
        function($compile, $document) {
            var body = $document.find('body').eq(0);
            var templatePopover =
                '<div class="popover" ng-class="sdmPopoverClass">' +
                    '<div class="popover-overlay" ng-click="hidePopover($event, 0)"></div>' +
                    '<div class="popover-dialog" ng-style="dialogStyle">' +
                        '<div class="popover-content" ng-include="sdmPopoverTemplateContent">' +
                        '</div>' +
                    '</div>' +
                '</div>';
                var attrRegex =  /^sdmPopoverStyle(.*$)/;
            return {
                restrict: 'A',
                scope: {},
                replace: false, // Replace with the template below
                transclude: false, // we want to insert custom content inside the directive
                link: function($scope, $element, $attrs) {
                    console.log($scope.headersTitles);
                    $scope.dialogStyle = {};
                    var attrKeys = Object.getOwnPropertyNames($attrs);
                    var match;
                    for (var i = 0; i < attrKeys.length; i++) {
                        match = attrRegex.exec(attrKeys[i]);
                        if (match !== null) {
                            $scope.dialogStyle[match[1].toLowerCase()] = $attrs[attrKeys[i]];
                        }
                    }

                    $scope.hasDynamicPosition = $attrs.sdmPopoverDynamicPosition==='true'?true:false;


                    if ($attrs.sdmPopoverClass) {
                        $scope.sdmPopoverClass = $attrs.sdmPopoverClass;
                    }
                    else
                        throw 'Error in popover popup: missing popover class.';


                    if ($attrs.sdmPopoverTemplateContent)
                        $scope.sdmPopoverTemplateContent = $attrs.sdmPopoverTemplateContent;
                    else
                        throw 'Error in popover popup: missing template.';

                    $scope.showPopover = function($event){
                        console.log('showPopover');
                        $event.stopPropagation();
                        $event.preventDefault();
                        console.log('event x', $event.offsetX);
                        if ($scope.hasDynamicPosition) {
                            $scope.dialogStyle.left = $event.offsetX - 10;
                        }
                        clearTimeout($scope.timerHide);
                        if (typeof $scope.popover !== 'undefined') {
                            return;
                        }
                        $scope.timerShow = setTimeout(function() {
                            $scope.$apply(function(){
                                $scope.popover = $compile(templatePopover)($scope);
                                $element.append($scope.popover);
                            });
                        }, 600);
                    };

                    $scope._hidePopover = function($event, timeout){
                        console.log('hidePopover', $scope.popover);
                        timeout = typeof timeout === 'undefined' ? 400 : timeout;

                        $event.stopPropagation();
                        $event.preventDefault();
                        clearTimeout($scope.timerShow);
                        $scope.timerHide = setTimeout(function() {
                            if (typeof $scope.popover !== 'undefined') {
                                $scope.popover[0].remove();
                                $scope.popover = undefined;
                            }
                        }, timeout);
                    }

                    $scope.enableEvents = function(){
                        $scope.hidePopover = $scope._hidePopover;
                        $element.on('mouseenter', $scope.showPopover);
                        $element.on('mouseleave', $scope.hidePopover);
                    }

                    $scope.disableEvents = function() {
                        $scope._hidePopover = $scope.hidePopover;
                        $scope.hidePopover = function(){};
                        $element.off();
                    }
                    $scope.enableEvents();
                }
            };
        }]
    );
})();