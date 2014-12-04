describe('angularjs homepage', function() {
  it('should greet the named user', function() {
    browser.get('https://localhost:9000');
    for (var i =1; i <30; i++) {
        element(by.repeater('tab in sdmNavigationController.tabs').row(i%4)).click();
    }
  });
});
