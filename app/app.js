// Declare app level module which depends on filters, and services
var sdmApp = angular.module('sdm', [
    'ngRoute',
    'sdm.authentication',
    'sdm.treeViews',
    'sdm.buttons',
    'sdm.services',
    'sdm.navigation',
    'sdm.dataFiltering'
]);

var COMING_SOON = '<div id="tree-view">Coming Soon!!!</div>';

sdmApp.config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/table-view', {templateUrl: 'components/treeViews/table.html'});
    $routeProvider.when('/tree-view', {templateUrl: 'components/treeViews/tree.html'});
    $routeProvider.when('/projects', {templateUrl: 'components/main/main.html'});
    $routeProvider.when('/collections', {'template': COMING_SOON});
    $routeProvider.when('/search', {'template': COMING_SOON});
    $routeProvider.when('/upload', {'template': COMING_SOON});
    $routeProvider.otherwise({redirectTo: '/projects'});
}]);

var GRAVATAR_IMG_URL = 'https://www.gravatar.com/avatar/';
var CLIENT_ID = '272442376012-isksnpojf1qra8mjoctkaigvoti6aang.apps.googleusercontent.com';
var SAVE = 'Save';
var CLOSE = 'Close';
var OK = 'Ok';
var SDM_KEY_CACHED_ACCESS_DATA = "SDM_KEY_CACHED_ACCESS_DATA";
var UNDEFINED_PLACEHOLDER = 'undefined';
