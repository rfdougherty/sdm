'use strict';

(function() {
    var templateIndex = 0;
    angular.module('sdm.popovers.directives.sdmPopover', [])
        .directive('sdmPopover', ['$compile', '$document', '$templateCache',
        function($compile, $document, $templateCache) {
            var body = $document.find('body').eq(0);
            var templatePopover =
                '<div class="popover" ng-class="sdmPopoverClass">' +
                    '<div class="popover-overlay" ng-click="hidePopover($event, 0)"></div>' +
                    '<div class="popover-dialog" ng-style="dialogStyle" ng-class="sdmPopoverClass">' +
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
                    else if ($attrs.sdmPopoverTemplateText) {
                        var templateURL = 'tempTemplate' + templateIndex++ + '.html';
                        $templateCache.put(templateURL, $attrs.sdmPopoverTemplateText);
                        $scope.sdmPopoverTemplateContent = templateURL;
                    } else
                        throw 'Error in popover popup: missing template.';


                    $scope.showPopover = function($event, timeout){
                        console.log('showPopover', $attrs.sdmPopoverClass);
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
                            });
                        }, timeout);
                    };

                    $scope._hidePopover = function($event, timeout){
                        console.log('hidePopover', $attrs.sdmPopoverClass);
                        timeout = typeof timeout === 'undefined' ? 400 : timeout;
                        if ($event) {
                            $event.stopPropagation();
                            $event.preventDefault();
                        }
                        clearTimeout($scope.timerShow);
                        $scope.timerHide = setTimeout(function() {
                            if (typeof $scope.popover !== 'undefined') {
                                console.log($scope.popover);
                                $scope.popover[0].remove();
                                $scope.popover = undefined;
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
                            $element.on($attrs.sdmPopoverHide, function($event) {
                                $scope.hidePopover($event, $attrs.sdmPopoverHideTimeout)
                            });
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
