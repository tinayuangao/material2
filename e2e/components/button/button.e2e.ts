import {screenshot} from '../../screenshot';


var getFullDesc = function(suite: any, defaultDesc = ""){
  var desc = defaultDesc;
  console.log('has parent ', jasmine.getEnv().topSuite);
  while(suite.parentSuite){
    console.log('suite description', suite.description, 'parent suite');
    desc = suite.description + " " + desc;
    suite = suite.parentSuite;
  }

  return desc;
}

describe('button', function () {
  describe('disabling behavior', function () {
    beforeEach(function() {
      console.log(getFullDesc(this, 'before each'));
      browser.get('/button');
    });

    console.log(getFullDesc(this, 'outside'));
    fit('should prevent click handlers from executing when disabled', function () {
      console.log(getFullDesc(this, 'inside'));
      screenshot(getFullDesc(this, 'inside'));
      element(by.id('test-button')).click();
      expect(element(by.id('click-counter')).getText()).toEqual('1');

      element(by.id('disable-toggle')).click();
      element(by.id('test-button')).click();
      expect(element(by.id('click-counter')).getText()).toEqual('1');
    });
  });
});
