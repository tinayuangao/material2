/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ActiveDescendantKeyManager} from '@angular/cdk/a11y';
import {Directionality} from '@angular/cdk/bidi';
import {coerceBooleanProperty} from '@angular/cdk/coercion';
import {SelectionModel} from '@angular/cdk/collections';
import {
  DOWN_ARROW,
  END,
  ENTER,
  ESCAPE,
  HOME,
  LEFT_ARROW,
  RIGHT_ARROW,
  SPACE,
  UP_ARROW,
} from '@angular/cdk/keycodes';
import {
  CdkConnectedOverlay,
  Overlay,
  RepositionScrollStrategy,
  ScrollStrategy,
  ViewportRuler,
} from '@angular/cdk/overlay';
import {
  AfterContentInit,
  Attribute,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ContentChildren,
  Directive,
  DoCheck,
  ElementRef,
  EventEmitter,
  Inject,
  InjectionToken,
  Input,
  isDevMode,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Optional,
  Output,
  QueryList,
  Self,
  SimpleChanges,
  TemplateRef,
  ViewChild,
  ViewChildren,
  ViewContainerRef,
  ViewEncapsulation,
} from '@angular/core';
import {ControlValueAccessor, FormGroupDirective, NgControl, NgForm} from '@angular/forms';
import {
  _countGroupLabelsBeforeOption,
  _getOptionScrollPosition,
  CanDisable,
  CanDisableRipple,
  CanUpdateErrorState,
  ErrorStateMatcher,
  HasTabIndex,
  MAT_OPTION_PARENT_COMPONENT,
  MatOptgroup,
  MatOption,
  MatOptionSelectionChange,
  mixinDisabled,
  mixinDisableRipple,
  mixinErrorState,
  mixinTabIndex,
} from '@angular/material/core';
import {MatFormField, MatFormFieldControl} from '@angular/material/form-field';
import {defer, merge, Observable, Subject} from 'rxjs';
import {filter, map, startWith, switchMap, take, takeUntil} from 'rxjs/operators';
import {matSelectAnimations} from './select-animations';
import {
  getMatSelectDynamicMultipleError,
  getMatSelectNonArrayValueError,
  getMatSelectNonFunctionValueError,
} from './select-errors';


let nextUniqueId = 0;

/**
 * The following style constants are necessary to save here in order
 * to properly calculate the alignment of the selected option over
 * the trigger element.
 */

/** The max height of the select's overlay panel */
export const SELECT_PANEL_MAX_HEIGHT = 256;

/** The panel's padding on the x-axis */
export const SELECT_PANEL_PADDING_X = 16;

/** The panel's x axis padding if it is indented (e.g. there is an option group). */
export const SELECT_PANEL_INDENT_PADDING_X = SELECT_PANEL_PADDING_X * 2;

/** The height of the select items in `em` units. */
export const SELECT_ITEM_HEIGHT_EM = 3;

/**
 * Distance between the panel edge and the option text in
 * multi-selection mode.
 *
 * (SELECT_PANEL_PADDING_X * 1.5) + 20 = 44
 * The padding is multiplied by 1.5 because the checkbox's margin is half the padding.
 * The checkbox width is 20px.
 */
export const SELECT_MULTIPLE_PANEL_PADDING_X = SELECT_PANEL_PADDING_X * 1.5 + 20;

/**
 * The select panel will only "fit" inside the viewport if it is positioned at
 * this value or more away from the viewport boundary.
 */
export const SELECT_PANEL_VIEWPORT_PADDING = 8;

/** Injection token that determines the scroll handling while a select is open. */
export const MAT_SELECT_SCROLL_STRATEGY =
    new InjectionToken<() => ScrollStrategy>('mat-select-scroll-strategy');

/** @docs-private */
export function MAT_SELECT_SCROLL_STRATEGY_PROVIDER_FACTORY(overlay: Overlay):
    () => RepositionScrollStrategy {
  return () => overlay.scrollStrategies.reposition();
}

/** @docs-private */
export const MAT_SELECT_SCROLL_STRATEGY_PROVIDER = {
  provide: MAT_SELECT_SCROLL_STRATEGY,
  deps: [Overlay],
  useFactory: MAT_SELECT_SCROLL_STRATEGY_PROVIDER_FACTORY,
};

/** Change event object that is emitted when the select value has changed. */
export class MatSelectChange<T> {
  constructor(
    /** Reference to the select that emitted the change event. */
    public source: MatSelect<T>,
    /** Current value of the select that emitted the event. */
    public value: any) { }
}

// Boilerplate for applying mixins to MatSelect.
/** @docs-private */
export class MatSelectBase {
  constructor(public _elementRef: ElementRef,
              public _defaultErrorStateMatcher: ErrorStateMatcher,
              public _parentForm: NgForm,
              public _parentFormGroup: FormGroupDirective,
              public ngControl: NgControl) {}
}
export const _MatSelectMixinBase = mixinDisableRipple(
    mixinTabIndex(mixinDisabled(mixinErrorState(MatSelectBase))));


/**
 * Allows the user to customize the trigger that is displayed when the select has a value.
 */
@Directive({
  selector: 'mat-select-trigger'
})
export class MatSelectTrigger {}

/** Directive to capture the template for displayed options. */
@Directive({selector: '[matOptionDef]'})
export class MatOptionDef {
  constructor(public templateRef: TemplateRef<any>) { }
}

/** Directive to mark where options should be projected. */
@Directive({selector: '[matOptionOutlet]'})
export class MatOptionOutlet {
  constructor(public viewContainerRef: ViewContainerRef) { }
}

