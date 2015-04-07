'use strict';
var _date;
(function(){

    var SdmSearchBoxController = function(makeAPICall, sdmViewManager) {
        var _this = this;
        _this.parameters = sdmViewManager.getSearchParameters();

        _this.search = function() {
            var params = {};
            angular.forEach(_this.parameters, function(p, k){
                if (p instanceof Date && !isNaN(p.valueOf())) {
                    var dd = p.getDate();
                    if (dd < 10) dd = '0' + dd;
                    var mm = p.getMonth() + 1;
                    if (mm < 10) mm = '0' + mm;
                    var yyyy = p.getFullYear();
                    params[k] = [yyyy, mm, dd].join('-');
                } else if (typeof p !== 'undefined' && p !== null) {
                    if (k === 'subj_age_max' || k ==='subj_age_min'){
                        params[k] = p * 31536000;//31536000 = 365*24*3600 number of seconds in a year
                    } else if (k === 'scan_type') {
                        params[k] = _this.scanTypeValues[p];
                    } else if (typeof p !== 'string' || p.length > 0){
                        params[k] = p;
                    }
                }
            });
            var refreshButton = angular.element('#sdm-refresh-button');
            refreshButton.addClass('loading');
            sdmViewManager.searchAcquisitions(params).then(function(){
                refreshButton.removeClass('loading');
            });
        }
        _this.isEmpty = function() {
            for (var prop in _this.parameters){
                if (_this.parameters.hasOwnProperty(prop) && (_this.parameters[prop] || _this.parameters[prop] === 0)) {
                    return false;
                }
            }
            return true;
        }
        _this.clear = function() {
            angular.forEach(_this.parameters, function(p, key){
                _this.parameters[key] = null;
            });
        }
        //_this.selectScanTypeDefault = 'Enter scan type';

        _this.changeScanTypeDefault = function() {
            console.log(_this.parameters.scan_type);
            if (_this.parameters.scan_type || _this.parameters.scan_type === 0) {
                _this.selectScanTypeDefault = '';
            } else {
                _this.selectScanTypeDefault = 'Enter scan type';
            }
        }
        _this.changeScanTypeDefault();

        _this.scanTypeValues = [];
        makeAPICall.async(BASE_URL + 'search').then(function(response){
            _this.scanTypeValues = response.properties.scan_type.enum;
        });
    };

    SdmSearchBoxController.$inject = ['makeAPICall', 'sdmViewManager'];

    angular.module('sdm.search.controllers.sdmSearchBoxController',
        ['sdm.services', 'sdm.main.services.sdmViewManager'])
        .controller('SdmSearchBoxController', SdmSearchBoxController);


})();