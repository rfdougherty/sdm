describe('sdm logout test', function() {
  it('should load the page and logout', function() {
    browser.get('https://localhost:9000');
    expect(
        element(by.css('button.active .glyphicon-th-list')).isPresent()
        ).toBe(true);

    element(by.css('button .glyphicon-log-out')).click();

  });
});
