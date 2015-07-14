'use strict';

(function(){
    angular.module('sdm.jsonschema.controllers.SdmMetadataCtrl', [])
        .controller('SdmMetadataCtrl', ['$scope', function ($scope) {
            var vm = this;

            vm.onSubmit = onSubmit;

            init();

            function onSubmit() {
                alert(JSON.stringify(vm.model), null, 2);
            }

            function init() {

                var sdmIMController = $scope.$parent.$parent.$parent.sdmIMController;
                vm.model = sdmIMController.apiData;
                vm.schema = sdmIMController.jsonSchema;
                //vm.fields = [sdmToFormly(sdmIMController.jsonSchema, null, vm.model)];
                console.log(vm.model);
            }
        }]);
})();
