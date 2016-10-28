import {Injectable, EventEmitter, Output} from '@angular/core';
import {Observable} from 'rxjs/Observable';


/**
 * Class to coordinate unique selection based on name.
 * Intended to be consumed as an Angular service.
 * This service is needed because native radio change events are only fired on the item currently
 * being selected, and we still need to uncheck the previous selection.
 *
 * This service does not *store* any IDs and names because they may change at any time, so it is
 * less error-prone if they are simply passed through when the events occur.
 */
@Injectable()
export class MdSelectionModel {

  protected _selectedValues: any[];
  protected _selectionOptions: any[];
  protected _allowMulti: boolean;

  get selectedValues(): any[] {
    return this._selectedValues;
  }

  get allowMulti(): boolean {
    return this._allowMulti;
  }

  constructor(allowMulti = false, selectedValues: any[] = [], selectionOptions: any[] = []) {
    this._selectedValues = selectedValues;
    this._selectionOptions = selectionOptions;
    this._allowMulti = allowMulti;
  }

  select(value: any) : boolean {
    let isNotSelected = !this.isSelected(value);
    if (isNotSelected) {
      let removed: any[] = undefined;
      if (!this.allowMulti && this.isNotEmpty) {
        removed = [this.selectedValues[0]];
        this._removeValue(this.selectedValues[0]);
      }
      this.selectedValues.push(value);
      this._change.emit(new MdSelectionChangeEvent([value], removed));
    }
    return isNotSelected;
  }

  deselect(value: any): boolean {
    let isSelected = this.isSelected(value);
    if (isSelected) {
      this._removeValue(value);
      this._change.emit(new MdSelectionChangeEvent(undefined, [value]));
    }
    return isSelected;
  }

  clear(): void {
    let removed: any[] = [];
    for (let value of this.selectedValues) {
      this._removeValue(value);
      removed.push(value);
    }
    if (removed.length > 0) {
      this._change.emit(new MdSelectionChangeEvent(undefined, removed));
    }
  }

  selectAll(): void {
    let added: any[] = [];
    for (let value of this._selectionOptions) {
      if (!this.isSelected(value)) {
        this.selectedValues.push(value);
        added.push(value);
        // notify add
      }
    }
    if (added.length > 0) {
      this._change.emit(new MdSelectionChangeEvent(added));
    }
  }

  get isEmpty(): boolean {
    return !this.isNotEmpty;
  }

  get isNotEmpty(): boolean {
    return this.selectedValues.length > 0;
  }

  isSelected(value: any): boolean {
    return this.selectedValues.indexOf(value) >= 0;
  }

  setSelected(value: any, isSelect: boolean): void {
    if (isSelect) {
      this.select(value);
    } else {
      this.deselect(value);
    }
  }

  _removeValue(value: any) {
    let index = this.selectedValues.indexOf(value);
    this._selectedValues.splice(index, 1);
  }

  get selectedValue(): any {
    if (this.selectedValues.length > 0) {
      return this.selectedValues[0];
    }
    return undefined;
  }

  setValue(oldValue: any, newValue: any): void {
    let index = this.selectedValues.indexOf(oldValue);
    if (index >= 0) {
      this.selectedValues[index] = newValue;
    }

    index = this._selectionOptions.indexOf(oldValue);
    if (index >= 0) {
      this._selectionOptions[index] = newValue;
    } else {
      this._selectionOptions.push(newValue);
    }
  }

  private _change: EventEmitter<MdSelectionChangeEvent> = new EventEmitter<MdSelectionChangeEvent>();
  @Output() get change(): Observable<MdSelectionChangeEvent> {
    return this._change.asObservable();
  }
}

export class MdSelectionChangeEvent {
  added: any[];
  removed: any[];

  constructor(added?: any[], removed?: any[]) {
    this.added = added;
    this.removed = removed;
  }
}