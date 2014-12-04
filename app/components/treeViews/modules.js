'use strict';

angular.module('sdm.treeViews',
    [
        'sdm.treeViews.services.sdmAPIAdapter',
        'sdm.treeViews.directives.sdmTableView',
        'sdm.treeViews.directives.sdmTreeView',
        'sdm.treeViews.controllers.sdmViewData'
    ]);
