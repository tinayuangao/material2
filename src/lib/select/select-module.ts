/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {OverlayModule} from '@angular/cdk/overlay';
import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MatCommonModule, MatOptionModule} from '@angular/material/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MAT_SELECT_SCROLL_STRATEGY_PROVIDER, MatSelect, MatSelectTrigger, MatOptionDef, MatOptionOutlet} from './select';


@NgModule({
  imports: [
    CommonModule,
    OverlayModule,
    MatOptionModule,
    MatCommonModule,
    MatInputModule,
  ],
  exports: [
    MatFormFieldModule,
    MatSelect,
    MatSelectTrigger,
    MatOptionModule,
    MatCommonModule,
    MatOptionDef,
    MatOptionOutlet
  ],
  declarations: [MatSelect, MatSelectTrigger, MatOptionDef, MatOptionOutlet],
  providers: [MAT_SELECT_SCROLL_STRATEGY_PROVIDER]
})
export class MatSelectModule {}
