'use strict';

angular.module('sdm.APIServices.services.sdmRoles', ['sdmHttpServices'])
    .factory('sdmRoles', ['$q', 'makeAPICall', function($q, makeAPICall){
        var d = $q.defer();
        var url = BASE_URL + 'roles';
        makeAPICall.async(url).then(function(response){
            d.resolve(response);
        });
        return function() { return d.promise; }
    }]);
