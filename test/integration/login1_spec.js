describe('sdm logout test', function() {
  it('should load the page and logout', function() {
    browser.get('https://localhost:9000');

    element(by.css('button .glyphicon-log-out')).click();

  });
});
