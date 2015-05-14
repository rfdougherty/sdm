angular.module('sdm.util.directives.sdmViewer',
    []).directive("sdmViewer", ['$q', function ($q) {

    var resize = function(element, container) {
        console.log('resize');
        var width = element.width();
        var height = element.height();
        var cWidth = container.width();
        var cHeight = container.height();
        console.log(cWidth, cHeight);
        if (cWidth && cHeight) {
            var ratio = Math.max(width/container.width(), height/container.height());
            var multiplier = 1;
            var maxRatio = 0.9;
            if (ratio < maxRatio) {
                multiplier = maxRatio/ratio;
            } else if (ratio > maxRatio) {
                multiplier = maxRatio/ratio;
            } else {
                return;
            }
            element.width(width * multiplier);
            element.height(height * multiplier);
        }
    };

    var updateElem = function (element) {
        return function (displayFile) {
            element.empty();
            if (displayFile) {
                console.log(displayFile.mimetype)
                var objectEl = angular.element('<object>')
                                    .attr({
                                        'data': displayFile.fileUrl
                                    });
                if (displayFile.mimetype.search(/^(application\/pdf|text\/html)$/) > -1){
                    objectEl.attr({
                        width: '90%',
                        height: '90%'
                    })
                } else {
                    objectEl.css('visibility', 'hidden');
                }
                objectEl[0].onload = function(){
                    switch(displayFile.mimetype) {
                        case 'application/pdf':
                        case 'text/plain':
                        case 'text/html':
                            break;
                        default:
                            resize(objectEl, element.parent());
                            break;
                    }
                    objectEl.css('visibility', 'visible');
                };
                objectEl.appendTo(element);
            }
        };
    };


    return {
        restrict: "E",
        scope: {
            sdmFileProperties: "="
        },
        link: function (scope, element) {
            var update = updateElem(element);
            scope.$watch('sdmFileProperties', update);
        }
    };
}]);
