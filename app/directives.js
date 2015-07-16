'use strict';

(function (){
    var sdmDirectives = angular.module('sdm.directives', []);

    sdmDirectives.directive('sdmListValidator', [function(){
        return {
            require: 'ngModel',
            link: function($scope, $element, $attrs, ngModel) {
                ngModel.$parsers.unshift(function(value){
                    var valueList = $scope.$eval($attrs.sdmListValidator);
                    var valid = valueList.indexOf(value) === -1;
                    ngModel.$setValidity('sdmListValidator', valid);
                    if (!valid) {
                        return;
                    }
                    return value;
                });
            }
        }
    }]);

    sdmDirectives.directive('selectImmediate', ['$window', function ($window) {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                setTimeout(function(){
                    if (!$window.getSelection().toString()) {
                        element[0].setSelectionRange(0, element[0].value.length)
                    }
                }, 0);
            }
        };
    }]);
})()

