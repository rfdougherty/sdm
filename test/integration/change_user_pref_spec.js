describe('sdm test change the name ', function() {

    beforeEach(function() {
        browser.get('https://localhost:9000');
        element(by.partialButtonText('Login')).click();
        browser.wait(function(){
            return element(by.id('username')).isPresent();
        }, 60000);
        browser.driver.manage().window().setSize(1384, 800);
    }, 240000);

    it('should open and close the modal', function() {
        browser.driver.actions().mouseMove(element(by.id('username'))).perform();
        browser.wait(function(){
            return element(by.id('user-preferences-edit')).isPresent();
        }, 60000);
        browser.driver.actions().mouseMove(element(by.id('header-text'))).perform();
        setTimeout(function(){
            expect(element(by.id('user-preferences-edit')).isPresent()).toBe(false);
        }, 500);
    });

    afterEach(function() {
        element(by.css('button .glyphicon-log-out')).click();
    });
});
