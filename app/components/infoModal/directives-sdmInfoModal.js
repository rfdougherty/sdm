'use strict';
var _inputEl;
(function() {
    angular.module('sdm.infoModal.directives.sdmInfoModal',
            ['sdm.services', 'sdm.download.services.sdmDownloadInterface',
             'sdm.authentication.services.sdmUserManager', 'sdm.main.services.sdmViewManager',
             'sdm.APIServices.services.sdmRoles',
             'sdm.APIServices.services.sdmUsers',
             'sdm.popovers.services.sdmPopoverTrampoline',
             'sdm.util.services.sdmHumanReadableSize'])
        .directive('sdmInfoModal', ['$location', '$document', '$q', 'sdmPopoverTrampoline', 'makeAPICall',
            'sdmDownloadInterface', 'sdmUserManager', 'sdmViewManager', 'sdmRoles',
            'sdmUsers', 'sdmHumanReadableSize',
            function($location, $document, $q, sdmPopoverTrampoline, makeAPICall, sdmDownloadInterface,
                sdmUserManager, sdmViewManager, sdmRoles, sdmUsers, sdmHumanReadableSize) {
                var tileViewer = function(nodeId) {
                    makeAPICall.async(BASE_URL + 'acquisitions/' + nodeId + '/tile').then(
                        function(tileInfo) {
                            console.log(tileInfo);
                            var maxZ, minZ;
                            angular.forEach(tileInfo.zoom_levels, function(v, z){
                                if (typeof maxZ === 'undefined') {
                                    maxZ = +z;
                                    minZ = +z;
                                } else {
                                    if (maxZ < +z)
                                        maxZ = +z;
                                    else if (minZ > +z) {
                                        minZ = +z;
                                    }
                                }
                            });

                            var margin = {left: 25, right: 25, bottom: 25, top:25},
                                width = d3.select("div.sdm-d3-map").style('width'),
                                height = d3.select("div.sdm-d3-map").style('height'),
                                prefix = prefixMatch(["webkit", "ms", "Moz", "O"]),
                                rectangle = {},
                                cacheData = {},
                                maxScale = 1 << (maxZ + 8),
                                minScale = 1 << (minZ + 8);

                            maxScale *= 1.414; //rough approximation of sqrt(2)

                            width = +width.substr(0, width.length -2) - margin.left - margin.right;
                            height = +height.substr(0, height.length -2) - margin.top -margin.bottom;



                            var initSize, initTiles, initZ = maxZ + 1;
                            var actualSize = {
                                width: tileInfo.real_size[0],
                                height: tileInfo.real_size[1]
                            };

                            do {
                                initZ--;
                                initTiles = tileInfo.zoom_levels[initZ];
                                initSize = {
                                    width: initTiles[0] * 256,
                                    height: initTiles[1] * 256
                                };
                                while (actualSize.width > initSize.width || actualSize.height > initSize.height) {
                                    actualSize.width /= 2;
                                    actualSize.height /= 2;
                                }
                            } while (actualSize.width > width || actualSize.height > height || initZ === minZ);

                            var initScale = 1 << (initZ + 8);


                            var tile = d3.geo.tile()
                                .size([width, height]);


                            var zoom = d3.behavior.zoom()
                                .center([width/2, height/2])
                                .scale(initScale)
                                .scaleExtent([minScale, maxScale])
                                .translate([
                                    initScale/2 - actualSize.width/2 + width/2 ,
                                    initScale/2 - actualSize.height/2 + height/2
                                ])
                                .on("zoom", zoomed);

                            console.log(minScale);

                            var map = d3.select("div.sdm-d3-map")
                                .style('width', width + 'px')
                                .style('height', height + 'px')
                                .style('margin', '25px')
                                .call(zoom);

                            var layer = map.append("div")
                                .attr("class", "sdm-d3-layer");

                            zoomed();

                            function getUrl(z, x, y) {
                                    var coordinates = [
                                    ['z', z].join('='),
                                    ['x', x].join('='),
                                    ['y', y].join('=')
                                ].join('&');
                                return BASE_URL + 'acquisitions/' + nodeId +
                                       '/tile?' + coordinates;
                            }

                            function getData(z, x, y, timeout) {
                                return makeAPICall.async(getUrl(z, x, y), null, 'GET', null, null, 'arraybuffer', timeout);
                            }

                            function calculateRectangle(tiles){
                                console.log(tiles.translate);
                                if (tiles.translate) {
                                    var minX = Math.floor( - tiles.translate[0]);
                                    var minY = Math.floor(- tiles.translate[1]);
                                    rectangle = {
                                        maxX: minX + 1.5 * width/256 + 1,
                                        maxY: minY + 1.5 * height/256 + 1,
                                        minX: minX,
                                        minY: minY
                                    }
                                }
                                return rectangle
                            }
                            function inRectangle(x, y) {
                                return !(
                                    x > rectangle.maxX || x < rectangle.minX ||
                                    y > rectangle.maxY || y < rectangle.minY
                                )
                            }

                            function zoomed() {
                                console.log(zoom.scale());
                                var tiles = tile
                                    .scale(zoom.scale())
                                    .translate(zoom.translate())
                                    ();
                                calculateRectangle(tiles);
                                var image = layer
                                    .style(prefix + "transform", matrix3d(tiles.scale, tiles.translate))
                                  .selectAll(".sdm-d3-tile")
                                    .data(
                                        tiles.filter(
                                            function(d) {
                                                return inRectangle(d[0], d[1])
                                            }
                                        ),
                                        function (d) { return d; }
                                    );

                                image.exit().remove().each(function(d){
                                    if (d.abort) {
                                        d.abort.resolve();
                                    }
                                });

                                image.enter()
                                    .append("img")
                                    .attr("class", "sdm-d3-tile")
                                    .style("left", function(d) { return (d[0] << 8) + "px"; })
                                    .style("top", function(d) { return (d[1] << 8) + "px"; })
                                    .each(
                                        function(d) {
                                            var _this = this;
                                            d.abort = $q.defer();
                                            var cacheKey = [d[2], d[0], d[1]].join(':');
                                            if (cacheData[cacheKey]) {
                                                _this.setAttribute('src', cacheData[cacheKey]);
                                                return;
                                            }
                                            getData(d[2], d[0], d[1], d.abort.promise).then(
                                                function(buffer) {
                                                    if (buffer instanceof ArrayBuffer) {
                                                        var binary = '';
                                                        var bytes = new Uint8Array( buffer );
                                                        var len = bytes.byteLength;
                                                        for (var i = 0; i < len; i++) {
                                                            binary += String.fromCharCode( bytes[ i ] );
                                                        }
                                                        var base64 = window.btoa( binary );
                                                        cacheData[cacheKey] = 'data:image/png;base64,' + base64;
                                                        _this.setAttribute('src', cacheData[cacheKey] );
                                                    }

                                                }
                                            );
                                        }
                                    );
                            }

                            d3.selectAll("button.sdm-d3-reset")
                                .on("click", reset);

                            function reset() {
                                zoom.scale(initScale).translate([
                                    initScale/2 - actualSize.width/2 + width/2,
                                    initScale/2 - actualSize.height/2 + height/2
                                ]);
                                map.call(zoom.event);
                            }

                            d3.selectAll("button[data-zoom]")
                                .on("click", clicked);

                            function clicked() {
                                var newScale = zoom.scale() * Math.pow(2, +this.getAttribute("data-zoom"));
                                if (newScale > maxScale) {
                                    newScale = maxScale;
                                }
                                if (newScale < minScale) {
                                    newScale = minScale;
                                }
                                map.call(zoom.event); // https://github.com/mbostock/d3/issues/2387

                                // Record the coordinates (in data space) of the center (in screen space).
                                var center0 = zoom.center(), translate0 = zoom.translate(), coordinates0 = coordinates(center0);
                                zoom.scale(newScale);

                                // Translate back to the center.
                                var center1 = point(coordinates0);
                                zoom.translate([translate0[0] + center0[0] - center1[0], translate0[1] + center0[1] - center1[1]]);

                                map.transition().duration(750).call(zoom.event);
                            }

                            function coordinates(point) {
                                var scale = zoom.scale(), translate = zoom.translate();
                                return [(point[0] - translate[0]) / scale, (point[1] - translate[1]) / scale];
                            }

                            function point(coordinates) {
                                var scale = zoom.scale(), translate = zoom.translate();
                                return [coordinates[0] * scale + translate[0], coordinates[1] * scale + translate[1]];
                            }



                            function matrix3d(scale, translate) {
                                var k = scale / 256, r = scale % 1 ? Number : Math.round;
                                return "matrix3d(" + [k, 0, 0, 0, 0, k, 0, 0, 0, 0, 1, 0, r(translate[0] * scale), r(translate[1] * scale), 0, 1 ] + ")";
                            }

                            function prefixMatch(p) {
                                var i = -1, n = p.length, s = document.body.style;
                                while (++i < n) if (p[i] + "Transform" in s) return "-" + p[i].toLowerCase() + "-";
                                return "";
                            }
                        }
                    );
                }

                return {
                    restrict: 'E',
                    scope: false,
                    replace: false, // Replace with the template below
                    transclude: false,// we want to insert custom content inside the directive
                    controller: function(){},
                    controllerAs: 'sdmIMController',
                    link: function($scope, $element, $attrs, sdmIMController) {
                        var node = $scope.$parent.$parent.data;
                        var APIUrl = BASE_URL + node.level.name + '/' + node.id;
                        var level = node.level.name;
                        $scope.node = node;
                        sdmIMController.data = {};
                        var path = [];
                        var n = node;
                        sdmIMController.apiDataNotes = [];
                        sdmIMController.formatSize = sdmHumanReadableSize;
                        while (n.parent){
                            path.unshift(n.parent.level.name==='sessions'?n.parent.name + ' - ' + n.parent.subject:n.parent.name);
                            n = n.parent;
                        }
                        sdmIMController.loadingState = 3;
                        sdmIMController.permissionPlaceholder = 'Enter User ID';
                        sdmRoles().then(function(data){
                            sdmIMController.roles = data;
                            sdmIMController.loadingState--;
                        });
                        var typeaheadElement = $element.find('#info-change-permissions .typeahead');
                        sdmUsers.getUsers().then(function(data){
                            sdmIMController.users = data;
                            typeaheadElement.typeahead({
                                    hint: true,
                                    highlight: true,
                                    minLength: 3
                                },
                                {
                                    name: 'users',
                                    displayKey: 'value',
                                    source: substringMatcher(sdmIMController.users, '_id')
                                }
                            );
                            $element.on('typeahead:autocompleted typeahead:selected', function(event, selectedUID) {
                                console.log('typeahead');
                                sdmIMController.selectedUID = selectedUID.value;
                            });
                            sdmIMController.loadingState--;
                        });
                        var refreshUsers = function() {
                            sdmUsers.getUsers().then(function(data){
                                sdmIMController.users = data;
                                typeaheadElement.typeahead('destroy');
                                typeaheadElement.typeahead({
                                        hint: true,
                                        highlight: true,
                                        minLength: 3
                                    },
                                    {
                                        name: 'users',
                                        displayKey: 'value',
                                        source: substringMatcher(sdmIMController.users, '_id')
                                    }
                                );
                            });
                        };

                        sdmIMController.nodeId = node.id;
                        sdmIMController.tileViewer = function(){
                            tileViewer(sdmIMController.nodeId, $element.width(), $element.height());
                        };
                        sdmIMController.baseUrl = BASE_URL + 'acquisitions/' + node.id + '/file';
                        console.log(path);
                        sdmIMController.path = path.slice(1);
                        sdmIMController.title = level.slice(0, level.length - 1);
                        sdmIMController.name = node.name;
                        sdmIMController.user = sdmUserManager.getAuthData();
                        console.log(sdmIMController.user);
                        sdmIMController.getAttachmentType = function(attachment) {
                            if (attachment.ext){
                                return attachment.ext.slice(1, attachment.length);
                            } else {
                                var nameSplit = attachment.name.split('.');
                                return nameSplit[nameSplit.length - 1];
                            }
                        };
                        var refreshDataInModal = function(){

                            return makeAPICall.async(APIUrl, {site: node.site}).then(
                                function (apiData) {
                                    console.log('apiData', apiData);
                                    sdmIMController.data = node.level.getModalData(node, apiData);
                                    sdmIMController.data.forEach(function(field){
                                        field.originalValue = field.value;
                                    });
                                    sdmIMController.attachments = [];
                                    sdmIMController.files = [];
                                    apiData.files = apiData.files || [];
                                    apiData.files.forEach(function(file){
                                        if (file.flavor === 'data') {
                                            sdmIMController.files.push(file);
                                        } else if (file.flavor === 'attachment'){
                                            sdmIMController.attachments.push(file);
                                        }
                                    });
                                    sdmIMController.editables = node.level.editables ||{};


                                    if (sdmIMController.files.length) {
                                        sdmIMController.expandedAttachments = false;
                                        sdmIMController.expandedFiles = true;
                                    }
                                    sdmIMController.files.sort(function(file, file1){
                                        return file.filetype===file1.filetype?0:file.filetype>file1.filetype?1:-1 });

                                    console.log(apiData.permissions, node.level.name);
                                    if (apiData.permissions) {
                                        apiData.permissions.forEach(function(permission){
                                            if (permission._id === sdmIMController.user.user_uid) {
                                                sdmIMController.userPermission = permission.access;
                                            }
                                        });
                                    }

                                    sdmIMController.isAdmin = sdmIMController.canModify = false;
                                    if (sdmIMController.userPermission) {
                                        console.log(sdmIMController.userPermission);
                                        sdmIMController.isAdmin = sdmIMController.userPermission === 'admin';
                                        sdmIMController.canModify = sdmIMController.userPermission.search(/rw$|admin$/) === 0;
                                    }
                                    if (sdmIMController.user.root) {
                                        sdmIMController.isAdmin = sdmIMController.canModify = true;
                                    }

                                    apiData.permissions =
                                        node.level.name.search(/collections|projects/) === 0 ?
                                            apiData.permissions : null;
                                    sdmIMController.apiData = apiData;
                                    if (sdmIMController.apiData.notes){
                                        sdmUsers.getUsers().then(function(){
                                            sdmIMController.apiDataNotes = sdmIMController.apiData.notes.map(function(note){
                                                var author = sdmIMController.users[note.author];
                                                return {
                                                    author: author.firstname + ' ' + author.lastname,
                                                    text: note.text
                                                }
                                            });
                                        })
                                    }
                                },
                                function(reason){
                                    console.log('rejected request because of', reason);
                                    sdmIMController.dismiss();
                                });
                        }
                        refreshDataInModal().then(function(){
                            sdmIMController.loadingState--;
                            if (
                                    sdmIMController.files.length &&
                                    (
                                        sdmIMController.userPermission === 'admin' || sdmIMController.userPermission === 'rw' ||
                                        sdmIMController.user.root || sdmIMController.userPermission === 'ro'
                                    )
                                ) {
                                sdmIMController.modalView = 'file list';
                            } else {
                                sdmIMController.modalView = 'attachments';
                            }
                        });

                        sdmIMController.download = function(file) {
                            var _node = {
                                level: level,
                                _id: node.id,
                                file: file
                            };
                            sdmDownloadInterface.getDownloadURL(_node, true, false).then(function(response){
                                window.open(response.url + '&attach=true', '_self');
                            });
                        };


                        sdmIMController.dismiss = function ($event) {
                            $scope.$parent.enableEvents();
                            $scope.$parent._hidePopover($event, 0);
                        };

                        sdmIMController.close = function ($event) {
                            var isApiDataChanged = !sdmIMController.data.every(
                                function (field) {
                                    return field.value === field.originalValue;
                                });
                            if (sdmIMController.arePermissionsChanged || isApiDataChanged) {
                                sdmIMController.confirmDismiss = true;
                            } else {
                                $scope.$parent._hidePopover($event, 0);
                            }
                        };
                        sdmIMController.createNewNote = function($event){
                            if ($event.keyCode === 13 & !$event.shiftKey) {
                                $event.preventDefault();
                                $event.stopPropagation();
                                sdmIMController.apiData.notes = sdmIMController.apiData.notes||[];
                                sdmIMController.newNote = sdmIMController.newNote.replace(/\10/, '\n')
                                console.log({a: sdmIMController.newNote})
                                sdmIMController.apiData.notes.push({text: sdmIMController.newNote||''});
                                var url = BASE_URL + node.level.name + '/' + node.id;
                                var payload = {
                                    notes: sdmIMController.apiData.notes
                                }
                                makeAPICall.async(url, {site: node.site}, 'PUT', payload).then(refreshDataInModal);
                                sdmIMController.newNote = null;
                                return;
                            }
                        }

                        sdmIMController.removeNote = function($index){
                            var length = sdmIMController.apiData.notes.length;
                            sdmIMController.apiData.notes.splice(length - $index - 1, 1);
                            var url = BASE_URL + node.level.name + '/' + node.id;
                            var payload = {
                                notes: sdmIMController.apiData.notes
                            }
                            makeAPICall.async(url, {site: node.site}, 'PUT', payload).then(refreshDataInModal);
                            sdmIMController.newNote = null;
                        }

                        sdmIMController.removeUser = function ($index, form) {
                            console.log('removing', sdmIMController.apiData.permissions[$index]);
                            var userID = sdmIMController.apiData.permissions[$index]._id;
                            sdmIMController.apiData.permissions.splice($index, 1);
                            sdmIMController.permissionPlaceholder = ' User removed. Save to confirm';
                            sdmIMController.success = true;
                            form.newPermission.hasErrors = false;
                            var viewValue = form.newPermission.$viewValue;
                            sdmIMController.selectedUID = null;
                            setTimeout(function(){
                                $scope.$apply(function(){
                                    sdmIMController.success = false;
                                    sdmIMController.selectedUID = viewValue;
                                });
                            }, 2000);
                            sdmIMController.arePermissionsChanged = true;
                        };

                        sdmIMController.updateAttachmentsAndFiles = function() {
                            return makeAPICall.async(APIUrl, {site: node.site}).then(
                                function (apiData) {
                                    sdmIMController.attachments = [];
                                    sdmIMController.files = [];
                                    apiData.files.forEach(function(file){
                                        if (file.flavor === 'data') {
                                            sdmIMController.files.push(file);
                                        } else if (file.flavor === 'attachment'){
                                            sdmIMController.attachments.push(file);
                                        }
                                    });
                                }
                            );

                        }

                        sdmIMController.confirmAttachmentRemove = [];

                        sdmIMController.addConfirmAttachment = function($index) {
                            sdmIMController.confirmAttachmentRemove[$index] = true;
                            setTimeout(function(){
                                sdmIMController.confirmAttachmentRemove[$index] = false;
                                $scope.$apply();
                            }, 30000);
                        }

                        sdmIMController.removeAttachment = function(attachment) {
                            var url = APIUrl + '/attachment?name=' + attachment.name
                                + attachment.ext;
                            makeAPICall.async(url, null, 'DELETE', null).then(sdmIMController.updateAttachments);
                        }

                        sdmIMController.downloadAttachment= function($index) {
                            var url = APIUrl + '/attachment?name=' + sdmIMController.attachments[$index].name
                                + sdmIMController.attachments[$index].ext;

                            makeAPICall.async(url, null, 'POST', null).then(function(response){

                                window.open(response.url + '&attach=true', '_self');
                            });
                        };

                        sdmIMController.hasPapayaViewer = function(attachment) {
                            var filename = attachment.name + attachment.ext;
                            return filename.search(/\.nii(\.gz)?$/) >= 0;
                        }

                        sdmIMController.hasBbrowserViewer = function(attachment) {
                            var filename = attachment.name + attachment.ext;
                            return filename.search(/\.obj$/) >= 0;
                        }

                        sdmIMController.viewAttachment = function(attachment) {
                            var fullname = attachment.name + attachment.ext;
                            var url = APIUrl + '/attachment?name=' + fullname;
                            var callback;
                            if (sdmIMController.hasBbrowserViewer(attachment)) {
                                callback = function(response) {
                                    $("#bbrowser-viewer").html("");
                                    $("#bbrowser-viewer").load(
                                      "https://brainbrowser.cbrain.mcgill.ca/surface-viewer-widget?" +
                                      "version=2.3.0&" +
                                      "model=" + response.url + "&" +
                                      "width=600&" +
                                      "height=600&" +
                                      "format=wavefrontobj"
                                    );
                                };
                            } else if (sdmIMController.hasPapayaViewer(attachment)) {
                                callback = function(response) {
                                    papayaParams.images = [response.url];
                                    papayaParams.showOrientation = false;
                                    papaya.Container.startPapaya();
                                };
                            } else {
                                callback = function(response) {
                                    sdmIMController.resourceViewer = {
                                        fileUrl: response.url,
                                        type: sdmIMController.getAttachmentType(attachment)
                                    }
                                };
                            }
                            makeAPICall.async(url, null, 'POST', null).then(callback);
                        };

                        sdmIMController.viewFileInPapaya = function(file) {
                            var _node = {
                                level: level,
                                _id: node.id,
                                file: file
                            };
                            sdmDownloadInterface.getDownloadURL(_node, true, false).then(function(response){
                                papayaParams.images = [response.url];
                                papayaParams.showOrientation = false;
                                papaya.Container.startPapaya();
                            });
                        }

                        sdmIMController.updateValue = function(field) {
                            var values = [];
                            field.optionsSelected.forEach(
                                function(o){
                                    values.push(sdmIMController.editables[field.key].dropdown[o]);
                                }
                            );
                            field.value = values.join(',');
                        }

                        sdmIMController.edit = function($event, field) {
                            if (sdmIMController.editables[field.key]){
                                field.editing = !field.editing;
                                var inputEl = $event.currentTarget.parentElement.getElementsByTagName('input')[0];
                                setTimeout(function(){
                                    inputEl.focus()
                                }, 0);
                            }
                        }

                        sdmIMController.addUser = function ($event, form) {
                            if (!sdmIMController.selectedUID) {
                                form.hasErrors = true;
                                form.newPermission.hasErrors = true;
                                sdmIMController.selectedUID = null;
                                sdmIMController.permissionPlaceholder = "User UID is missing or invalid";
                                return;
                            } else {
                                if (!sdmIMController.users[sdmIMController.selectedUID]) {
                                    sdmIMController.createUserInModal($event);
                                    return;
                                } else if (sdmIMController.apiData.permissions.map(
                                        function(permission){
                                            return permission._id;
                                        }).indexOf(sdmIMController.selectedUID) >= 0 ) {
                                    form.hasErrors = true;
                                    form.newPermission.hasErrors = true;
                                    sdmIMController.selectedUID = null;
                                    sdmIMController.permissionPlaceholder = "User already has permission";
                                    return;
                                }
                            }
                            sdmIMController.apiData.permissions.push({
                                _id: sdmIMController.selectedUID,
                                access: sdmIMController.selectedRole.rid
                            });
                            sdmIMController.selectedUID = '';
                            sdmIMController.permissionPlaceholder = 'Permission added. Save to confirm.';
                            sdmIMController.success = true;
                            form.newPermission.hasErrors = false;
                            setTimeout(function(){
                                $scope.$apply(function(){
                                    sdmIMController.success = false;
                                    sdmIMController.permissionPlaceholder = 'Enter User ID';
                                });
                            }, 2000);
                            sdmIMController.selectedRole = null;
                            sdmIMController.arePermissionsChanged = true;
                            typeaheadElement.typeahead('val', '');
                        };

                        sdmIMController.createUserInModal = function ($event) {
                            $event.stopPropagation();
                            $event.preventDefault();
                            sdmPopoverTrampoline.trigger(
                                'sdm-create-user',
                                'components/admin/userCreationModal.html',
                                {refreshUsers: refreshUsers}
                            );
                        }

                        sdmIMController.save = function ($event) {
                            var isApiDataChanged = !sdmIMController.data.every(
                                function (field) {
                                    return !field.editing;
                                });
                            if (!sdmIMController.arePermissionsChanged && !isApiDataChanged) {
                                $scope.$parent._hidePopover($event, 0);
                                return;
                            }
                            var url = BASE_URL + node.level.name + '/' + node.id;
                            var payload = {};//{notes: sdmIMController.apiData.notes};
                            if (sdmIMController.arePermissionsChanged) {
                                payload.permissions = sdmIMController.apiData.permissions;
                            }
                            if (isApiDataChanged) {
                                console.log(sdmIMController.data);
                                sdmIMController.data.filter(function(field){
                                    return field.editing;
                                }).forEach(
                                    function (field){
                                        console.log(field);
                                        sdmIMController.editables[field.key].update(payload, field.value);
                                    }
                                )
                            }
                            makeAPICall.async(url, {site: node.site}, 'PUT', payload).then(function(){
                                    var currentPath = $location.path();
                                    currentPath = currentPath.substring(1, currentPath.length);
                                    sdmViewManager.refreshView(currentPath);
                                    $scope.$parent.enableEvents();
                                    $scope.$parent._hidePopover($event, 0);
                                });
                        }
                    }
                }
            }
            ]
        );
})();
