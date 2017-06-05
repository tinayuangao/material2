import {Directive, Output, EventEmitter, ElementRef, Input} from '@angular/core';
import {coerceBooleanProperty} from '../core/coercion/boolean-property';
import {ENTER} from '../core/keyboard/keycodes';
import {MdChipList} from './chip-list';

export interface MdChipInputEvent {
  input: HTMLInputElement;
  value: string;
}

@Directive({
  selector: 'input[mdChipList], input[matChipList]',
  host: {
    'class': 'mat-chip-input',
    '(keydown)': '_keydown($event)',
    '(blur)': '_blur()'
  }
})
export class MdChipInput {

  _chipList: MdChipList;

  /** Register input for chip list */
  @Input('mdChipList')
  set chipList(value: MdChipList) {
    if (value) {
      this._chipList = value;
      this._chipList.registerInput(this._inputElement);
    }
  }

  /**
   * Whether or not the chipEnd event will be emitted when the input is blurred.
   */
  @Input('mdChipListAddOnBlur')
  get addOnBlur() { return this._addOnBlur; }
  set addOnBlur(value) { this._addOnBlur = coerceBooleanProperty(value); }
  _addOnBlur: boolean = false;

  /**
   * The list of key codes that will trigger a chipEnd event.
   *
   * Defaults to `[ENTER]`.
   */
  // TODO(tinayuangao): Support Set here
  @Input() separatorKeysCodes: number[] = [ENTER];

  /** Emitted when a chip is to be added. */
  @Output('mdChipEnd')
  chipEnd = new EventEmitter<MdChipInputEvent>();

  @Input('matChipList')
  set matChipList(value: MdChipList) { this.chipList = value; }

  @Input('matChipListAddOnBlur')
  get matAddOnBlur() { return this._addOnBlur; }
  set matAddOnBlur(value) { this.addOnBlur = value; }

  /** The native input element to which this directive is attached. */
  protected _inputElement: HTMLInputElement;

  constructor(protected _elementRef: ElementRef) {
    this._inputElement = this._elementRef.nativeElement as HTMLInputElement;
  }

  /** Utility method to make host definition/tests more clear. */
  _keydown(event?: KeyboardEvent) {
    this._emitChipEnd(event);
  }

  /** Checks to see if the blur should emit the (chipEnd) event. */
  _blur() {
    if (this.addOnBlur) {
      this._emitChipEnd();
    }
  }

  /** Checks to see if the (chipEnd) event needs to be emitted. */
  _emitChipEnd(event?: KeyboardEvent) {
    if (!event || this.separatorKeysCodes.indexOf(event.keyCode) > -1) {
      this.chipEnd.emit({ input: this._inputElement, value: this._inputElement.value });

      if (event) {
        event.preventDefault();
      }
    }
  }
}
