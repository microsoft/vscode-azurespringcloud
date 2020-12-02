/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureTreeItem, IActionContext, registerCommand } from 'vscode-azureextensionui';
import { SpringCloudAppCommands } from "./SpringCloudAppCommands";
import { SpringCloudServiceCommands } from "./SpringCloudServiceCommands";
import { commands } from 'vscode';
import { ext } from '../extensionVariables';
import { openInPortal } from './openInPortal';

export function registerCommands(): void {
  registerCommand("azureSpringCloud.loadMore", loadMore);
  registerCommand("azureSpringCloud.subscription.select", selectSubscription);
  registerCommand("azureSpringCloud.subscription.openInPortal", openInPortal);
  registerCommand("azureSpringCloud.subscription.createServiceFromPortal", () => 0);
  registerCommand("azureSpringCloud.subscription.refresh", refreshNode);
  registerCommand("azureSpringCloud.service.openInPortal", SpringCloudServiceCommands.openServiceInPortal);
  registerCommand("azureSpringCloud.service.createApp", SpringCloudServiceCommands.createApp);
  registerCommand("azureSpringCloud.service.delete", SpringCloudServiceCommands.deleteService);
  registerCommand("azureSpringCloud.service.viewProperties", SpringCloudServiceCommands.viewServiceProperties);
  registerCommand("azureSpringCloud.service.refresh", refreshNode);
  registerCommand("azureSpringCloud.app.openInPortal", SpringCloudAppCommands.openAppInPortal);
  registerCommand("azureSpringCloud.app.openPublicEndpoint", SpringCloudAppCommands.openPublicEndpoint);
  registerCommand("azureSpringCloud.app.openTestEndpoint", SpringCloudAppCommands.openTestEndpoint);
  registerCommand("azureSpringCloud.app.start", SpringCloudAppCommands.startApp);
  registerCommand("azureSpringCloud.app.stop", SpringCloudAppCommands.stopApp);
  registerCommand("azureSpringCloud.app.restart", SpringCloudAppCommands.restartApp);
  registerCommand("azureSpringCloud.app.delete", SpringCloudAppCommands.deleteApp);
  registerCommand("azureSpringCloud.app.viewProperties", SpringCloudAppCommands.viewAppProperties);
  registerCommand("azureSpringCloud.app.refresh", refreshNode);
  registerCommand('azureSpringCloud.app.setting.toggleVisibility', SpringCloudAppCommands.toggleSettingVisibility, 250);
}

async function refreshNode(_context: IActionContext, node?: AzureTreeItem) {
  return await ext.tree.refresh(node);
}

async function loadMore(context: IActionContext, node: AzureTreeItem) {
  return await ext.tree.loadMore(node, context);
}

async function selectSubscription() {
  return commands.executeCommand('azure-account.selectSubscriptions');
}
