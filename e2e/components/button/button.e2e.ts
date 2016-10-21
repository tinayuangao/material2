import {screenshot} from '../../screenshot';

describe('button', function () {
  describe('disabling behavior', function () {
    beforeEach(function() {
      browser.get('/button');
    });
    it('should prevent click handlers from executing when disabled', function () {
      screenshot('button should prevent click handlers from executing when disabled');
      element(by.id('test-button')).click();
      expect(element(by.id('click-counter')).getText()).toEqual('1');

      element(by.id('disable-toggle')).click();
      element(by.id('test-button')).click();
      expect(element(by.id('click-counter')).getText()).toEqual('1');
    });
  });
});
