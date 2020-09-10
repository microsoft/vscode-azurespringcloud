/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, openReadOnlyJson } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { SpringCloudServiceTreeItem } from '../tree/SpringCloudServiceTreeItem';
import { SpringCloudAppTreeItem } from '../tree/SpringCloudAppTreeItem';

export async function viewProperties(context: IActionContext, node?: SpringCloudServiceTreeItem | SpringCloudAppTreeItem): Promise<void> {
  if (!node) {
    node = await ext.tree.showTreeItemPicker<SpringCloudServiceTreeItem>(SpringCloudServiceTreeItem.contextValue, context);
  }

  await openReadOnlyJson(node, node.data);
}
