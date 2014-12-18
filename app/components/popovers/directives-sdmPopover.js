'use strict';
var _popover, _$element, _hidePopover,
_$;

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
                var popoverTemplatesPath = 'components/popovers/templates/';
            return {
                restrict: 'A',
                $scope: {},
                replace: false, // Replace with the template below
                transclude: false, // we want to insert custom content inside the directive
                link: function($scope, $element, $attrs) {
                    $scope.dialogStyle = {};
                    var attrKeys = Object.getOwnPropertyNames($attrs);
                    var match;
                    for (var i = 0; i < attrKeys.length; i++) {
                        match = attrRegex.exec(attrKeys[i]);
                        if (match !== null) {
                            $scope.dialogStyle[match[1].toLowerCase()] = $attrs[attrKeys[i]];
                        }
                    }

                    if ($attrs.sdmPopoverClass) {
                        $scope.sdmPopoverClass = $attrs.sdmPopoverClass;
                    }
                    else
                        throw 'Error in popover popup: missing popover class.';


                    if ($attrs.sdmPopoverTemplateContent)
                        $scope.sdmPopoverTemplateContent = popoverTemplatesPath + $attrs.sdmPopoverTemplateContent;
                    else
                        throw 'Error in popover popup: missing template.';

                    var timerHide, timerShow;
                    var popover;

                    $scope.showPopover = function($event){
                        console.log('showPopover');
                        $event.stopPropagation();
                        $event.preventDefault();
                        clearTimeout(timerHide);
                        if (typeof popover !== 'undefined') {
                            return;
                        }
                        timerShow = setTimeout(function() {
                            $scope.$apply(function(){
                                popover = $compile(templatePopover)($scope);
                                $element.append(popover);
                            });
                        }, 600);
                    };

                    $scope._hidePopover = function($event, timeout){
                        console.log('hidePopover');
                        timeout = typeof timeout === 'undefined' ? 400 : timeout;

                        $event.stopPropagation();
                        $event.preventDefault();
                        clearTimeout(timerShow);
                        timerHide = setTimeout(function() {
                            if (typeof popover !== 'undefined') {
                                popover[0].remove();
                                popover = undefined;
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
