'use strict';

(function () {

    angular.module('sdm.util.services.sdmTileViewer',
        ['sdmHttpServices'])
        .factory('sdmTileViewer', ['$q', 'makeAPICall', function($q, makeAPICall){
            var storeFileMapping = function(memberArray) {
                var members = {};
                memberArray.forEach(function(m){
                    members[m[0]] = true;
                })
                return members
            }
            var sdmTileViewer = function(nodeId, filename, site, level, d3Selector) {
                var fileURL = BASE_URL + level + '/' + nodeId +'/file/' + filename;
                var commentP = makeAPICall.async(fileURL + '?comment=1', {site: site});
                var infoP = makeAPICall.async(fileURL + '?info=1', {site: site});
                var padder = new Intl.NumberFormat(undefined, {minimumIntegerDigits: 3});

                $q.all([commentP, infoP]).then(
                    function(results) {
                        var tileInfo = results[0];
                        var montageRoot = tileInfo.dirname;
                        var members = storeFileMapping(results[1]);
                        console.log(tileInfo);
                        console.log(members);
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
                            width = d3.select(d3Selector).style('width'),
                            height = d3.select(d3Selector).style('height'),
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

                        var map = d3.select(d3Selector)
                            .style('width', width + 'px')
                            .style('height', height + 'px')
                            .style('margin', '25px')
                            .call(zoom);

                        var layer = map.append("div")
                            .attr("class", "sdm-d3-layer");

                        zoomed();

                        function getUrl(z, x, y) {
                            var urlEnd = montageRoot +
                                         '/z' + padder.format(z) +
                                         '/x' + padder.format(x) +
                                         '_y' + padder.format(y) + '.jpg';
                            console.log(urlEnd);
                            if (typeof members[urlEnd] === 'undefined') {
                                return
                            }
                            return fileURL + '?member=' + urlEnd;
                        }

                        function getData(url, timeout) {
                            return makeAPICall.async(url, {site:site}, 'GET', null, null, 'arraybuffer', timeout);
                        }

                        function calculateRectangle(tiles){
                            //console.log(tiles.translate);
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
                            //console.log(zoom.scale());
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
                                        if (typeof cacheData[cacheKey] !== 'undefined') {
                                            if (cacheData[cacheKey]) {
                                                _this.setAttribute('src', cacheData[cacheKey]);
                                            } else {
                                                _this.setAttribute('hidden', 'true');
                                            }
                                            return;
                                        }
                                        var url = getUrl(d[2], d[0], d[1]);
                                        if (typeof url === 'undefined') {
                                            _this.setAttribute('hidden', 'true');
                                            cacheData[cacheKey] = '';
                                            return
                                        }
                                        getData(url, d.abort.promise).then(
                                            function(buffer) {
                                                if (buffer instanceof ArrayBuffer) {
                                                    var binary = '';
                                                    var bytes = new Uint8Array( buffer );
                                                    var len = bytes.byteLength;
                                                    for (var i = 0; i < len; i++) {
                                                        binary += String.fromCharCode( bytes[ i ] );
                                                    }
                                                    var base64 = window.btoa( binary );
                                                    cacheData[cacheKey] = 'data:image/jpg;base64,' + base64;
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

            return sdmTileViewer
        }])
})();
