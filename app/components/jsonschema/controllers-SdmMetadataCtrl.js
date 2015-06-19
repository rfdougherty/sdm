'use strict';

(function(){
    angular.module('sdm.jsonschema.controllers.SdmMetadataCtrl', ['formly'])
        .controller('SdmMetadataCtrl', ['$scope', 'formlyVersion', 'sdmToFormly', function ($scope, formlyVersion, sdmToFormly) {
            var vm = this;

            vm.onSubmit = onSubmit;

            vm.env = {
                angularVersion: angular.version.full,
                formlyVersion: formlyVersion
            };

            init();

            function onSubmit() {
                alert(JSON.stringify(vm.model), null, 2);
            }

            function init() {

                var sdmIMController = $scope.$parent.$parent.$parent.sdmIMController;
                vm.model = sdmIMController.apiData;
                vm.schema = sdmIMController.jsonSchema;
                vm.fields = [sdmToFormly(sdmIMController.jsonSchema, null, vm.model)];
                console.log(vm.model);
            }
        }]);
})();
