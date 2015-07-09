'use strict';

(function(){
    var sdmCsvParser = function($q, sdmD3Service){
        return function(fileURL, mimetype) {
            var d = $q.defer();
            sdmD3Service.init().then(function(d3){

                d3.text(fileURL, mimetype, function(csvTxt){
                    if (mimetype === 'text/tab-separated-values') {
                        var data = d3.tsv.parseRows(csvTxt);
                        d.resolve(data);
                     } else if (mimetype === 'text/csv') {
                        var data = d3.csv.parseRows(csvTxt);
                        d.resolve(data);
                    } else {
                        d.reject();
                    }

                });
            });
            return d.promise;
        }
    }

    sdmCsvParser.$inject = ['$q', 'sdmD3Service'];

    angular.module('sdm.csvViewer.services.sdmCsvParser', ['sdm.services'])
        .factory('sdmCsvParser', sdmCsvParser);
})()
