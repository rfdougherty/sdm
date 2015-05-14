'use strict';

(function(){

    var SdmMD5 = function($q) {
        var worker = new Worker('utils/md5-worker.js');
        var deferreds = {};
        var key = 0;
        worker.onmessage = function(e){
            console.log(e);
            if (typeof e.data.error !== 'undefined'){
                deferreds[e.data.key].reject(e.data.error);
            } else if (typeof e.data.progress !== 'undefined'){
                deferreds[e.data.key].notify(Math.floor(e.data.progress));
            } else {
                deferreds[e.data.key].resolve(e.data.hash);
                delete deferreds[e.data.key];
            }
        }
        var SdmMD5 = function(file) {
            var deferred = $q.defer();
            this.key = key;
            deferreds[key] = deferred;
            worker.postMessage({key:key++, file:file});
            var self = this;
            this.promise = deferred.promise.then(function(value){
                delete deferreds[self.key]
                return value;
            });
        }
        SdmMD5.prototype.abort = function() {
            worker.postMessage({key: this.key, abort:true});
        }
        return SdmMD5;
    }
    SdmMD5.$inject = ['$q'];

    angular.module('sdm.upload.services.SdmMD5', [])
        .factory('SdmMD5', SdmMD5);
})();
