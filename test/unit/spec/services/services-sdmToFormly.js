'use strict';

describe('Service: sdmToFormly', function() {

    beforeEach(module('sdm.jsonschema.services.sdmToFormly'));

    var sdmToFormly;

    beforeEach(inject(function (_sdmToFormly_) {
        sdmToFormly = _sdmToFormly_;
    }));

    var schemaObject = '{"type": "object", "properties": {"firstname_hash": {"field": "firstname_hash", "type": "string"}, "lastname_hash": {"field": "lastname_hash", "type": "string"}, "code": {"field": "nims_session_subject", "title": "Code", "type": "string", "maxLength": 16}, "firstname": {"field": "subj_firstname", "type": "string", "title": "First Name"}, "dob": {"field": "subj_dob", "title": "Date of Birth", "type": "string", "format": "date"}, "lastname": {"field": "subj_lastname", "type": "string", "title": "Last Name"}, "age": {"field": "subj_age", "type": "integer", "title": "Age"}, "sex": {"field": "subj_sex", "enum": ["male", "female"], "type": "string", "title": "Sex"}}, "title": "Subject"}';

    var schemaSimpleArray = '{"title": "File", "required": ["name", "ext", "filesize", "sha1", "type", "kinds", "state"], "additionalProperties": false, "$schema": "http://json-schema.org/draft-04/schema#", "type": "object", "properties": {"sha1": {"type": "string", "title": "SHA-1"}, "kinds": {"type": "array", "title": "Kinds"}, "name": {"type": "string", "title": "Name"}, "state": {"type": "array", "title": "State"}, "ext": {"type": "string", "title": "Extension"}, "filesize": {"type": "integer", "title": "Size"}, "type": {"type": "string", "title": "Type"}}}';

    var schemaArray ='{"$schema": "http://json-schema.org/draft-04/schema#", "type": "object", "properties": {"files": {"uniqueItems": true, "items": {"title": "File", "required": ["name", "ext", "filesize", "sha1", "type", "kinds", "state"], "additionalProperties": false, "$schema": "http://json-schema.org/draft-04/schema#", "type": "object", "properties": {"sha1": {"type": "string", "title": "SHA-1"}, "kinds": {"type": "array", "title": "Kinds"}, "name": {"type": "string", "title": "Name"}, "state": {"type": "array", "title": "State"}, "ext": {"type": "string", "title": "Extension"}, "filesize": {"type": "integer", "title": "Size"}, "type": {"type": "string", "title": "Type"}}}, "type": "array", "title": "Files"}}}';

    it('should return an object template', function() {
        var formlyStrut = sdmToFormly( JSON.parse(schemaObject) )
        console.log(JSON.stringify(formlyStrut, null, 4));
    });

    it('should return a simple array template', function() {
        var formlyStrut = sdmToFormly( JSON.parse(schemaSimpleArray) )
        console.log(JSON.stringify(formlyStrut, null, 4));
    });

    it('should return a complex array template', function() {
        var formlyStrut = sdmToFormly( JSON.parse(schemaArray) )
        console.log(JSON.stringify(formlyStrut, null, 4));
    });
});
