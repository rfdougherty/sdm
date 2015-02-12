'use strict';

(function(){
    var sdmPopoverTrampoline = function($rootScope, $compile){
        var trigger = function (popoverClass, template, extendScope) {
            var trampoline = '<div sdm-popover' +
                ' sdm-popover-template-content="' + template +
                '" sdm-popover-class="' + popoverClass +
                '" sdm-popover-show-immediately' +
                ' sdm-append-to-body></div>';
            var scope = $rootScope.$new(true);
            angular.extend(scope, extendScope);
            $compile(trampoline)(scope);
        };

        return {
            trigger: trigger
        }
    };

    sdmPopoverTrampoline.$inject = ['$rootScope', '$compile'];

    angular.module('sdm.popovers.services.sdmPopoverTrampoline', [])
        .factory('sdmPopoverTrampoline', sdmPopoverTrampoline);

})();
