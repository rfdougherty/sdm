describe('sdm test change the name ', function() {

    beforeEach(function() {
        browser.get('https://localhost:9000');
        element(by.partialButtonText('Login')).click();
        browser.wait(function(){
            return element(by.id('username')).isPresent();
        }, 60000);
        browser.driver.manage().window().setSize(1384, 800);
    }, 240000);

    it('should open and close the popover', function() {
        browser.driver.actions().mouseMove(element(by.id('username'))).perform();
        browser.wait(function(){
            return element(by.id('user-preferences-edit')).isPresent();
        }, 60000);

        element(by.id('user-preferences-edit')).click();
        browser.driver.actions().mouseMove(element(by.id('header-text'))).perform();
        expect(element(by.id('user-preferences-cancel')).isPresent()).toBe(true);
        browser.driver.actions().mouseMove(element(by.id('username'))).perform();

        element(by.id('user-preferences-cancel')).click();
        browser.wait(function(){
            return element(by.id('user-preferences-edit')).isPresent();
        }, 60000);

        element(by.id('user-preferences-edit')).click();
        expect(element(by.id('user-preferences-save')).isPresent()).toBe(true);

        element(by.id('user-preferences-save')).click();
        browser.wait(function(){
            return element(by.id('user-preferences-edit')).isPresent();
        }, 60000);

        browser.driver.actions().mouseMove({x: 0, y: 0}).perform();
        for (var i = 0; i<5; i++) {
            element(by.repeater('tab in sdmNavigationController.tabs').row(0)).click();
        }
        expect(element(by.id('user-preferences-edit')).isPresent()).toBe(false);
        browser.driver.actions().mouseMove(element(by.id('username'))).perform();
        browser.wait(function(){
            return element(by.id('user-preferences-edit')).isPresent();
        }, 60000);

    });

    afterEach(function() {
        element(by.css('button.logout')).click();
    });
});
