'use strict';
(function() {

    var sdmToFormly = function(){
        function convert(schema, key, model) {
            switch(schema.type) {
                case 'string':
                    return convertString(schema, key, model);
                case 'object':
                    return convertObject(schema, key, model);
                case 'array':
                    return convertArray(schema, key, model);
                case 'integer':
                case 'number':
                    return convertNumber(schema, key, model);
                default:
                    if (typeof schema.type !== 'undefined') {
                        throw new Error('no handler for type ' + schema.type);
                    }
            }
        }
        // http://jsbin.com/taweti
        function convertObject(schema, key, model) {
            console.log(schema.title);
            var submodel = key?(model[key] = {}):model;
            var properties = schema.title?
            [{
                template: '<h3>'+ schema.title + '</h3>'
            }]:[];
            angular.forEach(schema.properties, function(schema, key) {
                console.log('key', key, schema.type);
                var property = convert(schema, key, submodel)
                if (property){
                    properties.push(property);
                }
            }, properties);
            return {
                className: 'container',
                model: submodel,
                fieldGroup: properties
            }
        }
        function convertArray(schema, key, model) {
            var type = schema.items?schema.items.type:'';
            switch(type) {
                case 'object':
                    return convertArrayComplex(schema, key, model)
                default:
                    return convertArraySimple(schema, key, model)
            }
        }
        // http://jsbin.com/yojeye
        // http://angular-formly.com/#/example/advanced/repeating-section
        function convertArrayComplex(schema, key, model) {
            return {
                type: 'repeatSection',
                className: 'container',
                key: key,
                templateOptions: {
                    btnText: 'Add ' + (schema.title?schema.title:key),
                    fields: convert(schema.items, key, {}).fieldGroup
                }
            }
        }
        // http://jsbin.com/yojeye
        // http://angular-formly.com/#/example/other/multi-input
        function convertArraySimple(schema, key, model) {
            return {
                type: 'multiInput',
                className: 'container',
                key: key,
                templateOptions: {
                    label: schema.items?schema.items.title:key,
                    inputOptions: {
                        type: 'input'
                    }
                }
            }
        }
        function convertNumber(schema, key, model) {
            return {
              className: 'row-fluid',
              type: 'input',
              key: key,
              templateOptions: {
                label: schema.title?schema.title:key,
                type: 'number'
              }
            }
        }
        function convertString(schema, key, model) {
            return {
              className: 'row-fluid',
              type: 'input',
              key: key,
              templateOptions: {
                label: schema.title?schema.title:key
              }
            }
        }
        return convert;
    }
    sdmToFormly.$inject = [];

    angular.module('sdm.jsonschema.services.sdmToFormly',
        [])
        .factory('sdmToFormly', sdmToFormly);
})();
