'use strict';

(function() {
    var templateIndex = 0;
    angular.module('sdm.popovers.directives.sdmTooltipStyle', ['sdm.services'])
        .directive('sdmTooltipStyle', ['sdmTextWidthCalculator', function(sdmTextWidthCalculator) {
            return {
                restrict: 'A',
                scope: false,
                require: 'sdmPopover',
                link: function($scope, $element, $attrs, sdmPopoverController) {
                    console.log(sdmPopoverController);
                    var dialogStyle = sdmPopoverController.getProperty('dialogStyle');
                    var content = sdmPopoverController.getProperty('sdmPopoverTemplateText');
                    console.log(dialogStyle);
                    angular.forEach(dialogStyle, function(value, key) {
                        dialogStyle[key] = null;
                    });
                    var calculatedWidth = sdmTextWidthCalculator(content, 12, 'span');
                    calculatedWidth += calculatedWidth%2 + 8;
                    dialogStyle.width = calculatedWidth + 'px';
                    if ($attrs.sdmTooltipY && $attrs.sdmTooltipX) {
                        dialogStyle.top = $attrs.sdmTooltipY +'px';
                        dialogStyle.left = $attrs.sdmTooltipX - calculatedWidth/2 + 'px';
                    } else {
                        throw 'Error in tooltip style: missing property. sdm-tooltip-x or sdm-tooltip-y are both required.';
                    }
                }
            }
        }]);
})();
