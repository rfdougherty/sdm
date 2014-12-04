'use strict';

describe('Service: sdmViewManager', function() {

    beforeEach(module('sdm.treeViews.services.sdmViewManager'));

    var sdmViewManager;

    beforeEach(inject(function (_sdmViewManager_) {
        sdmViewManager = _sdmViewManager_;
    }));

    it('should get the default view appearances', function() {
        var viewAppearances = sdmViewManager.getViewAppearance();
        expect(viewAppearances['data-layout']).toBe('table');
    });

    it('should update a key in the view appearances', function() {
        var viewAppearancesBefore = sdmViewManager.getViewAppearance();
        sdmViewManager.updateViewAppearanceKey('my-key', 'value');
        var viewAppearancesAfter = sdmViewManager.getViewAppearance();
        expect(viewAppearancesBefore).toBe(viewAppearancesAfter);
        expect(viewAppearancesAfter['my-key']).toBe('value');
        expect(viewAppearancesAfter['data-layout']).toBe('table');
    });

    it('should extend the view appearances', function() {
        var viewAppearancesBefore = sdmViewManager.getViewAppearance();
        sdmViewManager.updateViewAppearance({'my-key': 'value'});
        var viewAppearancesAfter = sdmViewManager.getViewAppearance();
        expect(viewAppearancesBefore).toBe(viewAppearancesAfter);
        expect(viewAppearancesAfter['my-key']).toBe('value');
        expect(viewAppearancesAfter['data-layout']).toBe('table');
    });
});
