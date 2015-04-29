'use strict';

(function(){

    var sdmLevelDescriptions = function(){
        var updater = function(fields) {
            var _fields = fields.split('.');
            return function(o, value) {
                var _o = o;
                for (var i = 0; i < _fields.length - 1; i++) {
                    o[_fields[i]] = o[_fields[i]]||{}
                    _o = o[_fields[i]];
                }
                _o[_fields[_fields.length - 1]] = value;
            }
        };

        var objectAccessor = function (field) {
            return function (o){
                return o[field];
            }
        };

        var projectsViewDescription = (function(){
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
                editables: {
                    Name: {
                        type: 'text',
                        update: updater('name')
                    }
                },
                headers: ['Project'],
                urlToExpand: function (node) {
                    return {
                        path: 'projects/' + node.id + '/sessions'
                    }
                },
                getModalData: function (node, apiData) {
                    return [
                        {
                            key: 'Name',
                            value: node.name
                        },
                        {
                            key: 'Group',
                            value: node.parent.name
                        }
                    ]
                }
            };

            var sessions = {
                name: 'sessions',
                next_level: 'acquisitions',
                properties: {
                    name: objectAccessor(['label']),
                    subject:
                        function(o){
                            if (!o.subject) {
                                return '';
                            }
                            return o.subject.code;
                        }
                },
                editables: {
                    Subject: {
                        type: 'text',
                        update: updater('subject.code')
                    }
                },
                headers: ['Session', 'Subject'],
                urlToExpand: function (node) {
                    return {
                        path: 'sessions/' + node.id + '/acquisitions'
                    }
                },
                getModalData: function (node, apiData) {
                    return [
                        {
                            key: 'Name',
                            value: node.name
                        },
                        {
                            key: 'Subject',
                            value: node.subject
                        }
                    ]
                }
            };


            var acquisitions = {
                name: 'acquisitions',
                properties: {
                    name: objectAccessor('label'),
                    description: objectAccessor('description'),
                    'data type': function (o){
                        if (!o.types) {
                            return '';
                        }
                        return o.types.map(function(d){
                            return d.kind
                        }).join(', ');
                    }
                },
                editables: {
                    Description: {
                        type: 'text',
                        update: updater('description')
                    }
                },
                headers: ['Acquisition', 'Description', 'Data Type'],
                urlToExpand: function (node) {
                    return;
                },
                getModalData: function (node, apiData) {
                    return [
                        {
                            key: 'Name',
                            value: node.name
                        },
                        {
                            key: 'Description',
                            value: node.description
                        },
                        {
                            key: 'Data Type',
                            value: node['data type']
                        }
                    ]
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

        var collectionsViewDescription = (function(){

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
                next_level: 'curators',
                properties: {
                    name: objectAccessor('name')
                },
                headers: ['Site'],
                urlToExpand: function (node){
                    return {
                        path: 'collections/curators'
                    }
                }
            };

            var curators = {
                name: 'curators',
                next_level: 'collections',
                properties: {
                    name: function (curator) {
                        if (curator.firstname || curator.lastname) {
                            return (curator.firstname + ' ' + curator.lastname).trim();
                        } else {
                            return curator._id || 'anonymous';
                        }
                    }
                },
                headers: ['Curator'],
                urlToExpand: function (node){
                    console.log('curator', node);
                    return {
                        path: 'collections',
                        params: {curator: node.id}
                    }
                }
            };

            var collections = {
                name: 'collections',
                next_level: 'sessions',
                properties: {
                    name: objectAccessor('name')
                },
                headers: ['Collection'],
                urlToExpand: function (node) {
                    return {
                        path: 'collections/' + node.id + '/sessions'
                    }
                },
                editables: {
                    'Name': {
                        type: 'text',
                        update: updater('name')
                    }
                },
                getModalData: function (node, apiData) {
                    return [
                        {
                            key: 'Name',
                            value: node.name
                        },
                        {
                            key: 'Curator',
                            value: node.parent.name
                        }
                    ]
                }
            };

            var sessions = {
                name: 'sessions',
                next_level: 'acquisitions',
                properties: {
                    name: objectAccessor(['label']),
                    subject:
                        function(o){
                            if (!o.subject) {
                                return '';
                            }
                            return o.subject.code;
                        }
                },
                editables: {
                    Subject: {
                        type: 'text',
                        update: updater('subject.code')
                    }
                },
                headers: ['Session', 'Subject'],
                urlToExpand: function (node){
                    return {
                        path: 'collections/' + node.parent.id + '/acquisitions',
                        params: {session: node.id}
                    }
                },
                getModalData: function (node, apiData) {
                    return [
                        {
                            key: 'Name',
                            value: node.name
                        },
                        {
                            key: 'Subject',
                            value: node.subject
                        }
                    ]
                }
            };

            var acquisitions = {
                name: 'acquisitions',
                properties: {
                    name: objectAccessor('label'),
                    description: objectAccessor('description'),
                    'data type': function (o){
                        if (!o.types) {
                            return '';
                        }
                        return o.types.map(function(d){
                            return d.kind
                        }).join(', ');
                    }
                },
                editables: {
                    Description: {
                        type: 'text',
                        update: updater('description')
                    }
                },
                headers: ['Acquisition', 'Description', 'Data Type'],
                urlToExpand: function (node){
                    return;
                },
                getModalData: function (node, apiData) {
                    return [
                        {
                            key: 'Name',
                            value: node.name
                        },
                        {
                            key: 'Description',
                            value: node.description
                        },
                        {
                            key: 'Data Type',
                            value: node['data type']
                        }
                    ]
                }
            }

            return {
                roots: roots,
                sites: sites,
                curators: curators,
                collections: collections,
                sessions: sessions,
                acquisitions: acquisitions
            }
        })();

        var searchViewDescription = angular.copy(projectsViewDescription);
        angular.forEach(searchViewDescription, function(levelDescription){
            delete levelDescription.urlToExpand;
        });

        var adminViewDescription = (function(){

            var roots = {
                name: 'roots',
                next_level: 'groups',
                properties: {
                }
            };

            var groups = {
                name: 'groups',
                next_level: 'users',
                properties: {
                    name: objectAccessor('name')
                },
                headers: ['Group']
            };

            var users = {
                name: 'users',
                properties: {
                    name: function(o){
                        return o.firstname + ' ' + o.lastname;
                    },
                    userId: objectAccessor('_id'),
                    admin: objectAccessor('wheel')
                },
                headers: ['User', 'User Id', 'Admin']
            }

            return {
                roots: roots,
                groups: groups,
                users: users
            }
        })();

        return {
            projects: projectsViewDescription,
            collections: collectionsViewDescription,
            search: searchViewDescription,
            admin: adminViewDescription
        }
    }

    angular.module('sdm.main.services.sdmLevelDescriptions',
        [])
        .factory('sdmLevelDescriptions', sdmLevelDescriptions);

})();