@Component({
  moduleId: module.id,
  selector: 'mat-select',
  exportAs: 'matSelect',
  templateUrl: 'select.html',
  styleUrls: ['select.css'],
  inputs: ['disabled', 'disableRipple', 'tabIndex'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.role]': 'optionTemplate ? null : "listbox"',
    // '[attr.id]': 'id',
    // '[attr.tabindex]': 'tabIndex',
    // '[attr.aria-label]': '_ariaLabel',
    // '[attr.aria-labelledby]': 'ariaLabelledby',
    // '[attr.aria-required]': 'required.toString()',
    // '[attr.aria-disabled]': 'disabled.toString()',
    // '[attr.aria-invalid]': 'errorState',
    // '[attr.aria-owns]': 'panelOpen ? _optionIds : null',
    '[attr.aria-multiselectable]': 'optionTemplate ? null : multiple',
    // '[attr.aria-describedby]': '_ariaDescribedby || null',
    // '[attr.aria-activedescendant]': '_getAriaActiveDescendant()',
    '[class.mat-select-disabled]': 'disabled',
    '[class.mat-select-invalid]': 'errorState',
    '[class.mat-select-required]': 'required',
    'class': 'mat-select',
    '(keydown)': '_handleKeydown($event)',
    '(focus)': '_onFocus()',
    '(blur)': '_onBlur()',
  },
  animations: [
    matSelectAnimations.transformPanel,
    matSelectAnimations.fadeInContent
  ],
  providers: [
    {provide: MatFormFieldControl, useExisting: MatSelect},
    {provide: MAT_OPTION_PARENT_COMPONENT, useExisting: MatSelect}
  ],
})
export class MatSelect<T> extends _MatSelectMixinBase implements AfterContentInit, OnChanges,
    OnDestroy, OnInit, DoCheck, ControlValueAccessor, CanDisable, HasTabIndex,
    MatFormFieldControl<any>, CanUpdateErrorState, CanDisableRipple {

  filterText: string = '';
  filter(filterText: string) {
    if (this.optionFilterable) {
      this.filteredData = this.optionData.filter(data =>
        this.filterFunction(data, filterText));
    } else {
      this.filteredData = this.optionData;
    }
  }

  ngAfterViewInit() {
    this.optionOutlet.changes.subscribe(() => {
      this.renderPanel();
    });
  }

  renderPanel() {
    // In the real implementation this will use the `Overlay` service.
    Promise.resolve().then(() => {
      if (this.panelOpen && this.optionOutlet.first) {
        this.optionOutlet.first.viewContainerRef.clear();
        for (let i = 0; i < this.filteredData.length; i++) {
          this.optionOutlet.first.viewContainerRef.createEmbeddedView(
            this.optionTemplate.templateRef,
            {
              $implicit: this.filteredData[i],
              option: this.filteredData[i],
              index: i,
            });
        }
      }
    });
  }

  /** Whether or not the overlay panel is open. */
  private _panelOpen = false;

  /** Whether filling out the select is required in the form. */
  private _required: boolean = false;

  /** The scroll position of the overlay panel, calculated to center the selected option. */
  private _scrollTop = 0;

  /** The placeholder displayed in the trigger of the select. */
  private _placeholder: string;

  /** Whether the component is in multiple selection mode. */
  private _multiple: boolean = false;

  /** Comparison function to specify which option is displayed. Defaults to object equality. */
  private _compareWith = (o1: any, o2: any) => o1 === o2;

  /** Unique id for this input. */
  private _uid = `mat-select-${nextUniqueId++}`;

  /** Emits whenever the component is destroyed. */
  private readonly _destroy = new Subject<void>();

  /** Unique id for the select list. */
  _listboxId = `${this._uid}-list`;

  /** Unique id for the selected value label. */
  _labelId = `${this._uid}-label`;

  /** The last measured value for the trigger's client bounding rect. */
  _triggerRect: ClientRect;

  /** The aria-describedby attribute on the select for improved a11y. */
  _ariaDescribedby: string;

  /** The cached font-size of the trigger element. */
  _triggerFontSize = 0;

  /** Deals with the selection logic. */
  _selectionModel: SelectionModel<MatOption>;

  /** Delas with the selection data options. */
  _optionSelectionModel: SelectionModel<T>;

  /** Manages keyboard events for options in the panel. */
  _keyManager: ActiveDescendantKeyManager<MatOption>;

  /** `View -> model callback called when value changes` */
  _onChange: (value: any) => void = () => {};

  /** `View -> model callback called when select has been touched` */
  _onTouched = () => {};

  /** The IDs of child options to be passed to the aria-owns attribute. */
  _optionIds: string = '';

  /** The value of the select panel's transform-origin property. */
  _transformOrigin: string = 'top';

  /** Whether the panel's animation is done. */
  _panelDoneAnimating: boolean = false;

  /** Strategy that will be used to handle scrolling while the select panel is open. */
  _scrollStrategy = this._scrollStrategyFactory();

  /**
   * The y-offset of the overlay panel in relation to the trigger's top start corner.
   * This must be adjusted to align the selected option text over the trigger text.
   * when the panel opens. Will change based on the y-position of the selected option.
   */
  _offsetY = 0;

  /**
   * This position config ensures that the top "start" corner of the overlay
   * is aligned with with the top "start" of the origin by default (overlapping
   * the trigger completely). If the panel cannot fit below the trigger, it
   * will fall back to a position above the trigger.
   */
  _positions = [
    {
      originX: 'start',
      originY: 'top',
      overlayX: 'start',
      overlayY: 'top',
    },
    {
      originX: 'start',
      originY: 'bottom',
      overlayX: 'start',
      overlayY: 'bottom',
    },
  ];

  /** Whether the component is disabling centering of the active option over the trigger. */
  private _disableOptionCentering: boolean = false;

  /** Whether the select is focused. */
  focused: boolean = false;

  /** A name for this control that can be used by `mat-form-field`. */
  controlType = 'mat-select';

  /** Filtered data options. If there's no filter function, it's the same as `optionData`. */
  filteredData: T[] = [];

  /** Trigger that opens the select. */
  @ViewChild('trigger') trigger: ElementRef;

  /** Panel containing the select options. */
  @ViewChild('panel') panel: ElementRef;

  /** Overlay pane containing the options. */
  @ViewChild(CdkConnectedOverlay) overlayDir: CdkConnectedOverlay;

  /** All of the defined select options. */
  @ContentChildren(MatOption, { descendants: true }) options: QueryList<MatOption>;

  /** All of the defined groups of options. */
  @ContentChildren(MatOptgroup) optionGroups: QueryList<MatOptgroup>;

  /** Classes to be passed to the select panel. Supports the same syntax as `ngClass`. */
  @Input() panelClass: string|string[]|Set<string>|{[key: string]: any};

  /** User-supplied override of the trigger element. */
  @ContentChild(MatSelectTrigger) customTrigger: MatSelectTrigger;

  /** User-defined option template. */
  @ContentChild(MatOptionDef) optionTemplate: MatOptionDef;

  /** The option outlet to render the option data. */
  @ViewChildren(MatOptionOutlet) optionOutlet: QueryList<MatOptionOutlet>;

  /**
   * Transform function to tranform data object to string for accessiblity
   */
  @Input()
  optionTextTransform: (T) => string = o => `${o}`;

  /**
   * The filter function to filter the option list.
   * The input box for filter only display when there's a filter function.
   */
  @Input()
  filterFunction: ((T, string) => boolean) =   (opt: {}, filterText: string) => {
    return `${opt}`.indexOf(filterText) > -1;
  };

  /** Whether we have a input box to filter the options. */
  @Input()
  optionFilterable: boolean;

  /** Options data for template style select list. */
  @Input()
  get optionData(): T[] { return this._optionData; }
  set optionData(value: T[]) {
    this._optionData = value;
    this.filteredData = this._optionData;
    this.stateChanges.next();
  }
  private _optionData: T[] = [];

  /** Placeholder to be shown if no value has been selected. */
  @Input()
  get placeholder(): string { return this._placeholder; }
  set placeholder(value: string) {
    this._placeholder = value;
    this.stateChanges.next();
  }

  /** Whether the component is required. */
  @Input()
  get required(): boolean { return this._required; }
  set required(value: boolean) {
    this._required = coerceBooleanProperty(value);
    this.stateChanges.next();
  }

  /** Whether the user should be allowed to select multiple options. */
  @Input()
  get multiple(): boolean { return this._multiple; }
  set multiple(value: boolean) {
    if (this._selectionModel || this._optionSelectionModel) {
      throw getMatSelectDynamicMultipleError();
    }

    this._multiple = coerceBooleanProperty(value);
  }

  /** Whether to center the active option over the trigger. */
  @Input()
  get disableOptionCentering(): boolean { return this._disableOptionCentering; }
  set disableOptionCentering(value: boolean) {
    this._disableOptionCentering = coerceBooleanProperty(value);
  }

  /**
   * A function to compare the option values with the selected values. The first argument
   * is a value from an option. The second is a value from the selection. A boolean
   * should be returned.
   */
  @Input()
  get compareWith() { return this._compareWith; }
  set compareWith(fn: (o1: any, o2: any) => boolean) {
    if (typeof fn !== 'function') {
      throw getMatSelectNonFunctionValueError();
    }
    this._compareWith = fn;
    if (this._selectionModel) {
      // A different comparator means the selection could change.
      this._initializeSelection();
    }
  }

  /** Value of the select control. */
  @Input()
  get value(): any { return this._value; }
  set value(newValue: any) {
    if (newValue !== this._value) {
      this.writeValue(newValue);
      this._value = newValue;
    }
  }
  private _value: any;

  /** Aria label of the select. If not specified, the placeholder will be used as label. */
  @Input('aria-label') ariaLabel: string = '';

  /** Input that can be used to specify the `aria-labelledby` attribute. */
  @Input('aria-labelledby')
  get ariaLabelledby(): string {
    return `${this._ariaLabelledby} ${this._labelId}`;
  }
  set ariaLabelledby(value: string) {
    this._ariaLabelledby = value;
  }
  _ariaLabelledby: string = '';


  /** An object used to control when error messages are shown. */
  @Input() errorStateMatcher: ErrorStateMatcher;

  /** Unique id of the element. */
  @Input()
  get id(): string { return this._id; }
  set id(value: string) {
    this._id = value || this._uid;
    this.stateChanges.next();
  }
  private _id: string;

  /** Combined stream of all of the child options' change events. */
  readonly optionSelectionChanges: Observable<MatOptionSelectionChange> = defer(() => {
    if (this.options) {
      return merge(...this.options.map(option => option.onSelectionChange));
    }

    return this._ngZone.onStable
      .asObservable()
      .pipe(take(1), switchMap(() => this.optionSelectionChanges));
  });

   /** Event emitted when the select panel has been toggled. */
   @Output() readonly openedChange: EventEmitter<boolean> = new EventEmitter<boolean>();

  /** Event emitted when the select has been opened. */
  @Output('opened') readonly _openedStream: Observable<void> =
      this.openedChange.pipe(filter(o => o), map(() => {}));

  /** Event emitted when the select has been closed. */
  @Output('closed') readonly _closedStream: Observable<void> =
      this.openedChange.pipe(filter(o => !o), map(() => {}));

   /** Event emitted when the selected value has been changed by the user. */
  @Output() readonly selectionChange: EventEmitter<MatSelectChange<T>> =
      new EventEmitter<MatSelectChange<T>>();

  /**
   * Event that emits whenever the raw value of the select changes. This is here primarily
   * to facilitate the two-way binding for the `value` input.
   * @docs-private
   */
  @Output() readonly valueChange: EventEmitter<any> = new EventEmitter<any>();

  constructor(
    private _viewportRuler: ViewportRuler,
    private _changeDetectorRef: ChangeDetectorRef,
    private _ngZone: NgZone,
    _defaultErrorStateMatcher: ErrorStateMatcher,
    elementRef: ElementRef,
    @Optional() private _dir: Directionality,
    @Optional() _parentForm: NgForm,
    @Optional() _parentFormGroup: FormGroupDirective,
    @Optional() private _parentFormField: MatFormField,
    @Self() @Optional() public ngControl: NgControl,
    @Attribute('tabindex') tabIndex: string,
    @Inject(MAT_SELECT_SCROLL_STRATEGY) private _scrollStrategyFactory) {
    super(elementRef, _defaultErrorStateMatcher, _parentForm,
          _parentFormGroup, ngControl);

    if (this.ngControl) {
      // Note: we provide the value accessor through here, instead of
      // the `providers` to avoid running into a circular import.
      this.ngControl.valueAccessor = this;
    }

    this.tabIndex = parseInt(tabIndex) || 0;

    // Force setter to be called in case id was not specified.
    this.id = this.id;
  }

  ngOnInit() {
    this._selectionModel = new SelectionModel<MatOption>(this.multiple, undefined, false);
    this._optionSelectionModel = new SelectionModel<T>(this.multiple, undefined, false);
    this.stateChanges.next();
  }

  ngAfterContentInit() {
    this._initKeyManager();

    this.options.changes.pipe(startWith(null), takeUntil(this._destroy)).subscribe(() => {
      this._resetOptions();
      this._initializeSelection();
    });
  }

  ngDoCheck() {
    if (this.ngControl) {
      this.updateErrorState();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Updating the disabled state is handled by `mixinDisabled`, but we need to additionally let
    // the parent form field know to run change detection when the disabled state changes.
    if (changes.disabled) {
      this.stateChanges.next();
    }
  }

  ngOnDestroy() {
    this._destroy.next();
    this._destroy.complete();
    this.stateChanges.complete();
  }

  /** Toggles the overlay panel open or closed. */
  toggle(): void {
    this.panelOpen ? this.close() : this.open();
  }

  /** Opens the overlay panel. */
  open(): void {
    const useTemplate = this.optionTemplate && this.optionData && this.optionData.length;
    const hasOptions = (this.options && this.options.length) || useTemplate;
    if (this.disabled || !hasOptions || this._panelOpen) {
      return;
    }

    this._triggerRect = this.trigger.nativeElement.getBoundingClientRect();
    // Note: The computed font-size will be a string pixel value (e.g. "16px").
    // `parseInt` ignores the trailing 'px' and converts this to a number.
    this._triggerFontSize = parseInt(getComputedStyle(this.trigger.nativeElement)['font-size']);

    this._panelOpen = true;
    this._keyManager.withHorizontalOrientation(null);
    this._calculateOverlayPosition();
    this._highlightCorrectOption();
    this._changeDetectorRef.markForCheck();

    // Set the font size on the panel element once it exists.
    this._ngZone.onStable.asObservable().pipe(take(1)).subscribe(() => {
      if (this._triggerFontSize && this.overlayDir.overlayRef &&
          this.overlayDir.overlayRef.overlayElement) {
        this.overlayDir.overlayRef.overlayElement.style.fontSize = `${this._triggerFontSize}px`;
      }
    });
  }

  /** Closes the overlay panel and focuses the host element. */
  close(): void {
    if (this._panelOpen) {
      this._panelOpen = false;
      this.filteredData = this._optionData; // Reset options
      this._keyManager.withHorizontalOrientation(this._isRtl() ? 'rtl' : 'ltr');
      this._changeDetectorRef.markForCheck();
      this._onTouched();
    }
  }

  /**
   * Sets the select's value. Part of the ControlValueAccessor interface
   * required to integrate with Angular's core forms API.
   *
   * @param value New value to be written to the model.
   */
  writeValue(value: T): void {
    if (this.options) {
      this._setSelectionByValue(value);
    }
    if (this.optionData) {
      this._setSelectionOptionByValue(value);
    }
    this._value = value;
  }

  /**
   * Saves a callback function to be invoked when the select's value
   * changes from user input. Part of the ControlValueAccessor interface
   * required to integrate with Angular's core forms API.
   *
   * @param fn Callback to be triggered when the value changes.
   */
  registerOnChange(fn: (value: any) => void): void {
    this._onChange = fn;
  }

  /**
   * Saves a callback function to be invoked when the select is blurred
   * by the user. Part of the ControlValueAccessor interface required
   * to integrate with Angular's core forms API.
   *
   * @param fn Callback to be triggered when the component has been touched.
   */
  registerOnTouched(fn: () => {}): void {
    this._onTouched = fn;
  }

  /**
   * Disables the select. Part of the ControlValueAccessor interface required
   * to integrate with Angular's core forms API.
   *
   * @param isDisabled Sets whether the component is disabled.
   */
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this._changeDetectorRef.markForCheck();
    this.stateChanges.next();
  }

  /** Whether or not the overlay panel is open. */
  get panelOpen(): boolean {
    return this._panelOpen;
  }

  /** The currently selected option. */
  get selected(): MatOption | MatOption[] {
    return this.multiple ? this._selectionModel.selected : this._selectionModel.selected[0];
  }

  /** The current selected option data's value */
  get selectedValue(): any {
    return this.multiple
      ? this._optionSelectionModel.selected
      : this._optionSelectionModel.selected[0];
  }

  /** The value displayed in the trigger. */
  get triggerValue(): string {
    if (this.empty) {
      return '';
    }

    if (this.optionTemplate) {
      return this.multiple
          ? this._optionSelectionModel.selected
              .map(option => this.optionTextTransform(option)).join(', ')
          : this.optionTextTransform(this._optionSelectionModel.selected[0]);
    }

    if (this._multiple) {
      const selectedOptions = this._selectionModel.selected.map(option => option.viewValue);

      if (this._isRtl()) {
        selectedOptions.reverse();
      }

      // TODO(crisbeto): delimiter should be configurable for proper localization.
      return selectedOptions.join(', ');
    }

    return this._selectionModel.selected[0].viewValue;
  }

  /** Whether the element is in RTL mode. */
  _isRtl(): boolean {
    return this._dir ? this._dir.value === 'rtl' : false;
  }

  /** Handles all keydown events on the select. */
  _handleKeydown(event: KeyboardEvent): void {
    if (!this.disabled) {
      this.panelOpen ? this._handleOpenKeydown(event) : this._handleClosedKeydown(event);
    }
  }

  /** Handles keyboard events while the select is closed. */
  private _handleClosedKeydown(event: KeyboardEvent): void {
    const keyCode = event.keyCode;
    const isArrowKey = keyCode === DOWN_ARROW || keyCode === UP_ARROW ||
        keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW;
    const isOpenKey = keyCode === ENTER || keyCode === SPACE;

    // Open the select on ALT + arrow key to match the native <select>
    if (isOpenKey || ((this.multiple || event.altKey) && isArrowKey)) {
      event.preventDefault(); // prevents the page from scrolling down when pressing space
      this.open();
    } else if (!this.multiple) {
      this._keyManager.onKeydown(event);
    }
  }

  /** Handles keyboard events when the selected is open. */
  private _handleOpenKeydown(event: KeyboardEvent): void {
    const keyCode = event.keyCode;
    const isArrowKey = keyCode === DOWN_ARROW || keyCode === UP_ARROW;
    const manager = this._keyManager;

    if (keyCode === HOME || keyCode === END) {
      event.preventDefault();
      keyCode === HOME ? manager.setFirstItemActive() : manager.setLastItemActive();
    } else if (isArrowKey && event.altKey || keyCode === ESCAPE) {
      // Close the select on ALT + arrow key to match the native <select>
      event.preventDefault();
      this.close();
    } else if ((keyCode === ENTER || keyCode === SPACE) && manager.activeItem) {
      event.preventDefault();
      manager.activeItem._selectViaInteraction();
    } else {
      const previouslyFocusedIndex = manager.activeItemIndex;

      manager.onKeydown(event);

      if (this._multiple && isArrowKey && event.shiftKey && manager.activeItem &&
          manager.activeItemIndex !== previouslyFocusedIndex) {
        manager.activeItem._selectViaInteraction();
      }
    }
  }

  /**
   * When the panel element is finished transforming in (though not fading in), it
   * emits an event and focuses an option if the panel is open.
   */
  _onPanelDone(): void {
    if (this.panelOpen) {
      this._scrollTop = 0;
      this.openedChange.emit(true);
    } else {
      this.openedChange.emit(false);
      this._panelDoneAnimating = false;
      this.overlayDir.offsetX = 0;
      this._changeDetectorRef.markForCheck();
    }
  }

  /**
   * When the panel content is done fading in, the _panelDoneAnimating property is
   * set so the proper class can be added to the panel.
   */
  _onFadeInDone(): void {
    this._panelDoneAnimating = this.panelOpen;
    this._changeDetectorRef.markForCheck();
  }

  _onFocus() {
    if (!this.disabled) {
      this.focused = true;
      this.stateChanges.next();
    }
  }

  /**
   * Calls the touched callback only if the panel is closed. Otherwise, the trigger will
   * "blur" to the panel when it opens, causing a false positive.
   */
  _onBlur() {
    this.focused = false;

    if (!this.disabled && !this.panelOpen) {
      this._onTouched();
      this._changeDetectorRef.markForCheck();
      this.stateChanges.next();
    }
  }

  /**
   * Callback that is invoked when the overlay panel has been attached.
   */
  _onAttached(): void {
    this.overlayDir.positionChange.pipe(take(1)).subscribe(() => {
      this._changeDetectorRef.detectChanges();
      this._calculateOverlayOffsetX();
      this.panel.nativeElement.scrollTop = this._scrollTop;
    });
  }

  /** Returns the theme to be used on the panel. */
  _getPanelTheme(): string {
    return this._parentFormField ? `mat-${this._parentFormField.color}` : '';
  }

  /** Whether the select has a value. */
  get empty(): boolean {
    return (!this._selectionModel || this._selectionModel.isEmpty()) &&
        (!this._optionSelectionModel || this._optionSelectionModel.isEmpty());
  }

  private _initializeSelection(): void {
    // Defer setting the value in order to avoid the "Expression
    // has changed after it was checked" errors from Angular.
    Promise.resolve().then(() => {
      const value = this.ngControl ? this.ngControl.value : this._value;
      this._setSelectionByValue(value);
      if (this.optionTemplate) {
        this._setSelectionOptionByValue(value);
      }
    });
  }

  /**
   * Sets the selected option based on a value. If no option can be
   * found with the designated value, the select trigger is cleared.
   */
  private _setSelectionByValue(value: any | any[], isUserInput = false): void {
    if (this.multiple && value) {
      if (!Array.isArray(value)) {
        throw getMatSelectNonArrayValueError();
      }

      this._clearSelection(); // MatOption
      value.forEach((currentValue: any) => this._selectValue(currentValue, isUserInput));
      this._sortValues(); // MatOption
    } else {
      this._clearSelection();

      const correspondingOption = this._selectValue(value, isUserInput);

      // Shift focus to the active item. Note that we shouldn't do this in multiple
      // mode, because we don't know what option the user interacted with last.
      if (correspondingOption) {
        this._keyManager.setActiveItem(correspondingOption); // MatOption
      }
    }

    this._changeDetectorRef.markForCheck();
  }

  /** Sets the selected option data in its selection model. */
  private _setSelectionOptionByValue(value: any | any[]): void {
    if (!this._optionSelectionModel || !this.optionTemplate) { return; }
    this._optionSelectionModel.clear();
    if (this.multiple && value && Array.isArray(value)) {
      value.forEach((currentValue: any) => this._optionSelectionModel.select(currentValue));
    } else if (value) {
      this._optionSelectionModel.select(value as T);
    }
  }

  /**
   * Finds and selects and option based on its value.
   * @returns Option that has the corresponding value.
   */
  private _selectValue(value: any, isUserInput = false): MatOption | undefined {
    const correspondingOption = this.options.find((option: MatOption) => {
      try {
        // Treat null as a special reset value.
        return option.value != null && this._compareWith(option.value,  value);
      } catch (error) {
        if (isDevMode()) {
          // Notify developers of errors in their comparator.
          console.warn(error);
        }
        return false;
      }
    });

    if (correspondingOption) {
      isUserInput ? correspondingOption._selectViaInteraction() : correspondingOption.select();
      this._selectionModel.select(correspondingOption);
      this.stateChanges.next();
    }

    return correspondingOption;
  }


  /**
   * Clears the select trigger and deselects every option in the list.
   * @param skip Option that should not be deselected.
   */
  private _clearSelection(skip?: MatOption): void {
    this._selectionModel.clear();
    this.options.forEach(option => {
      if (option !== skip) {
        option.deselect();
      }
    });
    this.stateChanges.next();
  }

  /** Sets up a key manager to listen to keyboard events on the overlay panel. */
  private _initKeyManager() {
    this._keyManager = new ActiveDescendantKeyManager<MatOption>(this.options)
      .withTypeAhead()
      .withVerticalOrientation()
      .withHorizontalOrientation(this._isRtl() ? 'rtl' : 'ltr');

    this._keyManager.tabOut.pipe(takeUntil(this._destroy)).subscribe(() => {
      // Restore focus to the trigger before closing. Ensures that the focus
      // position won't be lost if the user got focus into the overlay.
      this.focus();
      this.close();
    });

    this._keyManager.change.pipe(takeUntil(this._destroy)).subscribe(() => {
      if (this._panelOpen && this.panel) {
        this._scrollActiveOptionIntoView();
      } else if (!this._panelOpen && !this.multiple && this._keyManager.activeItem) {
        this._keyManager.activeItem._selectViaInteraction();
      }
    });
  }

  /** Drops current option subscriptions and IDs and resets from scratch. */
  private _resetOptions(): void {
    const changedOrDestroyed = merge(this.options.changes, this._destroy);
    this.optionSelectionChanges
      .pipe(takeUntil(changedOrDestroyed), filter(event => event.isUserInput))
      .subscribe(event => {
        this._onSelect(event.source);

        if (!this.multiple && this._panelOpen) {
          this.close();
          this.focus();
        }
      });

    // Listen to changes in the internal state of the options and react accordingly.
    // Handles cases like the labels of the selected options changing.
    merge(...this.options.map(option => option._stateChanges))
      .pipe(takeUntil(changedOrDestroyed))
      .subscribe(() => {
        this._changeDetectorRef.markForCheck();
        this.stateChanges.next();
      });

    this._setOptionIds();
  }

  /** Invoked when an option is clicked. */
  private _onSelect(option: MatOption): void {
    const wasSelected = this._selectionModel.isSelected(option);

    // TODO(crisbeto): handle blank/null options inside multi-select.
    if (this.multiple) {
      this._selectionModel.toggle(option);
      this._optionSelectionModel.toggle(option.value);
      this.stateChanges.next();
      wasSelected ? option.deselect() : option.select();
      this._keyManager.setActiveItem(option);
      this._sortValues();

      // In case the user select the option with their mouse, we
      // want to restore focus back to the trigger, in order to
      // prevent the select keyboard controls from clashing with
      // the ones from `mat-option`.
      this.focus();
    } else {
      this._clearSelection(option.value == null ? undefined : option);

      if (option.value == null) {
        this._propagateChanges(option.value);
      } else {
        this._selectionModel.select(option);
        this._optionSelectionModel.select(option.value);
        this.stateChanges.next();
      }
    }

    if (wasSelected !== this._selectionModel.isSelected(option)) {
      this._propagateChanges();
    }
  }

  /**
   * Sorts the model values, ensuring that they keep the same
   * order that they have in the panel.
   */
  private _sortValues(): void {
    if (this._multiple) {
      this._selectionModel.clear();

      this.options.forEach(option => {
        if (option.selected) {
          this._selectionModel.select(option);
        }
      });
      this.stateChanges.next();
    }
  }

  /** Emits change event to set the model value. */
  private _propagateChanges(fallbackValue?: any): void {
    let valueToEmit: any = null;

    if (this.optionTemplate) {
      valueToEmit =
          this.selectedValue ? this.selectedValue : fallbackValue;
    } else {
      if (this.multiple) {
        valueToEmit = (this.selected as MatOption[]).map(option => option.value);
      } else {
        valueToEmit = this.selected ? (this.selected as MatOption).value : fallbackValue;
      }
    }

    this._value = valueToEmit;
    this.valueChange.emit(valueToEmit);
    this._onChange(valueToEmit);
    this.selectionChange.emit(new MatSelectChange(this, valueToEmit));
    this._changeDetectorRef.markForCheck();
  }

  /** Records option IDs to pass to the aria-owns property. */
  private _setOptionIds() {
    this._optionIds = this.options.map(option => option.id).join(' ');
  }

  /**
   * Highlights the selected item. If no option is selected, it will highlight
   * the first item instead.
   */
  private _highlightCorrectOption(): void {
    if (this._keyManager) {
      if (this.empty) {
        this._keyManager.setFirstItemActive();
      } else {
        this._keyManager.setActiveItem(this._selectionModel.selected[0]);
      }
    }
  }

  /** Scrolls the active option into view. */
  private _scrollActiveOptionIntoView(): void {
    const activeOptionIndex = this._keyManager.activeItemIndex || 0;
    const labelCount = _countGroupLabelsBeforeOption(activeOptionIndex, this.options,
        this.optionGroups);

    this.panel.nativeElement.scrollTop = _getOptionScrollPosition(
      activeOptionIndex + labelCount,
      this._getItemHeight(),
      this.panel.nativeElement.scrollTop,
      SELECT_PANEL_MAX_HEIGHT
    );
  }

  /** Focuses the select element. */
  focus(): void {
    this._elementRef.nativeElement.focus();
  }

  /** Gets the index of the provided option in the option list. */
  private _getOptionIndex(option: MatOption): number | undefined {
    return this.options.reduce((result: number, current: MatOption, index: number) => {
      return result === undefined ? (option === current ? index : undefined) : result;
    }, undefined);
  }

  /** Calculates the scroll position and x- and y-offsets of the overlay panel. */
  private _calculateOverlayPosition(): void {
    const itemHeight = this._getItemHeight();
    const items = this._getItemCount();
    const panelHeight = Math.min(items * itemHeight, SELECT_PANEL_MAX_HEIGHT);
    const scrollContainerHeight = items * itemHeight;

    // The farthest the panel can be scrolled before it hits the bottom
    const maxScroll = scrollContainerHeight - panelHeight;

    // If no value is selected we open the popup to the first item.
    let selectedOptionOffset =
        this.empty ? 0 : this._getOptionIndex(this._selectionModel.selected[0])!;

    selectedOptionOffset += _countGroupLabelsBeforeOption(selectedOptionOffset, this.options,
        this.optionGroups);

    // We must maintain a scroll buffer so the selected option will be scrolled to the
    // center of the overlay panel rather than the top.
    const scrollBuffer = panelHeight / 2;
    this._scrollTop = this._calculateOverlayScroll(selectedOptionOffset, scrollBuffer, maxScroll);
    this._offsetY = this._calculateOverlayOffsetY(selectedOptionOffset, scrollBuffer, maxScroll);

    this._checkOverlayWithinViewport(maxScroll);
  }

  /**
   * Calculates the scroll position of the select's overlay panel.
   *
   * Attempts to center the selected option in the panel. If the option is
   * too high or too low in the panel to be scrolled to the center, it clamps the
   * scroll position to the min or max scroll positions respectively.
   */
  _calculateOverlayScroll(selectedIndex: number, scrollBuffer: number,
                          maxScroll: number): number {
    const itemHeight = this._getItemHeight();
    const optionOffsetFromScrollTop = itemHeight * selectedIndex;
    const halfOptionHeight = itemHeight / 2;

    // Starts at the optionOffsetFromScrollTop, which scrolls the option to the top of the
    // scroll container, then subtracts the scroll buffer to scroll the option down to
    // the center of the overlay panel. Half the option height must be re-added to the
    // scrollTop so the option is centered based on its middle, not its top edge.
    const optimalScrollPosition = optionOffsetFromScrollTop - scrollBuffer + halfOptionHeight;
    return Math.min(Math.max(0, optimalScrollPosition), maxScroll);
  }

  get optionIds() {
    return this.optionTemplate ? this._listboxId : (this.panelOpen ? this._optionIds : null);
  }

  /** Returns the aria-label of the select component. */
  get _ariaLabel(): string | null {
    // If an ariaLabelledby value has been set, the select should not overwrite the
    // `aria-labelledby` value by setting the ariaLabel to the placeholder.
    return this.ariaLabelledby ? null : this.ariaLabel || this.placeholder;
  }

  /** Determines the `aria-activedescendant` to be set on the host. */
  _getAriaActiveDescendant(): string | null {
    if (this.panelOpen && this._keyManager && this._keyManager.activeItem) {
      return this.optionTemplate
          ? `${this._listboxId}-opt-${this._keyManager.activeItemIndex}`
          : this._keyManager.activeItem.id;
    }

    return null;
  }

  /**
   * Sets the x-offset of the overlay panel in relation to the trigger's top start corner.
   * This must be adjusted to align the selected option text over the trigger text when
   * the panel opens. Will change based on LTR or RTL text direction. Note that the offset
   * can't be calculated until the panel has been attached, because we need to know the
   * content width in order to constrain the panel within the viewport.
   */
  private _calculateOverlayOffsetX(): void {
    const overlayRect = this.overlayDir.overlayRef.overlayElement.getBoundingClientRect();
    const viewportSize = this._viewportRuler.getViewportSize();
    const isRtl = this._isRtl();
    const paddingWidth = this.multiple ? SELECT_MULTIPLE_PANEL_PADDING_X + SELECT_PANEL_PADDING_X :
                                         SELECT_PANEL_PADDING_X * 2;
    let offsetX: number;

    // Adjust the offset, depending on the option padding.
    if (this.multiple) {
      offsetX = SELECT_MULTIPLE_PANEL_PADDING_X;
    } else {
      let selected = this._selectionModel.selected[0] || this.options.first;
      offsetX = selected && selected.group ? SELECT_PANEL_INDENT_PADDING_X : SELECT_PANEL_PADDING_X;
    }

    // Invert the offset in LTR.
    if (!isRtl) {
      offsetX *= -1;
    }

    // Determine how much the select overflows on each side.
    const leftOverflow = 0 - (overlayRect.left + offsetX - (isRtl ? paddingWidth : 0));
    const rightOverflow = overlayRect.right + offsetX - viewportSize.width
                          + (isRtl ? 0 : paddingWidth);

    // If the element overflows on either side, reduce the offset to allow it to fit.
    if (leftOverflow > 0) {
      offsetX += leftOverflow + SELECT_PANEL_VIEWPORT_PADDING;
    } else if (rightOverflow > 0) {
      offsetX -= rightOverflow + SELECT_PANEL_VIEWPORT_PADDING;
    }

    // Set the offset directly in order to avoid having to go through change detection and
    // potentially triggering "changed after it was checked" errors.
    this.overlayDir.offsetX = offsetX;
    this.overlayDir.overlayRef.updatePosition();
  }

  /**
   * Calculates the y-offset of the select's overlay panel in relation to the
   * top start corner of the trigger. It has to be adjusted in order for the
   * selected option to be aligned over the trigger when the panel opens.
   */
  private _calculateOverlayOffsetY(selectedIndex: number, scrollBuffer: number,
                                  maxScroll: number): number {
    const itemHeight = this._getItemHeight();
    const optionHeightAdjustment = (itemHeight - this._triggerRect.height) / 2;
    const maxOptionsDisplayed = Math.floor(SELECT_PANEL_MAX_HEIGHT / itemHeight);
    let optionOffsetFromPanelTop: number;

    // Disable offset if requested by user by returning 0 as value to offset
    if (this._disableOptionCentering) {
      return 0;
    }

    if (this._scrollTop === 0) {
      optionOffsetFromPanelTop = selectedIndex * itemHeight;
    } else if (this._scrollTop === maxScroll) {
      const firstDisplayedIndex = this._getItemCount() - maxOptionsDisplayed;
      const selectedDisplayIndex = selectedIndex - firstDisplayedIndex;

      // The first item is partially out of the viewport. Therefore we need to calculate what
      // portion of it is shown in the viewport and account for it in our offset.
      let partialItemHeight =
          itemHeight - (this._getItemCount() * itemHeight - SELECT_PANEL_MAX_HEIGHT) % itemHeight;

      // Because the panel height is longer than the height of the options alone,
      // there is always extra padding at the top or bottom of the panel. When
      // scrolled to the very bottom, this padding is at the top of the panel and
      // must be added to the offset.
      optionOffsetFromPanelTop = selectedDisplayIndex * itemHeight + partialItemHeight;
    } else {
      // If the option was scrolled to the middle of the panel using a scroll buffer,
      // its offset will be the scroll buffer minus the half height that was added to
      // center it.
      optionOffsetFromPanelTop = scrollBuffer - itemHeight / 2;
    }

    // The final offset is the option's offset from the top, adjusted for the height
    // difference, multiplied by -1 to ensure that the overlay moves in the correct
    // direction up the page.
    return optionOffsetFromPanelTop * -1 - optionHeightAdjustment;
  }

  /**
   * Checks that the attempted overlay position will fit within the viewport.
   * If it will not fit, tries to adjust the scroll position and the associated
   * y-offset so the panel can open fully on-screen. If it still won't fit,
   * sets the offset back to 0 to allow the fallback position to take over.
   */
  private _checkOverlayWithinViewport(maxScroll: number): void {
    const itemHeight = this._getItemHeight();
    const viewportSize = this._viewportRuler.getViewportSize();

    const topSpaceAvailable = this._triggerRect.top - SELECT_PANEL_VIEWPORT_PADDING;
    const bottomSpaceAvailable =
        viewportSize.height - this._triggerRect.bottom - SELECT_PANEL_VIEWPORT_PADDING;

    const panelHeightTop = Math.abs(this._offsetY);
    const totalPanelHeight =
        Math.min(this._getItemCount() * itemHeight, SELECT_PANEL_MAX_HEIGHT);
    const panelHeightBottom = totalPanelHeight - panelHeightTop - this._triggerRect.height;

    if (panelHeightBottom > bottomSpaceAvailable) {
      this._adjustPanelUp(panelHeightBottom, bottomSpaceAvailable);
    } else if (panelHeightTop > topSpaceAvailable) {
     this._adjustPanelDown(panelHeightTop, topSpaceAvailable, maxScroll);
    } else {
      this._transformOrigin = this._getOriginBasedOnOption();
    }
  }

  /** Adjusts the overlay panel up to fit in the viewport. */
  private _adjustPanelUp(panelHeightBottom: number, bottomSpaceAvailable: number) {
    // Browsers ignore fractional scroll offsets, so we need to round.
    const distanceBelowViewport = Math.round(panelHeightBottom - bottomSpaceAvailable);

    // Scrolls the panel up by the distance it was extending past the boundary, then
    // adjusts the offset by that amount to move the panel up into the viewport.
    this._scrollTop -= distanceBelowViewport;
    this._offsetY -= distanceBelowViewport;
    this._transformOrigin = this._getOriginBasedOnOption();

    // If the panel is scrolled to the very top, it won't be able to fit the panel
    // by scrolling, so set the offset to 0 to allow the fallback position to take
    // effect.
    if (this._scrollTop <= 0) {
      this._scrollTop = 0;
      this._offsetY = 0;
      this._transformOrigin = `50% bottom 0px`;
    }
  }

  /** Adjusts the overlay panel down to fit in the viewport. */
  private _adjustPanelDown(panelHeightTop: number, topSpaceAvailable: number,
                           maxScroll: number) {
    // Browsers ignore fractional scroll offsets, so we need to round.
    const distanceAboveViewport = Math.round(panelHeightTop - topSpaceAvailable);

    // Scrolls the panel down by the distance it was extending past the boundary, then
    // adjusts the offset by that amount to move the panel down into the viewport.
    this._scrollTop += distanceAboveViewport;
    this._offsetY += distanceAboveViewport;
    this._transformOrigin = this._getOriginBasedOnOption();

    // If the panel is scrolled to the very bottom, it won't be able to fit the
    // panel by scrolling, so set the offset to 0 to allow the fallback position
    // to take effect.
    if (this._scrollTop >= maxScroll) {
      this._scrollTop = maxScroll;
      this._offsetY = 0;
      this._transformOrigin = `50% top 0px`;
      return;
    }
  }

  /** Sets the transform origin point based on the selected option. */
  private _getOriginBasedOnOption(): string {
    const itemHeight = this._getItemHeight();
    const optionHeightAdjustment = (itemHeight - this._triggerRect.height) / 2;
    const originY = Math.abs(this._offsetY) - optionHeightAdjustment + itemHeight / 2;
    return `50% ${originY}px 0px`;
  }

  /** Calculates the amount of items in the select. This includes options and group labels. */
  private _getItemCount(): number {
    return this.options.length + this.optionGroups.length;
  }

  /** Calculates the height of the select's options. */
  private _getItemHeight(): number {
    return this._triggerFontSize * SELECT_ITEM_HEIGHT_EM;
  }

  /**
   * Implemented as part of MatFormFieldControl.
   * @docs-private
   */
  setDescribedByIds(ids: string[]) {
    this._ariaDescribedby = ids.join(' ');
  }

  /**
   * Implemented as part of MatFormFieldControl.
   * @docs-private
   */
  onContainerClick() {
    this.focus();
    this.open();
  }

  /**
   * Implemented as part of MatFormFieldControl.
   * @docs-private
   */
  get shouldLabelFloat(): boolean {
    return this._panelOpen || !this.empty;
  }
}
