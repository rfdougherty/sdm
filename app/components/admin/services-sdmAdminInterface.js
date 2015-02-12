'use strict';

(function(){
    var sdmAdminInterface = function(makeAPICall, sdmUsers) {
        var createNewUser = function(firstname, lastname, userid, email, superuser) {
            console.log(firstname, lastname, userid, email, superuser);
            var url = BASE_URL + 'users';
            var payload = {
                _id: userid,
                firstname: firstname,
                lastname: lastname,
                wheel: superuser,
                email: email
            }
            return makeAPICall.async(url, null, 'POST', payload).then(function(){
                sdmUsers.refreshUsers();
            });
        }
        return {
            createNewUser: createNewUser
        }
    };

    sdmAdminInterface.$inject = ['makeAPICall', 'sdmUsers'];

    angular.module('sdm.admin.services.sdmAdminInterface',['sdm.services', 'sdm.APIServices.services.sdmUsers'])
        .factory('sdmAdminInterface', sdmAdminInterface);
})();
