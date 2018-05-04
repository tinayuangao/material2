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
import {MatOption} from './option';
import {MatOptgroup, MatGroupOptionOutlet, MatOptionOutlet, MatOptionDef} from './optgroup';


@NgModule({
  imports: [MatRippleModule, CommonModule, MatPseudoCheckboxModule],
  exports: [MatOption, MatOptgroup, MatGroupOptionOutlet, MatOptionOutlet, MatOptionDef],
  declarations: [MatOption, MatOptgroup, MatGroupOptionOutlet, MatOptionOutlet, MatOptionDef]
})
export class MatOptionModule {}


export * from './option';
export * from './optgroup';
