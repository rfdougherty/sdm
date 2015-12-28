'use strict';
(function(){
    var isBoxExpanded = true;
    var showSearchResults = false;
    var SdmSearchBoxController = function(makeAPICall, sdmViewManager) {
        var _this = this;
        _this.parameters = sdmViewManager.getSearchParameters();
        _this.isBoxExpanded = isBoxExpanded;
        _this.showSearchResults = showSearchResults;
        _this.toggleBox = function(){
            _this.isBoxExpanded = isBoxExpanded = !_this.isBoxExpanded;
            //angular.element('#sdm-table-root.sdm-table-search').toggleClass('hidden-box');
            //angular.element('.sdm-buttons.sdm-search').toggleClass('hidden-box');
        }
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
            // using jquery to add a small effect
            var refreshButton = angular.element('#sdm-search-button');
            refreshButton.addClass('blinking');
            sdmViewManager.searchAcquisitions(params).then(function(){
                refreshButton.removeClass('blinking');
                //_this.toggleBox();
            });
            _this.showSearchResults = showSearchResults = true;
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
                _this.selectScanTypeDefault = 'Select';
            }
        }
        _this.changeScanTypeDefault();

        _this.changeSexDefault = function() {
            if (_this.parameters.sex) {
                _this.sexDefault = '';
            } else {
                _this.sexDefault = 'Select';
            }
        }

        _this.changeSexDefault();

        _this.projectNames = [];
        makeAPICall.async(BASE_URL + 'projects').then(function(response){
            _this.projectNames = response.map(function(proj){
                return proj.name;
            });
        });

        _this.groupNames = [];
        makeAPICall.async(BASE_URL + 'groups').then(function(response){
            _this.groups = response
        });

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
