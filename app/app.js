// Declare app level module which depends on filters, and services
var sdmApp = angular.module('sdm', [
    'ngRoute',
    'sdm.authentication',
    'sdm.projectsViews',
    'sdm.collectionsViews',
    'sdm.buttons',
    'sdm.services',
    'sdm.navigation',
    'sdm.dataFiltering',
    'sdm.popovers',
    'sdm.userPreferences',
    'sdm.createCollection',
    'sdm.APIServices',
    'sdm.dataVisualizations',
    'sdm.infoToolbar'
]);

var COMING_SOON = '<div id="tree-view">Coming Soon!!!</div>';

sdmApp.config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/table-view', {templateUrl: 'components/projectsViews/table.html'});
    $routeProvider.when('/tree-view', {templateUrl: 'components/projectsViews/tree.html'});
    $routeProvider.when('/projects',
        {
            templateUrl: 'components/main/main.html',
            controller: 'SdmProjectsViewData',
            controllerAs: 'sdmProjectsViewData'
        }
    );
    $routeProvider.when('/collections',
        {
            templateUrl: 'components/main/collections.html',
            controller: 'SdmCollectionsViewData',
            controllerAs: 'sdmCollectionsViewData'
        }
    );
    $routeProvider.when('/search', {'template': COMING_SOON});
    $routeProvider.when('/upload', {'template': COMING_SOON});
    $routeProvider.otherwise({redirectTo: '/projects'});
}]);

var GRAVATAR_IMG_URL = 'https://www.gravatar.com/avatar/';
var CLIENT_ID = '1052740023071-ilsnog03s885vmjeb9l9ppsplsadnfa1.apps.googleusercontent.com';
var SAVE = 'Save';
var CLOSE = 'Close';
var OK = 'Ok';
var SDM_KEY_CACHED_ACCESS_DATA = "SDM_KEY_CACHED_ACCESS_DATA";
var UNDEFINED_PLACEHOLDER = 'undefined';



var naturalSortByName = function(a, b){
    if (typeof a.name === 'undefined') {
        return +1;
    }
    if (typeof b.name === 'undefined') {
        return -1;
    }
    function chunkify(t) {
        var tz = new Array();
        var x = 0, y = -1, n = 0, i, j;

        while (i = (j = t.charAt(x++)).charCodeAt(0)) {
            var m = ((i >=48 && i <= 57));
            if (m !== n) {
                tz[++y] = "";
                n = m;
            }
            tz[y] += j;
        }
        return tz;
    }

    var aa = chunkify(a.name.toLowerCase());
    var bb = chunkify(b.name.toLowerCase());

    for (var x = 0; aa[x] && bb[x]; x++) {
        if (aa[x] !== bb[x]) {
            var c = Number(aa[x]), d = Number(bb[x]);
            if (c == aa[x] && d == bb[x]) {
                return c - d;
            } else return (aa[x] > bb[x]) ? 1 : -1;
        }
    }
    return aa.length - bb.length;
};

var DataNode = function(data, site, level, children) {
    this.level = level;
    this.site = site;
    this.id = data && data._id ?data._id: null;
    if (level) {
        angular.forEach(
            level.properties,
            function(accessor, property) {
                this[property] = accessor(data);
            },
            this
        );
    }
    this.children = children?children:undefined;
    this.isLeaf = true;//by default each node is a leaf
    this.hasData = true;
    this.childrenChecked = 0;
    this.childrenIndeterminate = 0;
    this.checked = false;
    this.indeterminate = false;
}
