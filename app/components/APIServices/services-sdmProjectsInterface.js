'use strict';

(function(){


    var levelDescription = (function(){
        function objectAccessor(field){
            return function (o){
                return o[field];
            }
        };

        var roots = {
            name: 'roots',
            next_level: 'sites',
            properties: {
            }
        };

        var sites = {
            name: 'sites',
            next_level: 'groups',
            properties: {
                name: objectAccessor('name')
            },
            headers: ['Site']
        };

        var groups = {
            name: 'groups',
            next_level: 'projects',
            properties: {
                name: objectAccessor('name')
            },
            headers: ['Group']
        };

        var projects = {
            name: 'projects',
            next_level: 'sessions',
            properties: {
                name: objectAccessor('name')
            },
            headers: ['Project']
        };

        var sessions = {
            name: 'sessions',
            next_level: 'acquisitions',
            properties: {
                name: objectAccessor(['label']),
                subject:
                    function(o){
                        return o.subject.code;
                    }
            },
            headers: ['Session', 'Subject']
        };

        var acquisitions = {
            name: 'acquisitions',
            properties: {
                name: objectAccessor('label'),
                description: objectAccessor('description'),
                'data type': function (o){
                    return o.types.map(function(d){
                        return d.kind
                    }).join(', ');
                }
            },
            headers: ['Acquisition', 'Description', 'Data Type']
        }

        return {
            roots: roots,
            sites: sites,
            groups: groups,
            projects: projects,
            sessions: sessions,
            acquisitions: acquisitions
        }
    })();

    function _get_tree_init_structure(projects, siteId) {
        console.log('projects', projects);
        var groups = {};
        console.log('tree init site: ', siteId);

        projects.forEach(function(project){
            //console.log('project', project);
            var group = project.group._id;
            var group_name = project.group.name || group;

            if (!groups.hasOwnProperty(group)){
                groups[group] = new DataNode(
                    {
                        name: group_name,
                        group: group
                    },
                    siteId,
                    levelDescription['groups']
                );
            }
            if (typeof groups[group].children === 'undefined') {
                groups[group].children = [];
            }
            groups[group].children.push(
                new DataNode(
                    project,
                    siteId,
                    levelDescription['projects']
                ));
        });
        var group_list = [];
        for (var group in groups) {
            if (groups.hasOwnProperty(group)) {
                group_list.push(groups[group]);
            }
        };



        function collapse(d, i) {
            d.index = i;
            if (d.children) {
                d.children.sort(naturalSortByName);
            }

            if (d.children && d.children.length) {
                //d.children[0].isFirstChild = true;
                d._children = d.children;
                d._children.forEach(collapse);
                d.children = null;
            }
        }

        group_list.sort(naturalSortByName);

        group_list.forEach(collapse);
        /*
        if (group_list[0]) {
            group_list[0].isFirstChild = true;
        }*/
        console.log('groups', group_list);
        return group_list;
    }

    var sdmProjectsInterface = function($q, makeAPICall) {
        var sites_url = BASE_URL + 'sites';
        var projects_url = BASE_URL + 'projects';

        var treeInit = function() {
            var deferred = $q.defer();
            makeAPICall.async(sites_url).then(
                function(sites){
                    var promises =
                        sites.map(function(site, i){
                                var deferredSite = $q.defer();
                                var siteNode = new DataNode(
                                    site,
                                    site._id,
                                    levelDescription['sites']
                                );

                                if (site.onload) {
                                    makeAPICall.async(projects_url, {site: site._id}).then(
                                        function(projects) {
                                            var groups = _get_tree_init_structure(projects, site._id);
                                            if (!groups.length) {
                                                siteNode.isLeaf = true;
                                                siteNode.hasData = false;
                                            } else {
                                                siteNode.children = groups;
                                            }
                                            deferredSite.resolve(siteNode);
                                        },
                                        function(reason) {
                                            console.log(reason);
                                            deferredSite.reject(reason);
                                        });
                                } else {
                                    siteNode.isLeaf = true;
                                    deferredSite.resolve(siteNode);
                                }
                                return deferredSite.promise
                            });
                    $q.all(promises).then(function(sites){
                        sites.sort(naturalSortByName);
                        sites.forEach(
                            function(site, i){
                                site.index = i;
                            });
                        deferred.resolve(
                            new DataNode(
                                {name: 'root'},
                                null,
                                levelDescription['roots'],
                                sites
                            )
                        );
                    })
                });
            return deferred.promise;
        }

        var expandNode = function(node, triggerChange) {
            var deferred = $q.defer();
            var newNode = angular.copy(node);
            node.parent.children[node.index] = newNode;
            node = newNode;
            if (node.key) node.key++;
            if (node.children) {
                node._children = node.children;
                node.children = null;
                deferred.resolve();
            } else if (node._children){
                node.children = node._children;
                node._children = null;
                deferred.resolve();
            } else {
                if (typeof node.level.next_level === 'undefined'){
                    return;
                }
                if (node.level.name === 'sites'){
                    console.log(node);
                    makeAPICall.async(projects_url, {site: node.site}).then(
                        function(projects) {
                            var groups = _get_tree_init_structure(projects, node.site);
                            node.children = groups;
                            if (groups.length){
                                node.hasData = true;
                            } else {
                                node.hasData = false;
                                console.log('node', node);
                            }
                            deferred.resolve();
                        },
                        function(reason) {
                            console.log(reason);
                            deferred.reject(reason);
                        });
                    return deferred.promise;
                }
                var url = BASE_URL + [node.level.name, node.id, node.level.next_level].join('/');
                var promise = makeAPICall.async(url, {site: node.site});
                promise.then(
                    function(result){
                        if (!result.length) {
                            node.hasData = false;
                            console.log('node', node);
                            deferred.resolve();
                            return;
                        }
                        node.hasData = true;
                        node.children = result.map(
                            function(childData){
                                return new DataNode(
                                    childData,
                                    node.site,
                                    levelDescription[node.level.next_level]
                                    )
                            });
                        node.children.sort(naturalSortByName);
                        node.children.forEach(function(child, i){
                            child.index = i;
                            child.checked = node.checked;
                        });
                        node.childrenChecked = node.checked?node.children.length:0;
                        node.childrenIndeterminate = 0;
                        deferred.resolve();
                    }, function(reason){
                        console.log(reason);
                        deferred.reject(reason);
                    });
            }
            return deferred.promise;
        };

        var headers = function () {
            console.log('headers called');

            return levelDescription;
        };

        return {
            treeInit: treeInit,
            expandNode: expandNode,
            headers: headers
        };
    }

    sdmProjectsInterface.$inject = ['$q', 'makeAPICall'];

    angular.module('sdm.APIServices.services.sdmProjectsInterface',
        ['sdm.services'])
        .factory('sdmProjectsInterface', sdmProjectsInterface );



})();
