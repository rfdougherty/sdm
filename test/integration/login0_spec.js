describe('sdm test authenticated user', function() {
  it('should perform some actions while logged in and logged out', function() {
    var wait = function(n) {
        for (var i =1; i <n; i++) {
            element(by.repeater('tab in sdmNavigationController.tabs').row(0)).click();
        }
    };

    //wait = function(){};

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

    wait(6);

    GEServiceEl.click();

    wait(6);

    GEServiceEl.click();

    wait(10);

    element(by.css('button .glyphicon-tree-conifer')).click();

    wait(10);

    element(by.css('button .glyphicon-log-out')).click();

    element(by.css('button .glyphicon-th-list')).click();

    wait(10);

    browser.wait(function(){
        return element(by.partialButtonText('Login')).isPresent();
    }, 60000)

    element(by.partialButtonText('Login')).click();

    wait(10);

    element(by.css('button .glyphicon-th-list')).click();
    wait(6);
    element(by.css('button .glyphicon-eye-open')).click();
    wait(6);
    element(by.css('button .glyphicon-eye-close')).click();

    wait(6);

  }, 240000);
});
