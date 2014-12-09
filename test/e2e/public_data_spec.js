describe('public data test', function() {
  it('test all the functionalities that dont require authentication', function() {
    var wait = function(n) {
        for (var i =1; i <n; i++) {
            element(by.repeater('tab in sdmNavigationController.tabs').row(0)).click();
        }
    };

    //wait = function(){};

    browser.get('https://localhost:9000');
    var GEServiceEl = element.all(by.cssContainingText('.sdm-cell', 'GE Service')).first().all(by.className('glyphicon')).first();

    GEServiceEl.click();
    element.all(by.cssContainingText('.sdm-cell', 'untitled')).first().all(by.className('glyphicon')).first().click();

    wait(6);

    GEServiceEl.click();

    wait(6);

    GEServiceEl.click();

    wait(20);

    //element.all(by.partialButtonText('Renzo'))
    var filter = function (header) {
        return element(by.cssContainingText('.sdm-table-header .container .col', header))
                         .element(by.tagName('input'));
    };
    var filterSession = filter('Session');

    filterSession.sendKeys('2014');


    wait(20);

    var filterSubject = filter('Subject');

    filterSubject.sendKeys('84');

    wait(20);

    GEServiceEl.click();

    wait(20);

    GEServiceEl.click();

    wait(20);

    filterSession.sendKeys('2014');


    wait(20);

    filterSession.clear();
    filterSubject.clear();

    wait(10);

    element(by.css('button .glyphicon-tree-conifer')).click();

    wait(10);

    for (var i =1; i <12; i++) {
        element(by.repeater('tab in sdmNavigationController.tabs').row(i%4)).click();
    }

  }, 120000);
});
