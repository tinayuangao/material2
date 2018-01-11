/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  AfterContentInit,
  ContentChildren,
  Directive,
  ElementRef,
  IterableDiffers,
  IterableDiffer,
  OnDestroy,
  Optional,
  QueryList,
} from '@angular/core';
import {FocusMonitor} from '@angular/cdk/a11y';
import {takeUntil} from 'rxjs/operators';

import {CdkTreeNavigator} from './navigator';
import {CdkTree, CdkTreeNode} from './tree';
import {CdkTreeNodeOutlet} from './outlet';
import {getTreeControlFunctionsMissingError} from './tree-errors';

/**
 * Nested node is a child of `<cdk-tree>`. It works with nested tree.
 * By using `cdk-nested-tree-node` component in tree node template, children of the parent node will
 * be added in the `cdkTreeNodeOutlet` in tree node template.
 * For example:
 *   ```html
 *   <cdk-mested-tree-node>
 *     {{node.name}}
 *     <ng-template cdkTreeNodeOutlet></ng-template>
 *   </cdk-tree-node>
 *   ```
 * The children of node will be automatically added to `cdkTreeNodeOutlet`, the result dom will be
 * like this:
 *   ```html
 *   <cdk-nested-tree-node>
 *     {{node.name}}
 *      <cdk-nested-tree-node>{{child1.name}}</cdk-tree-node>
 *      <cdk-nested-tree-node>{{child2.name}}</cdk-tree-node>
 *   </cdk-tree-node>
 *   ```
 */
@Directive({
  selector: 'cdk-nested-tree-node',
  exportAs: 'cdkNestedTreeNode',
  host: {
    '[attr.tabindex]': '_treeNavigator ? -1 : null',
    '[attr.aria-expanded]': 'isExpanded',
    '[attr.role]': 'role',
    'class': 'cdk-tree-node cdk-nested-tree-node',
    '(focus)': '_focus()',
  },
  providers: [{provide: CdkTreeNode, useExisting: CdkNestedTreeNode}]
})
export class CdkNestedTreeNode<T> extends CdkTreeNode<T> implements AfterContentInit, OnDestroy {
  /** Differ used to find the changes in the data provided by the data source. */
  private _dataDiffer: IterableDiffer<T>;

  /** The children data dataNodes of current node. They will be placed in `CdkTreeNodeOutlet`. */
  protected _children: T[];

  /** The children node placeholder. */
  @ContentChildren(CdkTreeNodeOutlet) nodeOutlet: QueryList<CdkTreeNodeOutlet>;

  constructor(protected _elementRef: ElementRef,
              protected _tree: CdkTree<T>,
              protected _focusMonitor: FocusMonitor,
              @Optional() protected treeNavigator: CdkTreeNavigator<T>,
              protected _differs: IterableDiffers) {
    super(_elementRef, _tree, _focusMonitor, treeNavigator);
  }

  ngAfterContentInit() {
    this._dataDiffer = this._differs.find([]).create(this._tree.trackBy);
    if (!this._tree.treeControl.getChildren) {
      throw getTreeControlFunctionsMissingError();
    }
    this._tree.treeControl.getChildren(this.data).pipe(takeUntil(this._destroyed))
        .subscribe(result => {
          this._children = result;
          this.updateChildrenNodes();
        });
    this.nodeOutlet.changes.pipe(takeUntil(this._destroyed))
        .subscribe(() => this.updateChildrenNodes());
  }

  ngOnDestroy() {
    this._clear();
    super.ngOnDestroy();
  }

  /** Add children dataNodes to the NodeOutlet */
  protected updateChildrenNodes(): void {
    if (this.nodeOutlet.length && this._children) {
      const viewContainer = this.nodeOutlet.first.viewContainer;
      this._tree.renderNodeChanges(this._children, this._dataDiffer, viewContainer, this._data);
    } else {
      // Reset the data differ if there's no children nodes displayed
      this._dataDiffer.diff([]);
    }
  }

  /** Clear the children dataNodes. */
  protected _clear(): void {
    if (this.nodeOutlet && this.nodeOutlet.first) {
      this.nodeOutlet.first.viewContainer.clear();
      this._dataDiffer.diff([]);
    }
  }
}
