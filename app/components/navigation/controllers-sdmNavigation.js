'use strict';

(function(){

    var SdmNavigationController = function($location, sdmViewManager){
        this.tabs = [
            {
                'path': '/projects',
                'title': 'Projects'
            },
            {
                'path': '/collections',
                'title': 'Collections'
            },
            {
                'path': '/search',
                'title': 'Search'
            },
            {
                'path': '/upload',
                'title': 'Upload'
            }
        ];

        this.isActiveTab = function(tab) {
            var length = tab.path.length;
            return tab.path === $location.path().substring(0, length);
        };

        this.refreshView = function($event) {
            var element = angular.element($event.currentTarget);
            console.log(element);
            element.addClass('loading');
            sdmViewManager.refreshView().then(function(){
                element.removeClass('loading');
            });
        };

    };

    SdmNavigationController.$inject = ['$location', 'sdmViewManager'];

    angular.module('sdm.navigation.controllers.sdmNavigation', ['sdm.main.services.sdmViewManager'])
        .controller('SdmNavigationController', SdmNavigationController);


})();
