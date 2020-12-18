/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import {
    AzExtTreeDataProvider,
    AzureUserInput,
    createApiProvider,
    createAzExtOutputChannel,
    registerUIExtensionVariables
} from 'vscode-azureextensionui';
import { AzureExtensionApiProvider } from 'vscode-azureextensionui/api';
import { initializeFromJsonFile, instrumentOperation } from 'vscode-extension-telemetry-wrapper';
import { registerCommands } from './commands';
import { ext } from './extensionVariables';
import { AzureAccountTreeItem } from './tree/AzureAccountTreeItem';

export async function activateInternal(context: vscode.ExtensionContext, _perfStats: { loadStartTime: number; loadEndTime: number }, ignoreBundle?: boolean): Promise<AzureExtensionApiProvider> {
    await initializeFromJsonFile(context.asAbsolutePath('./package.json'), { firstParty: true });
    // tslint:disable-next-line: no-unsafe-any
    await instrumentOperation('activation', () => activateExtension(context, ignoreBundle))();
    return createApiProvider([]);
}

export function deactivateInternal(): void {
    ext.diagnosticWatcher?.dispose();
}

async function activateExtension(context: vscode.ExtensionContext, ignoreBundle?: boolean): Promise<void> {
    ext.context = context;
    ext.ignoreBundle = ignoreBundle;
    ext.outputChannel = createAzExtOutputChannel('Azure Spring Cloud', ext.prefix);
    context.subscriptions.push(ext.outputChannel);
    ext.ui = new AzureUserInput(context.globalState);

    registerUIExtensionVariables(ext);

    const accountTreeItem: AzureAccountTreeItem = new AzureAccountTreeItem();
    context.subscriptions.push(accountTreeItem);
    ext.tree = new AzExtTreeDataProvider(accountTreeItem, 'azureSpringCloud.common.loadMore');
    context.subscriptions.push(vscode.window.createTreeView('azureSpringCloud', {
        treeDataProvider: ext.tree,
        showCollapseAll: true,
        canSelectMany: true
    }));
    registerCommands();
}
