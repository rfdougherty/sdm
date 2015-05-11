'use strict';

angular.module('sdm.dataVisualizations',
    [
        'sdm.dataVisualizations.directives.sdmTableView',
        'sdm.dataVisualizations.directives.sdmTreeView',
        'sdm.dataVisualizations.controllers.sdmTableViewData',
        'sdm.dataVisualizations.services.sdmD3Interface'
    ]);
