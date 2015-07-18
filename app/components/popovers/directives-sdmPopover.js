'use strict';

(function() {
    var templateIndex = 0;
    angular.module('sdm.popovers.directives.sdmPopover', ['sdm.services'])
        .directive('sdmPopover', ['$compile', '$document', '$templateCache', '$sanitize', 'sdmTextWidthCalculator',
        function($compile, $document, $templateCache, $sanitize, sdmTextWidthCalculator) {
            var body = $document.find('body').eq(0);
            var templatePopover =
                '<div class="popover" ng-class="sdmPopoverClass">' +
                    '<div class="popover-overlay" ng-show="!sdmPopoverShowOnce" ng-click="hidePopover($event, 0)"></div>' +
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
                controller: function() {
                    var _this = this;
                    _this.properties = {};
                    _this.getProperty = function(key) {
                        return _this.properties[key];
                    }
                    _this.setProperty = function(key, value) {
                        _this.properties[key] = value;
                    }
                },
                controllerAs: 'sdmPopoverController',
                link: { pre: function($scope, $element, $attrs, sdmPopoverController) {
                    console.log($attrs);
                    $scope.dialogStyle = {};
                    sdmPopoverController.setProperty('dialogStyle', $scope.dialogStyle);
                    var attrKeys = Object.getOwnPropertyNames($attrs);
                    var match;
                    var rootElement = typeof $attrs.sdmAppendToBody ==='undefined'?
                        $element : angular.element(document.getElementsByTagName('body'));
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
                        $attrs.sdmPopoverTemplateText = $sanitize($attrs.sdmPopoverTemplateText);
                        sdmPopoverController.setProperty('sdmPopoverTemplateText', $attrs.sdmPopoverTemplateText);
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
                        console.log('enableEvents', $attrs.sdmPopoverClass);
                        $scope.hidePopover = $scope._hidePopover;
                        $scope.sdmPopoverShowOnce = (typeof $attrs.sdmPopoverShowOnce !== 'undefined');
                        if ($attrs.sdmPopoverShow) {
                            $attrs.sdmPopoverShowMethod = function($event){
                                if ($scope.sdmPopoverShowOnce) {
                                    $element[0].removeEventListener($attrs.sdmPopoverShow, $attrs.sdmPopoverShowMethod);
                                    $element[0].addEventListener($attrs.sdmPopoverHide, $attrs.sdmPopoverHideMethod);
                                }
                                return $scope.showPopover($event, $attrs.sdmPopoverShowTimeout)
                            }
                            $element[0].addEventListener($attrs.sdmPopoverShow, $attrs.sdmPopoverShowMethod);
                        }
                        if ($attrs.sdmPopoverHide) {
                            $attrs.sdmPopoverHideMethod = function($event){
                                if ($scope.sdmPopoverShowOnce) {
                                    $element[0].removeEventListener($attrs.sdmPopoverHide, $attrs.sdmPopoverHideMethod);
                                    $element[0].addEventListener($attrs.sdmPopoverShow, $attrs.sdmPopoverShowMethod);
                                }
                                return $scope.hidePopover($event, $attrs.sdmPopoverHideTimeout);
                            }
                            if (!$scope.sdmPopoverShowOnce) {
                                $element[0].addEventListener($attrs.sdmPopoverHide, $attrs.sdmPopoverHideMethod);
                            }
                        }
                    }

                    $scope.disableEvents = function() {
                        $scope._hidePopover = $scope.hidePopover;
                        $scope.hidePopover = function(){};
                        if ($attrs.sdmPopoverHide) {
                            $element[0].removeEventListener($attrs.sdmPopoverHide, $attrs.sdmPopoverHideMethod);
                        }
                        if ($attrs.sdmPopoverShow) {
                            $element[0].removeEventListener($attrs.sdmPopoverShow, $attrs.sdmPopoverShowMethod);
                        }
                    }

                    $scope.enableEvents();
                    if (typeof $attrs.sdmPopoverShowImmediately !== 'undefined') {
                        $scope.showPopover(null, 0);
                    } else if (typeof $attrs.sdmPopoverShowAfter !== 'undefined') {
                        $scope.showPopover(null, $attrs.sdmPopoverShowAfter);
                    }
                }
            }};
        }]
    );
})();
