'use strict';

angular.module('sdm.util.services.sdmHumanReadableSize',
    [])
    .constant('sdmHumanReadableSize',
        function(bytes) {
            var sizes = ['KB', 'MB', 'GB'];
            if (bytes < 1024) {
                return bytes + ' Bytes';
            }
            for (var i = 0; i < sizes.length; i++) {
                bytes /= 1024.0;
                if (bytes < 1024 || i === sizes.length - 1) {
                    return bytes.toFixed(2) + ' ' + sizes[i];
                }
            }
            throw new Error("Error in converting to human readable size");
        }
    );
