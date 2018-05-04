/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatRippleModule} from '../ripple/index';
import {MatPseudoCheckboxModule} from '../selection/index';
import {MatOption, MatOptionBase} from './option';
import {MatOptgroup, MatGroupOptionOutlet, MatOptionOutlet} from './optgroup';


@NgModule({
  imports: [MatRippleModule, CommonModule, MatPseudoCheckboxModule],
  exports: [MatOption, MatOptgroup, MatGroupOptionOutlet, MatOptionOutlet],
  declarations: [MatOption, MatOptgroup, MatGroupOptionOutlet, MatOptionOutlet]
})
export class MatOptionModule {}


export * from './option';
export * from './optgroup';
