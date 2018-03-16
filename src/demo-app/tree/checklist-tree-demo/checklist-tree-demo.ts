import {ChangeDetectorRef, Component, Injectable} from '@angular/core';
import {SelectionModel} from '@angular/cdk/collections';
import {NestedTreeControl} from '@angular/cdk/tree';
import {MatTreeFlattener, MatTreeNestedDataSource} from '@angular/material/tree';
import {of as ofObservable} from 'rxjs/observable/of';
import {Observable} from 'rxjs/Observable';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';

/**
 * Node for to-do item
 */
export class TodoItemNode {
  children: BehaviorSubject<TodoItemNode[]>;
  item: string;
  parent?: TodoItemNode;
}

/**
 * The Json object for to-do list data.
 */
const TREE_DATA = {
  'Reminders': [
    'Cook dinner',
    'Read the Material Design spec',
    'Upgrade Application to Angular'
  ],
  'Groceries': {
    'Organic eggs': null,
    'Protein Powder': null,
    'Almond Meal flour': null,
    'Fruits': {
      'Apple': null,
      'Orange': null,
      'Berries': ['Blueberry', 'Raspberry']
    }
  }
};

/**
 * Checklist database, it can build a tree structured Json object.
 * Each node in Json object represents a to-do item or a category.
 * If a node is a category, it has children items and new items can be added under the category.
 */
@Injectable()
export class ChecklistDatabase {
  dataChange: BehaviorSubject<TodoItemNode[]> = new BehaviorSubject<TodoItemNode[]>([]);

  get data(): TodoItemNode[] { return this.dataChange.value; }

  constructor() {
    this.initialize();
  }

  initialize() {
    // Build the tree nodes from Json object. The result is a list of `TodoItemNode` with nested
    //     file node as children.
    const data = this.buildFileTree(TREE_DATA, 0);

    // Notify the change.
    this.dataChange.next(data);
  }

  /**
   * Build the file structure tree. The `value` is the Json object, or a sub-tree of a Json object.
   * The return value is the list of `TodoItemNode`.
   */
  buildFileTree(value: any, level: number, parent?: TodoItemNode): TodoItemNode[] {
    let data: any[] = [];
    for (let k in value) {
      let v = value[k];
      let node = <TodoItemNode>{parent: parent, item: `${k}`};
      if (v === null || v === undefined) {
        // no action
      } else if (typeof v === 'object') {
        node.children = new BehaviorSubject(this.buildFileTree(v, level + 1, node));
      } else {
        node.item = v;
      }
      if (!node.children) {
        node.children = new BehaviorSubject([])
      }
      data.push(node);
    }
    return data;
  }

  /** Add an item to to-do list */
  insertItem(parent: TodoItemNode, name: string) {
    const child = <TodoItemNode>{item: name, children: new BehaviorSubject([]), parent: parent};
    if (parent.children) {
      let children = parent.children.value;
      if (children) {
        children.push(child);
      } else {
        children = [child];
      }
      parent.children.next(children);
    }
  }

  updateItem(node: TodoItemNode, name: string) {
    let newNode = <TodoItemNode>{item: name, parent: node.parent, children: node.children};
    if (node.parent) {
      let children = node.parent.children.value;
      let index = children.indexOf(node);
      children.splice(index, 1, newNode);
      node.parent.children.next(children);
    }
  }
}

/**
 * @title Tree with checkboxes
 */
@Component({
  moduleId: module.id,
  selector: 'checklist-tree-demo',
  templateUrl: 'checklist-tree-demo.html',
  styles: [`.tree-node-invisible {display: none} .tree-node-nested {padding-left: 40px}`],
  providers: [ChecklistDatabase]
})
export class ChecklistTreeDemo {

  /** The new item's name */
  newItemName: string = '';

  treeControl: NestedTreeControl<TodoItemNode>;

  dataSource: MatTreeNestedDataSource<TodoItemNode>;

  /** The selection for checklist */
  checklistSelection = new SelectionModel<TodoItemNode>(true /* multiple */);

  constructor(private database: ChecklistDatabase, private changeDetectorRef: ChangeDetectorRef) {
    this.treeControl = new NestedTreeControl<TodoItemNode>(this.getChildren);
    this.dataSource = new MatTreeNestedDataSource();

    database.dataChange.subscribe(data => {
      this.dataSource.data = data;
    });
  }

  getChildren = (node: TodoItemNode): Observable<TodoItemNode[]> => {
    if (node.children) {
      return node.children;
    }
    return ofObservable([]);
  };

  hasNoContent = (_: number, _nodeData: TodoItemNode) => { return _nodeData.item === ''; };

  /** Whether all the descendants of the node are selected */
  descendantsAllSelected(node: TodoItemNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    const selected = this.checklistSelection.isSelected(node);
    const allSelected = descendants.length > 0 &&
        descendants.every(child => this.checklistSelection.isSelected(child));
    return selected || allSelected;
  }

  /** Whether part of the descendants are selected */
  descendantsPartiallySelected(node: TodoItemNode): boolean {
    const descendants = this.treeControl.getDescendants(node);
    const result = descendants.some(child => this.checklistSelection.isSelected(child));
    return result && !this.descendantsAllSelected(node);
  }

  /** Toggle the to-do item selection. Select/deselect all the descendants node */
  todoItemSelectionToggle(node: TodoItemNode): void {
    this.checklistSelection.toggle(node);
    const descendants = this.treeControl.getDescendants(node);
    this.checklistSelection.isSelected(node)
      ? this.checklistSelection.select(...descendants, node)
      : this.checklistSelection.deselect(...descendants, node);
    this.changeDetectorRef.markForCheck();
  }

  /** Select the category so we can insert the new item. */
  addNewItem(node: TodoItemNode) {
    this.database.insertItem(node, '');
    this.treeControl.expand(node);
  }

  /** Save the node to database */
  saveNode(node: TodoItemNode, itemValue: string) {
    this.database.updateItem(node, itemValue);
  }
}
