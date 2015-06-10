'use strict';

(function(){
    var SdmD3Interface = function(
            $rootScope, $compile, sdmFilterTree,
            sdmViewManager, sdmDataManager,
            sdmTextWidthCalculator, sdmUserManager, sdmUsers
        ) {

        var calculateTextWidth = sdmTextWidthCalculator;

        var actions = {
            expandNode: function(node){
                sdmDataManager.expandNode(node)
                    .then(function(newNode){
                        sdmViewManager.triggerViewChange(newNode);
                    });
            },
            getLeaves: sdmFilterTree.filter,
            selector: sdmFilterTree.selector
        };

        var sdmCellOnHover = function(data) {
            if (typeof this.parentElement.sdmCellCompiled === 'undefined') {
                console.log('sdmCellOnHover');
                var newScope = $rootScope.$new();
                newScope.data = data;
                $compile(this.parentElement)(newScope);
                this.parentElement.sdmCellCompiled = true;
            }
        };
        var selectAllNodes = function (node) {
            return true;
        };

        var d3;

        var SdmD3Interface = function(rootElement, viewID, colConfig, apply, _d3) {
            d3 = _d3;
            this.rootElement = rootElement;
            this.rowEntered = {leaf: null, element: null, timer: null};
            this.viewID = viewID;
            this.colConfig = colConfig;
            this.headerTitles = sdmDataManager.getHeaderTitles(viewID);
            this.data = {};
            this.trigger = null;
            this.$apply = apply;
        };

        SdmD3Interface.prototype.refresh = function(selector) {
            return this.updateView(this.data, this.trigger, selector);
        };
        var user;
        var sessionKey;

        SdmD3Interface.prototype.updateView = function(data, trigger, selector) {
            var self = this;
            console.log(self);
            user = sdmUserManager.getAuthData();
            sdmFilterTree.setView(self.viewID);
            self.data = data;
            self.trigger = trigger;
            console.log(data);
            sessionKey = trigger.sessionKey?trigger.sessionKey:-1;
            if (selector === true) {
                selector = selectAllNodes;
            }

            var parsedData = actions.getLeaves(data);
            var leaves = parsedData.leaves;
            self.headerTitles.forEach(function(header){
                if (header.showcount) {
                    header.count = parsedData.counts[header.name]||0;
                }
            });

            var rows = d3.select(self.rootElement)
                .selectAll('div.d3row.' + self.viewID)
                .data(leaves, generateLeafKey);

            rows.exit().remove();

            if (selector){
                rows.filter(selector).each(self.updateRow());
            }

            rows.enter()
                .insert('div')
                .classed('row', true)
                .classed('d3row', true)
                .classed(self.viewID, true)
                .on('mouseenter', function (leaf){
                    if (self.rowEntered.leaf) {
                        if (self.rowEntered.leaf === leaf) {
                            return;
                        }
                        self.rowEntered.leaf.fullLine = false;
                        self.updateRow().call(self.rowEntered.element, self.rowEntered.leaf);
                    }
                    leaf.fullLine = true;
                    self.updateRow().call(this, leaf);
                    self.rowEntered.leaf = leaf;
                    self.rowEntered.element = this;
                })
                .each(self.updateRow());

            rows.classed('grey', function(d, i){ return (i + 1)%2;});

            return rows;
        };

        SdmD3Interface.prototype.updateRow = function () {
            var self = this;
            return function(leaf) {
                if (leaf.fullLine) {
                    self.rowEntered.leaf = leaf;
                    self.rowEntered.element = this;
                }
                var dataRow = createDataRow(leaf);

                if (leaf.fullLine) {
                    this.classList.add('full-line');
                } else {
                    this.classList.remove('full-line');
                };

                d3.select(this)
                    .selectAll('span.sdm-cell')
                    .remove();

                var cells = d3.select(this)
                    .selectAll('span.sdm-cell')
                    .data(dataRow);


                var selection = cells.enter()
                    .append('span')
                    .classed('sdm-cell',
                        true);

                self.createCell(selection);
            };
        };

        var users = {}
        sdmUsers.getUsers().then(function(userData){
            users = userData;
        });

        var _parseNote = function(notes) {
            var content;
            if (notes) {
                if (typeof notes === 'string') {
                    content = notes;
                } else {
                    content = notes.map(function(note){
                        var author = users[note.author];
                        if (author) {
                            return author.firstname + ' ' + author.lastname + ': ' + note.text;
                        } else {
                            return note.text;
                        }
                    }).join('<br><br>');
                }
                return content.replace(/https?\:\/\/[^\s]*/g, '<a href="$&" target="_blank">$&</a>');
            }
            return '';
        }

        SdmD3Interface.prototype.createCell = function(selection) {
            var self = this;
            selection.each(function(d){
                d3.keys(d.level.properties).forEach(function(p, i, a){
                    var classed = [d.level.name, p, self.colConfig].join(' ');
                    var d3Element = d3.select(this).append('div')
                        .classed(classed, true);
                    var value = d[p];
                    if (d.show) {
                        if (i === 0 && !d.hideGlyphs){
                            d.indeterminate = !d.checked && d.childrenChecked + d.childrenIndeterminate > 0;
                            d3Element.append('input').attr({
                                    'type': 'checkbox'
                                }).property({
                                    'checked': d.checked||false,
                                    'indeterminate': d.indeterminate
                                }).attr('class', function(d) {
                                    return d.defaultView?'':d.userAccess + '-access';
                                }).on('click', function(d){
                                    actions.selector(d);
                                    self.refresh(selectAllNodes);
                                    self.$apply();
                                }).on('mouseenter', function(d){
                                    if (!d.defaultView) {
                                        checkboxTooltip.attr({
                                            'class': 'd3-tooltip d3-show'
                                        })
                                    }
                                }).on('mouseleave', function(d){
                                    if (!d.defaultView) {
                                        checkboxTooltip.attr({
                                            'class': 'd3-tooltip d3-hide'
                                        })
                                    }
                                });

                            var text = function(access) {
                                if (access === 'rw') {
                                    return 'read-write-access';
                                } else if (access === 'ro') {
                                    return 'read-only-access';
                                } else {
                                    return access + '-access';
                                }
                            };
                            var checkboxTooltip = d3Element.append('div').attr({
                                    'class': 'd3-tooltip d3-hide'
                                }).style('width', function(d){
                                    return calculateTextWidth(text(d.userAccess)) + 6 + 'px';
                                }).style('left', function(d) {
                                    var width = calculateTextWidth(text(d.userAccess)) + 6;
                                    return (8 - width/2) +'px';
                                }).text(function(d){
                                    return text(d.userAccess);
                                });
                        }
                        var d3DivContent = d3Element.append('div')
                            .classed('content', true);
                        var d3Text = d3DivContent
                            .append('span');

                        if (d.level.name.search(/^(sessions|projects|collections|acquisitions)$/) >= 0 && (d.userAccess.search(/^no$/) === -1 || user.root) ){
                            d3Text.attr({
                                'sdm-popover': '',
                                'sdm-popover-class': 'sdm-info-modal',
                                'sdm-popover-template-content': 'components/infoModal/infoModal.html',
                                'sdm-popover-show': 'click',
                                'sdm-popover-show-timeout': '0',
                                'sdm-append-to-body': ''
                            }).on('mouseover', sdmCellOnHover, true);
                        }

                        d3Text
                            .append('span')
                            .classed('text', true)
                            .classed('no-access', function(d) {
                                return d.userAccess === 'no' && !d.defaultView;
                            })
                            .text(value||UNDEFINED_PLACEHOLDER);

                        if (i === a.length - 1 && !d.hideGlyphs){
                            d3Element.append('i').attr('class',
                                function(d){
                                    var icon;
                                    if (d.hasData){
                                        icon = (d&&d.level.next_level&&d.hasData)?
                                            d.children?'fa-chevron-down':'fa-chevron-right'
                                            :'';
                                    } else {
                                        icon = 'fa-ban';
                                    }
                                    return 'fa nav-glyph expander ' + icon;
                                }).on('mouseup', actions.expandNode);
                        }
                        if (i === 0 && d.notes && d.notes.length > 0 && !d.hideGlyphs) {
                            d3DivContent.style({'width':'70%'});
                            // IMPORTANT: data in this tooltip is added to its scope in the sdmCellOnHover function
                            d3Element.append('div').append('span').attr({
                                'class': 'glyphicon nav-glyph expander glyphicon-comment',
                                'sdm-popover': '',
                                'sdm-popover-class': 'sdm-note-tooltip',
                                'sdm-popover-template-text': function(d){return '<div class="notes-tooltip sdm-notes">' + _parseNote(d.notes) + '</div>'},
                                'sdm-popover-dynamic-position': 'false',
                                'sdm-popover-style-width': '250px',
                                'sdm-popover-style-height': '13ex',
                                'sdm-popover-style-top': '8px',
                                'sdm-popover-show': 'mouseenter',
                                'sdm-popover-hide': 'mouseleave',
                                'sdm-popover-show-timeout': '400',
                                'sdm-popover-show-after': '400'
                            }).on('mouseenter', sdmCellOnHover, true);;
                        }
                    }
                }, this);
            });
        };


        var createDataRow = function(leaf){
            leaf.show = true;
            var dataRow = [leaf];
            var node = leaf;
            var addParentNameToRow = true;
            while (node.parent) {
                addParentNameToRow = node.isFirstChild && addParentNameToRow;
                node.parent.hideGlyphs = !addParentNameToRow && leaf.fullLine;
                node.parent.show = addParentNameToRow || leaf.fullLine;
                dataRow.unshift(node.parent);
                node = node.parent;
            }
            return dataRow;
        };

        function _zeroPadding(n, m) {
            var pad = new Array(1 + m).join('0');
            return (pad + n).slice(-pad.length);
        }


        function generateLeafKey(leaf) {
            if (leaf.key) {
                return leaf.key;
            }
            var node = leaf;
            var key = '';
            while (node) {
                key = _zeroPadding(node.index, 4) + key;
                node = node.parent;
            }
            leaf.key = key + sessionKey;
            return leaf.key;
        }

        return SdmD3Interface;
    }

    SdmD3Interface.$inject = [
        '$rootScope', '$compile', 'sdmFilterTree',
        'sdmViewManager', 'sdmDataManager',
        'sdmTextWidthCalculator', 'sdmUserManager', 'sdmUsers'
    ];

    angular.module('sdm.dataVisualizations.services.sdmD3Interface', [
        'sdm.services',
        'sdm.main.services.sdmViewManager',
        'sdm.authentication.services.sdmUserManager',
        'sdm.main.services.sdmDataManager', 'sdm.APIServices.services.sdmUsers'
    ]).factory('SdmD3Interface', SdmD3Interface);
})();
