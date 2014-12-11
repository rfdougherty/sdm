'use strict';

(function(){

    var idDataNode = 0;
    var DataNode = function(data, site, level, children) {
        this.level = level;
        this.site = site;
        this.uniqueId = idDataNode++;
        this.id = data && data._id ?data._id.$oid : null;
        if (level) {
            angular.forEach(
                level.properties,
                function(accessor, property) {
                    this[property] = accessor(data);
                    //console.log(this.level.name, property, this[property]);
                },
                this
            );
        }
        this.children = children?children:[];
        this.isLeaf = true;//by default each node is a leaf
        this.hasData = true;
    }


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
                name: objectAccessor('group_name')
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

    var sdmAPIAdapter = function($q, makeAPICall) {
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
                                    makeAPICall.async(projects_url, site._id).then(
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
                    makeAPICall.async(projects_url, node.site).then(
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
                var promise = makeAPICall.async(url, node.site);
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
                        });
                        deferred.resolve();
                    }, function(reason){
                        console.log(reason);
                        deferred.reject(reason);
                    });
            }
            return deferred.promise;
        }


        var headers = function(){
            console.log('headers called');

            return levelDescription;
        }

        return {
            treeInit: treeInit,
            expandNode: expandNode,
            headers: headers
        };
    }

    sdmAPIAdapter.$inject = ['$q', 'makeAPICall'];

    angular.module('sdm.treeViews.services.sdmAPIAdapter',
        ['sdm.services'])
        .factory('sdmAPIAdapter', sdmAPIAdapter);

    function _get_tree_init_structure(projects, siteId) {
        var groups = {};
        console.log('tree init site: ', siteId);

        projects.forEach(function(project){
            //console.log('project', project);
            var group = project.group;
            var group_name = project.group_name || group;

            if (!groups.hasOwnProperty(group)){
                groups[group] = new DataNode(
                    {
                        group_name: group_name,
                        group: group
                    },
                    siteId,
                    levelDescription['groups']
                );
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
        console.log(group_list);



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

        return group_list;
    }

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

})();
