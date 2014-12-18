describe('public data test', function() {
  it('test all the functionalities that dont require authentication', function() {

    browser.get('https://localhost:9000');
    browser.driver.manage().window().setSize(1384, 800);

    var GEServiceEl = element.all(by.cssContainingText('.sdm-cell', 'GE Service')).first().all(by.className('glyphicon')).first();

    GEServiceEl.click();
    element.all(by.cssContainingText('.sdm-cell', 'untitled')).first().all(by.className('glyphicon')).first().click();

    GEServiceEl.click();

    GEServiceEl.click();

    var filter = function (header) {
        return element(by.cssContainingText('.sdm-table-header .container .col', header))
                         .element(by.tagName('input'));
    };
    var filterSession = filter('Session');

    filterSession.sendKeys('2014');

    var filterSubject = filter('Subject');

    filterSubject.sendKeys('84');

    GEServiceEl.click();

    GEServiceEl.click();

    filterSession.sendKeys('2014');

    filterSession.clear();
    filterSubject.clear();

    element(by.css('button .glyphicon-tree-conifer')).click();

    for (var i =1; i <12; i++) {
        element(by.repeater('tab in sdmNavigationController.tabs').row(i%4)).click();
    }

  }, 120000);
});
