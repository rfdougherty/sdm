// Declare app level module which depends on filters, and services
var sdmApp = angular.module('sdm', [
    'ngRoute',
    'ngSanitize',
    'sdm.authentication',
    'sdm.buttons',
    'sdm.services',
    'sdm.directives',
    'sdm.navigation',
    'sdm.dataFiltering',
    'sdm.popovers',
    'sdm.userPreferences',
    'sdm.createCollection',
    'sdm.APIServices',
    'sdm.dataVisualizations',
    'sdm.infoModal',
    'sdm.download',
    'sdm.admin',
    'sdm.moveSessions',
    'sdm.newProject',
    'sdm.upload',
    'sdm.util',
    'sdm.search',
    'sdm.uploadDicom',
    'sdm.removeCollection',
    'sdm.brainbrowser',
    'sdm.csvViewer',
    'ui.bootstrap'
]).run(['sdmViewManager', 'sdmUserManager',
    function(sdmViewManager, sdmUserManager){
        var userData = sdmUserManager.getAuthData();
        sdmViewManager.updateViewAppearance(userData.preferences);
        sdmViewManager.initialize();
    }]);

var COMING_SOON = '<div id="tree-view">Coming Soon!!!</div>';

sdmApp.config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/projects',
        {
            templateUrl: 'components/main/main.html',
            controller: 'SdmTableViewData',
            controllerAs: 'sdmTableViewData'
        }
    );
    $routeProvider.when('/collections',
        {
            templateUrl: 'components/main/collections.html',
            controller: 'SdmTableViewData',
            controllerAs: 'sdmTableViewData'
        }
    );
    $routeProvider.when('/search',
        {
            templateUrl: 'components/search/search.html',
            controller: 'SdmTableViewData',
            controllerAs: 'sdmTableViewData'
        });
    $routeProvider.when('/upload', {templateUrl: 'components/uploadDicom/uploadDicom.html'});
    $routeProvider.otherwise({redirectTo: '/projects'});
}]);

var GRAVATAR_IMG_URL = 'https://www.gravatar.com/avatar';
var SAVE = 'Save';
var CLOSE = 'Close';
var OK = 'Ok';
var SDM_KEY_CACHED_ACCESS_DATA = "SDM_KEY_CACHED_ACCESS_DATA";
var UNDEFINED_PLACEHOLDER = '(undefined)';
var papayaParams = [];
papayaParams.expandable = "true";

BrainBrowser.config.set("worker_dir", "utils/bb/workers/");

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
    this.attachment_count = data.attachment_count;
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
    this.notes = data.notes;
    if (level.name.search(/projects|collections|sessions|acquisitions/) === 0){
        this.userHasPermissions = !!(data.permissions&&data.permissions.length);
        if (data.permissions) {
            if (!data.permissions.length) {
                if (data.public) {
                    this.userAccess = 'ro';
                } else {
                    this.userAccess = 'no';
                }
            } else if (data.permissions.length > 1) {
                this.userAccess = 'admin';
            } else {
                this.userAccess = data.permissions[0].access;
            }
        } else if (data.public) {
            this.userAccess = 'ro';
        } else {
            this.userAccess = 'no';
        }

        this.defaultView = false;
    } else {
        this.userHasPermissions = true;
        this.userAccess = 'no';
        this.defaultView = true;
    }
}



var substringMatcher = function(elements, field, elementsPromise) {
    var passElements = function(elements, q, callback) {
        var matches = [];
        var substrRegex = new RegExp(q, 'i');
        $.each(elements, function(i, element) {
            if (substrRegex.test(element[field])) {
                matches.push({ value: element[field], element: element});
            }
        });
        callback(matches);
    }

    return function findMatches(q, cb, acb) {
        passElements(elements||[], q, cb);
        if (elementsPromise) {
            elementsPromise.then(function(elements){
                passElements(elements, q, acb);
            });
        }
    };
};

var ageConverter = function(seconds) {
    if (typeof seconds === 'undefined'){
        return '';
    }
    var hours = seconds/3600;
    var days = hours/24;
    var months = days/30;
    if (months < 1) return parseInt(days) + ' days';
    var years = days/365;
    if (years < 1) return parseInt(months) + ' months';
    return parseInt(years) + ' years';
}
