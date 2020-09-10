/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { commands } from 'vscode';
import { AzureTreeItem, IActionContext, registerCommand } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { openInPortal } from './openInPortal';
import { viewProperties } from './viewProperties';

export function registerCommands(): void {
  registerCommand('azureSpringCloud.loadMore', async (context: IActionContext, node: AzureTreeItem) => await ext.tree.loadMore(node, context));
  registerCommand('azureSpringCloud.openInPortal', openInPortal);
  registerCommand('azureSpringCloud.refresh', async (_context: IActionContext, node?: AzureTreeItem) => await ext.tree.refresh(node));
  registerCommand('azureSpringCloud.selectSubscriptions', () => commands.executeCommand('azure-account.selectSubscriptions'));
  registerCommand('azureSpringCloud.viewProperties', viewProperties);
}
