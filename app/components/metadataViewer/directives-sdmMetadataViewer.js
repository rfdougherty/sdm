'use strict';

(function() {
    angular.module('sdm.metadataViewer.directives.sdmMetadataViewer', ['sdm.services'])
    .directive('sdmMetadataViewer', ['$http', '$window', 'makeAPICall', function($http, $window, makeAPICall) {
        return {
            restrict: 'E',
            scope: false,
            controller: function() {},
            controllerAs: 'sdmMVController',
            link: function($scope, $element, $attrs, sdmMVController) {
                var validator = $window['isMyJsonValid'];

                // Load the meta-schema
                $http.get('utils/meta-schema/schema.json').success(function (data) {
                  sdmMVController.metaSchema = data;
                });

                var sdmIMController = $scope.$parent.$parent.sdmIMController;
                sdmMVController.metadata = JSON.stringify(sdmIMController.apiData, null, '    ');

                var level = sdmIMController.level;

                var parseMarkup = function(thing) {
                    return JSON.parse(thing);
                };

                sdmMVController.validateMetadata = function () {
                    console.debug("document");
                    sdmMVController.metadataErrors = [];
                    sdmMVController.metadataMessage = "";
                    try {
                        sdmMVController.metadataObject = parseMarkup(sdmMVController.metadata);
                    } catch(err) {
                        console.log(err);
                        sdmMVController.metadataErrors = [{message: "Document is invalid JSON" }];
                        return;
                    }
                    // Do validation
                    var metadataValidator = validator(sdmMVController.schemaObject, {
                      verbose: true
                    });
                    metadataValidator(sdmMVController.metadataObject);
                    console.log(metadataValidator.errors)
                    if (metadataValidator.errors && metadataValidator.errors.length) {
                        sdmMVController.metadataErrors = metadataValidator.errors;
                    } else {
                        sdmMVController.metadataMessage = "Document conforms to the JSON schema.";
                    }
                };

                var validateSchema = function (schema) {
                    console.debug("schema");
                    sdmMVController.schemaErrors = [];
                    sdmMVController.schemaMessage = "";

                    // Can't be done if we don't have the meta schema yet
                    if (!sdmMVController.metaSchema) {
                        return;
                    }

                    // Do validation
                    var schemaValidator = validator(sdmMVController.metaSchema, {
                        verbose: true
                    });
                    schemaValidator(schema);
                    console.log(schemaValidator.errors)
                    if (schemaValidator.errors && schemaValidator.errors.length) {
                        sdmMVController.schemaErrors = schemaValidator.errors;
                    } else {
                        sdmMVController.schemaMessage = "Schema is a valid JSON schema.";
                        sdmMVController.schemaObject = schema;
                    }

                };

                makeAPICall.async(BASE_URL + level + '/schema').then(function(response){
                    console.log(response);
                    validateSchema(response);
                });
            }
        }
    }]);
})();
