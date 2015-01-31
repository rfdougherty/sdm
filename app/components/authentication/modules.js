'use strict';

angular.module('sdm.authentication',
    [
        'sdm.authentication.controllers',
        'sdm.authentication.services.sdmUserManager',
        'sdm.authentication.directives.sdmLoginModal'
    ]);
