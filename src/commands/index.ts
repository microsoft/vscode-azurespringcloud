/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as ui from 'vscode-azureextensionui';
import { AzureTreeItem, IActionContext, openReadOnlyJson, registerCommand } from 'vscode-azureextensionui';
import { SpringCloudAppCommands } from "./SpringCloudAppCommands";
import { SpringCloudServiceCommands } from "./SpringCloudServiceCommands";
import { commands } from 'vscode';
import { ext } from '../extensionVariables';
import { SpringCloudAppTreeItem } from "../tree/SpringCloudAppTreeItem";
import { SpringCloudServiceTreeItem } from "../tree/SpringCloudServiceTreeItem";
import { SpringCloudAppInstanceTreeItem } from "../tree/SpringCloudAppInstanceTreeItem";

export function registerCommands(): void {
  registerCommand("azureSpringCloud.common.loadMore", loadMore);
  registerCommand("azureSpringCloud.common.refresh", refreshNode);
  registerCommand("azureSpringCloud.common.openInPortal", openInPortal);
  registerCommand('azureSpringCloud.common.toggleVisibility', SpringCloudAppCommands.toggleVisibility, 250);
  registerCommand("azureSpringCloud.common.viewProperties", viewProperties);
  registerCommand("azureSpringCloud.subscription.select", selectSubscription);
  registerCommand("azureSpringCloud.subscription.createServiceFromPortal", SpringCloudServiceCommands.createServiceInPortal);
  registerCommand("azureSpringCloud.service.createApp", SpringCloudServiceCommands.createApp);
  registerCommand("azureSpringCloud.service.delete", SpringCloudServiceCommands.deleteService);
  registerCommand("azureSpringCloud.app.openPublicEndpoint", SpringCloudAppCommands.openPublicEndpoint);
  registerCommand("azureSpringCloud.app.openTestEndpoint", SpringCloudAppCommands.openTestEndpoint);
  registerCommand("azureSpringCloud.app.start", SpringCloudAppCommands.startApp);
  registerCommand("azureSpringCloud.app.stop", SpringCloudAppCommands.stopApp);
  registerCommand("azureSpringCloud.app.restart", SpringCloudAppCommands.restartApp);
  registerCommand("azureSpringCloud.app.delete", SpringCloudAppCommands.deleteApp);
  registerCommand("azureSpringCloud.app.deploy", SpringCloudAppCommands.deploy);
  registerCommand("azureSpringCloud.app.instance.startStreamingLog", SpringCloudAppCommands.startStreamingLogs);
  registerCommand("azureSpringCloud.app.instance.stopStreamingLog", SpringCloudAppCommands.stopStreamingLogs);
  registerCommand('azureSpringCloud.app.settings.addSetting', SpringCloudAppCommands.addSetting);
  registerCommand('azureSpringCloud.app.setting.edit', SpringCloudAppCommands.editSetting);
  registerCommand('azureSpringCloud.app.setting.delete', SpringCloudAppCommands.deleteSetting);
}

async function refreshNode(_context: IActionContext, node?: AzureTreeItem) {
  return await ext.tree.refresh(node);
}

async function loadMore(context: IActionContext, node: AzureTreeItem) {
  return await ext.tree.loadMore(node, context);
}

async function openInPortal(_context: ui.IActionContext, node: AzureTreeItem): Promise<void> {
  await ui.openInPortal(node.root, node.fullId);
}

async function viewProperties(_context: IActionContext, node: SpringCloudServiceTreeItem | SpringCloudAppTreeItem | SpringCloudAppInstanceTreeItem): Promise<void> {
  await openReadOnlyJson(node, node.data);
}

async function selectSubscription() {
  return commands.executeCommand('azure-account.selectSubscriptions');
}
