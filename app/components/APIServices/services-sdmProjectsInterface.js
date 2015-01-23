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
            },
            urlToExpand: function (node){
                console.log('site', node);
                return {
                    path: 'sites'
                }
            }
        };

        var sites = {
            name: 'sites',
            next_level: 'groups',
            properties: {
                name: objectAccessor('name')
            },
            headers: ['Site'],
            urlToExpand: function (node){
                return {
                    path: 'projects/groups'
                }
            }
        };

        var groups = {
            name: 'groups',
            next_level: 'projects',
            properties: {
                name: function(node){
                    return node.name || node._id
                }
            },
            headers: ['Group'],
            urlToExpand: function (node) {
                return {
                    path: 'projects',
                    params: {group: node.id}
                }
            }
        };

        var projects = {
            name: 'projects',
            next_level: 'sessions',
            properties: {
                name: objectAccessor('name')
            },
            headers: ['Project'],
            urlToExpand: function (node) {
                return {
                    path: 'projects/' + node.id + '/sessions'
                }
            }
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
            headers: ['Session', 'Subject'],
            urlToExpand: function (node) {
                return {
                    path: 'sessions/' + node.id + '/acquisitions'
                }
            }
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
            headers: ['Acquisition', 'Description', 'Data Type'],
            urlToExpand: function (node) {
                return;
            }
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
                                    getChildrenFromAPI(siteNode, $q.defer()).then(
                                        function(children){
                                            children.forEach(function (child) {
                                                child.checked = siteNode.checked;
                                            });
                                            siteNode.children = children;
                                            siteNode._children = null;
                                            siteNode.hasData = siteNode.children&&siteNode.children.length?true:false;
                                            deferredSite.resolve(siteNode);
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
        };



        var breadthFirstAsync = function (tree, getChildren) {
            var queue = [{node: tree}];
            function next() {
                var nextDeferred = $q.defer();
                var nodeOrPromise = queue.pop();
                console.log('nodeOrpromise', nodeOrPromise);
                if (typeof nodeOrPromise === 'undefined') {
                    return;
                }
                if (nodeOrPromise.node) {
                    queue.unshift(
                        {
                            promise: getChildren(nodeOrPromise.node),
                            checked: nodeOrPromise.node.checked,
                            parent: nodeOrPromise.node
                        }
                    );
                    nextDeferred.resolve(nodeOrPromise.node);
                } else if (nodeOrPromise.promise) {
                    nodeOrPromise.promise.then(function(children){
                        console.log('children', children);
                        if (children && children.length) {
                            children.forEach(function(child, i){
                                child.checked = child.checked || nodeOrPromise.checked;
                                child.parent = nodeOrPromise.parent;
                                if (i !== 0) {
                                    queue.unshift({node: child});
                                }
                            });
                            queue.unshift({
                                promise: getChildren(children[0]),
                                checked: children[0].checked,
                                parent: children[0]
                            });
                            nextDeferred.resolve(children[0]);
                        } else {
                            nextDeferred.resolve();
                        }
                    });
                } else {
                    nextDeferred.reject('Error in breadthFirstAsync');
                    throw 'Error in breadthFirstAsync';
                }
                return nextDeferred.promise;
            }
            return {
                next: next
            }
        };

        var breadthFirstFull = function(tree) {
            return breadthFirstAsync(tree, getAllChildren);
        };

        var breadthFirstRefresh = function(tree) {
            return breadthFirstAsync(tree, refreshChildren);
        };

        var getAllChildren= function (node) {
            var deferred = $q.defer();
            var children = node.children&&node.children.length?node.children:node._children;
            if (children && children.length) {
                deferred.resolve(children);
                return deferred.promise;
            } else {
                return getChildrenFromAPI(node, deferred);
            }
        };

            var refreshChildren = function (node) {
                console.log(node);
                var isCheckedOrIndeterminate = node.childrenChecked + node.childrenIndeterminate > 0
                node.childrenIndeterminate = 0;
                node.childrenChecked  = 0;
                var deferred = $q.defer();

                if (node.level.name === 'acquisitions'){
                    console.log('no children', node);
                    deferred.resolve();
                    return deferred.promise;
                }

                if (node.children) {
                    console.log('node.children', node);
                    var promise = getChildrenFromAPI(node, deferred);
                    promise.then(function(children){
                        console.log(children);
                        updateChildrenList(node.children, children);
                        node.children = children;
                        node._children = null;
                        node.childrenChecked = node.checked?children.length:0;
                        node.hasData = !!children.length;
                        return children;
                    });
                    return promise;
                } else if (node._children && !isCheckedOrIndeterminate) {
                    console.log('reset', node);
                    node._children = null;
                    deferred.resolve();
                    return deferred.promise;
                } else if (node._children) {
                    console.log(node);
                    promise = getChildrenFromAPI(node, deferred);
                    promise.then(function(children){
                        updateChildrenList(node._children, children);
                        console.log(children);
                        node._children = children;
                        node.children = null;
                        node.childrenChecked = node.checked?children.length:0;
                        return children;
                    });
                    return promise;
                } else if (!node.hasData) {
                    var promise = getChildrenFromAPI(node, deferred);
                    promise.then(function(children){
                        console.log('node no data', children);
                        if (node.children) {
                            updateChildrenList(node.children, children);
                        }
                        node.children = children;
                        node._children = null;
                        node.childrenChecked = node.checked?children.length:0;
                        node.hasData = !!children.length;
                        return children;
                    });
                    return promise;
                } else {
                    console.log('no children', node);
                    deferred.resolve();
                    return deferred.promise;
                }
            };

        /**
         ** modify newList children adding them from existing nodes in oldList
         **/
        var updateChildrenList = function(oldList, newList) {
            var i = 0;
            var j = 0;
            console.log(oldList, newList);
            while (true) {
                if (i >= oldList.length || j >= newList.length) {
                    return;
                }
                console.log ('ij', i, j);
                var greaterThan = naturalSortByName(oldList[i], newList[j]);
                if (greaterThan === 0) {
                    console.log(oldList[i], newList[j]);
                    if (!oldList[i].id || oldList[i].id === newList[j].id) {
                        newList[j].children = oldList[i].children;
                        newList[j]._children = oldList[i]._children;
                        newList[j].checked = oldList[i].checked;
                        newList[j].hasData = oldList[i].hasData;
                        newList[j].childrenChecked = oldList[i].childrenChecked;
                        newList[j].childrenIndeterminate = oldList[i].childrenIndeterminate;
                    }
                    i++;
                    j++;
                } else if (greaterThan < 0) {
                    i++;
                } else {
                    j++;
                }
            }
        };

        var getChildrenFromAPI = function(node, deferred) {
            if (typeof node.level.next_level === 'undefined'){
                deferred.resolve();
                return deferred.promise;
            }
            var urlToExpand = node.level.urlToExpand(node);

            urlToExpand.params = urlToExpand.params || {};
            urlToExpand.params.site = node.site;

            var promise = makeAPICall.async(BASE_URL + urlToExpand.path, urlToExpand.params);

            promise.then(
                function(result){
                    if (!result.length) {
                        deferred.resolve(result);
                        return;
                    }
                    var _children = result.map(
                        function(childData){
                            return new DataNode(
                                childData,
                                node.site,
                                levelDescription[node.level.next_level]
                                )
                        });
                    _children.sort(naturalSortByName);
                    _children.forEach(function (child, i) {
                        child.index = i;
                    });
                    deferred.resolve(_children);
                }, function(reason){
                    console.log(reason);
                    deferred.reject(reason);
                });
            return deferred.promise;

        };


        var expandNode = function(node) {
            var deferred = $q.defer();
            var newNode = angular.copy(node);
            node.parent.children[node.index] = newNode;
            node = newNode;
            if (node.key) node.key++;
            if (node.children) {
                node._children = node.children;
                node.children = null;
                deferred.resolve();
                return deferred.promise;
            } else if (node._children){
                node.children = node._children;
                node._children = null;
                deferred.resolve();
                return deferred.promise
            } else {
                var promise = getChildrenFromAPI(node, deferred);
                promise.then(function(children){
                    children.forEach(function (child) {
                        child.checked = node.checked;
                    });
                    node.childrenChecked = node.checked?children.length:0;
                    node.childrenIndeterminate = 0;
                    node.children = children;
                    node._children = null;
                    node.hasData = node.children&&node.children.length?true:false;
                });
                return promise;
            }
        };

        var headers = function () {
            console.log('headers called');

            return levelDescription;
        };

        return {
            treeInit: treeInit,
            expandNode: expandNode,
            headers: headers,
            breadthFirstRefresh: breadthFirstRefresh
        };
    }

    sdmProjectsInterface.$inject = ['$q', 'makeAPICall'];

    angular.module('sdm.APIServices.services.sdmProjectsInterface',
        ['sdm.services'])
        .factory('sdmProjectsInterface', sdmProjectsInterface );



})();
