import {task} from 'gulp';
import {existsSync, mkdirSync, writeFileSync} from 'fs';
import * as path from 'path';

export class Screenshot {
  id: string;
  png: any;
  /**
   * The filename used to store the screenshot
   * @returns {string}
   */
  get filename() {
    return this.id
        .toLowerCase()
        .replace(/[ :\/]/g, '_')
        .replace(/[^/a-z0-9_]+/g, '')
        + '.screenshot.png';
  }

  /**
   * The full path to the screenshot
   * @returns {string}
   */
  get path() {
    return path.resolve(__dirname, '..', 'screenshots', this.filename);
  }

  /**
   * @param {string} id A unique identifier used for the screenshot
   */
  constructor(id: string) {
    this.id   = id;
    browser.takeScreenshot().then(png => this.storeScreenshot(png));
  }

  /**
   * Replaces the existing screenshot with the newly generated one.
   */
  storeScreenshot(png: any) {
    console.info(`[STATUS] Saving new screenshot`);
    var dir = path.resolve(__dirname, '..', 'screenshots');
    if (!existsSync(dir)) {
      mkdirSync(dir, 0o744);
    }
    writeFileSync(this.path, png, {encoding: 'base64'});
  }
}

export function screenshot(id: string) {
  console.log('screensho tid is ' + id);
  return new Screenshot(id);
}
