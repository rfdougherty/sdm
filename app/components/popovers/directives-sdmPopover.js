'use strict';

(function() {
    angular.module('sdm.popovers.directives.sdmPopover', [])
        .directive('sdmPopover', ['$compile', '$document',
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
                    $scope.dialogStyle = {};
                    var attrKeys = Object.getOwnPropertyNames($attrs);
                    var match;
                    var rootElement = typeof $attrs.sdmAppendToBody ==='undefined'?
                        $element : angular.element(document.getElementsByTagName('body'));
                    var overlay = $compile('<div class="popover-overlay" ng-click="hidePopover($event, 0)"></div>')($scope);
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

                    var addKeepShownEvent = function() {
                        if ($attrs.sdmPopoverKeepShown) {
                            $element.on($attrs.sdmPopoverKeepShown, function($event){
                                return $scope.showPopover($event, $attrs.sdmPopoverShowTimeout)
                            });
                        }
                    };

                    var removeKeepShownEvent = function() {
                        if ($attrs.sdmPopoverKeepShown) {
                            $element.off($attrs.sdmPopoverKeepShown);
                        }
                    };

                    $scope.showPopover = function($event, timeout){
                        console.log('showPopover');
                        timeout = typeof timeout === 'undefined' ? 600 : timeout;
                        if ($event) {
                            $event.stopPropagation();
                            $event.preventDefault();
                            if ($scope.hasDynamicPosition) {
                                $scope.dialogStyle.left = $event.offsetX - 10;
                            }
                        }
                        clearTimeout($scope.timerHide);
                        if (typeof $scope.popover !== 'undefined') {
                            return;
                        }
                        $scope.timerShow = setTimeout(function() {
                            $scope.$apply(function(){
                                $scope.popover = $compile(templatePopover)($scope);
                                rootElement.append($scope.popover);
                                addKeepShownEvent();
                            });
                        }, timeout);
                    };

                    $scope._hidePopover = function($event, timeout){
                        console.log('hidePopover');
                        timeout = typeof timeout === 'undefined' ? 400 : timeout;
                        if ($event) {
                            $event.stopPropagation();
                            $event.preventDefault();
                        }
                        clearTimeout($scope.timerShow);
                        $scope.timerHide = setTimeout(function() {
                            if (typeof $scope.popover !== 'undefined') {
                                $scope.popover[0].remove();
                                $scope.popover = undefined;
                                removeKeepShownEvent();
                            }
                        }, timeout);
                    }

                    $scope.enableEvents = function(){
                        $scope.hidePopover = $scope._hidePopover;
                        if ($attrs.sdmPopoverShow) {
                            $element.on($attrs.sdmPopoverShow, function($event){
                                return $scope.showPopover($event, $attrs.sdmPopoverShowTimeout)
                            });
                        }
                        if ($attrs.sdmPopoverHide) {
                            $element.on($attrs.sdmPopoverHide, $scope.hidePopover);
                        }
                    }

                    $scope.disableEvents = function() {
                        $scope._hidePopover = $scope.hidePopover;
                        $scope.hidePopover = function(){};
                        $element.off();
                    }
                    $scope.enableEvents();
                    if (typeof $attrs.sdmPopoverShowImmediately !== 'undefined') {
                        $scope.showPopover(null, 0);
                    }
                }
            };
        }]
    );
})();
