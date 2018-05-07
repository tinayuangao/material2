/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {AfterViewInit, Component, Directive, ViewContainerRef, 
      ViewEncapsulation, Input, ChangeDetectionStrategy, ViewChild} from '@angular/core';
import {mixinDisabled, CanDisable} from '../common-behaviors/disabled';

// Boilerplate for applying mixins to MatOptgroup.
/** @docs-private */
export class MatOptgroupBase { }
export const _MatOptgroupMixinBase = mixinDisabled(MatOptgroupBase);

// Counter for unique group ids.
let _uniqueOptgroupIdCounter = 0;

/** Directive to mark where options should be projected. */
@Directive({selector: '[matOptionOutlet]'})
export class MatOptionOutlet {
  constructor(public viewContainerRef: ViewContainerRef) { }
}

/** Directive to mark where options should be projected. */
@Directive({selector: '[matGroupOptionOutlet]'})
export class MatGroupOptionOutlet {
  constructor(public viewContainerRef: ViewContainerRef) { }
}

/**
 * Component that is used to group instances of `mat-option`.
 */
@Component({
  moduleId: module.id,
  selector: 'mat-optgroup',
  exportAs: 'matOptgroup',
  templateUrl: 'optgroup.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  inputs: ['disabled'],
  styleUrls: ['optgroup.css'],
  host: {
    'class': 'mat-optgroup',
    'role': 'group',
    '[class.mat-optgroup-disabled]': 'disabled',
    '[attr.aria-disabled]': 'disabled.toString()',
    '[attr.aria-labelledby]': '_labelId',
  }
})
export class MatOptgroup<T = any> extends _MatOptgroupMixinBase implements CanDisable {
  /** Label for the option group. */
  @Input() label: string;

  /** Option outlet to render all options nodes */
  @ViewChild('optionsOutlet', {read: ViewContainerRef}) optionsOutlet: ViewContainerRef;

  /** Unique id for the underlying label. */
  _labelId: string = `mat-optgroup-label-${_uniqueOptgroupIdCounter++}`;
}
