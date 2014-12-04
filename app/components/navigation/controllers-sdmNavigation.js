'use strict';

(function(){

    var SdmNavigationController = function($scope, $location){
        this.tabs = [
            {
                'glyphicon': 'folder-open',
                'path': '/projects',
                'title': 'Projects'
            },
            {
                'glyphicon': 'briefcase',
                'path': '/collections',
                'title': 'Collections'
            },
            {
                'glyphicon': 'search',
                'path': '/search',
                'title': 'Search'
            },
            {
                'glyphicon': 'upload',
                'path': '/upload',
                'title': 'Upload'
            }
        ];

        this.isActiveTab = function(tab) {
            var length = tab.path.length;
            return tab.path === $location.path().substring(0, length);
        };

    };

    SdmNavigationController.$inject = ['$scope', '$location'];

    angular.module('sdm.navigation.controllers.sdmNavigation', [])
        .controller('SdmNavigationController', SdmNavigationController);


})();