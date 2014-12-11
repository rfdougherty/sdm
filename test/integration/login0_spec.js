describe('sdm test authenticated user', function() {
  it('should perform some actions while logged in and logged out', function() {

    browser.get('https://localhost:9000');
    var GEServiceEl = element.all(by.cssContainingText('.sdm-cell', 'GE Service')).first().all(by.className('glyphicon')).first();

    element(by.partialButtonText('Login')).click();
    browser.wait(function(){
        return element(by.partialButtonText('Renzo')).isPresent();
    }, 60000)
    //element.all(by.partialButtonText('Renzo'))
    //var filterSession = element.all(by.css)

    GEServiceEl.click();
    element.all(by.cssContainingText('.sdm-cell', 'untitled')).first().all(by.className('glyphicon')).first().click();
    element.all(by.cssContainingText('.sdm-cell', 'UC Davis IRC')).first().all(by.className('glyphicon')).first().click();

    GEServiceEl.click();

    GEServiceEl.click();

    element(by.css('button .glyphicon-tree-conifer')).click();

    element(by.css('button .glyphicon-log-out')).click();

    element(by.css('button .glyphicon-th-list')).click();

    browser.wait(function(){
        return element(by.partialButtonText('Login')).isPresent();
    }, 60000)

    element(by.partialButtonText('Login')).click();

    element(by.css('button .glyphicon-th-list')).click();

    element(by.css('button .glyphicon-eye-open')).click();

    element(by.css('button .glyphicon-eye-close')).click();

  }, 240000);
});
