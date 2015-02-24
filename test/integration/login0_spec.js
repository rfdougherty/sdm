describe('sdm test authenticated user', function() {
  it('should perform some actions while logged in and logged out', function() {

    browser.get('https://localhost:9000');
    var GEServiceEl = element.all(by.cssContainingText('.sdm-cell', 'GE Service')).first().all(by.className('glyphicon')).first();

    element(by.partialButtonText('Login')).click();
    browser.wait(function(){
        return element(by.id('username')).isPresent();
    }, 60000)

    GEServiceEl.click();
    element.all(by.cssContainingText('.sdm-cell', 'untitled')).first().all(by.className('glyphicon')).first().click();
    element.all(by.cssContainingText('.sdm-cell', 'UC Davis IRC')).first().all(by.className('glyphicon')).first().click();

    GEServiceEl.click();

    GEServiceEl.click();
    expect(
        element(by.css('button.active.table-view .glyphicon-th-list')).isPresent()
        ).toBe(true);
    expect(
        element(by.css('button.active.tree-view .glyphicon-tree-conifer')).isPresent()
        ).toBe(false);

    element(by.css('button.tree-view')).click();
    expect(
        element(by.css('button.active.table-view .glyphicon-th-list')).isPresent()
        ).toBe(false);
    expect(
        element(by.css('button.active.tree-view .glyphicon-tree-conifer')).isPresent()
        ).toBe(true);

    element(by.css('button.logout')).click();
    expect(
        element(by.css('button.active.table-view .glyphicon-th-list')).isPresent()
        ).toBe(false);
    expect(
        element(by.css('button.active.tree-view .glyphicon-tree-conifer')).isPresent()
        ).toBe(true);

    element(by.css('button.table-view')).click();
    expect(
        element(by.css('button.active.table-view .glyphicon-th-list')).isPresent()
        ).toBe(true);
    expect(
        element(by.css('button.active.tree-view .glyphicon-tree-conifer')).isPresent()
        ).toBe(false);


    browser.wait(function(){
        return element(by.partialButtonText('Login')).isPresent();
    }, 60000)

    element(by.partialButtonText('Login')).click();

    browser.wait(function(){
        return element(by.id('username')).isPresent();
    }, 60000);

    expect(
        element(by.css('button.active.table-view .glyphicon-th-list')).isPresent()
        ).toBe(false);
    expect(
        element(by.css('button.active.tree-view .glyphicon-tree-conifer')).isPresent()
        ).toBe(true);

    element(by.css('button.table-view')).click();
    expect(
        element(by.css('button.active.table-view .glyphicon-th-list')).isPresent()
        ).toBe(true);
    expect(
        element(by.css('button.active.tree-view .glyphicon-tree-conifer')).isPresent()
        ).toBe(false);

    element(by.css('button.superuser')).click();

    element(by.css('button.superuser')).click();

  }, 240000);
});
