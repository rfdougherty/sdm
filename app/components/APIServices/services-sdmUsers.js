'use strict';

angular.module('sdm.APIServices.services.sdmUsers', ['sdmHttpServices'])
    .factory('sdmUsers', ['$q', 'makeAPICall', function($q, makeAPICall){

        return function() {
            var d = $q.defer();
            var url = BASE_URL + 'users';
            makeAPICall.async(url).then(function(response){
                d.resolve(response);
            });
            return d.promise;
        }
    }]);
