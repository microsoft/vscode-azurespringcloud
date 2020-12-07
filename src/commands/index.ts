/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as ui from 'vscode-azureextensionui';
import { AzureTreeItem, IActionContext, openReadOnlyJson, registerCommand } from 'vscode-azureextensionui';
import { AppCommands } from "./AppCommands";
import { ServiceCommands } from "./ServiceCommands";
import { commands } from 'vscode';
import { ext } from '../extensionVariables';
import { AppTreeItem } from "../tree/AppTreeItem";
import { ServiceTreeItem } from "../tree/ServiceTreeItem";
import { AppInstanceTreeItem } from "../tree/AppInstanceTreeItem";

export function registerCommands(): void {
  registerCommand("azureSpringCloud.common.loadMore", loadMore);
  registerCommand("azureSpringCloud.common.refresh", refreshNode);
  registerCommand("azureSpringCloud.common.openInPortal", openInPortal);
  registerCommand('azureSpringCloud.common.toggleVisibility', AppCommands.toggleVisibility, 250);
  registerCommand("azureSpringCloud.common.viewProperties", viewProperties);
  registerCommand("azureSpringCloud.subscription.select", selectSubscription);
  registerCommand("azureSpringCloud.subscription.createServiceFromPortal", ServiceCommands.createServiceInPortal);
  registerCommand("azureSpringCloud.service.createApp", ServiceCommands.createApp);
  registerCommand("azureSpringCloud.service.delete", ServiceCommands.deleteService);
  registerCommand("azureSpringCloud.app.openPublicEndpoint", AppCommands.openPublicEndpoint);
  registerCommand("azureSpringCloud.app.openTestEndpoint", AppCommands.openTestEndpoint);
  registerCommand("azureSpringCloud.app.start", AppCommands.startApp);
  registerCommand("azureSpringCloud.app.stop", AppCommands.stopApp);
  registerCommand("azureSpringCloud.app.restart", AppCommands.restartApp);
  registerCommand("azureSpringCloud.app.delete", AppCommands.deleteApp);
  registerCommand("azureSpringCloud.app.deploy", AppCommands.deploy);
  registerCommand("azureSpringCloud.app.instance.startStreamingLog", AppCommands.startStreamingLogs);
  registerCommand("azureSpringCloud.app.instance.stopStreamingLog", AppCommands.stopStreamingLogs);
  registerCommand('azureSpringCloud.app.settings.addSetting', AppCommands.addSetting);
  registerCommand('azureSpringCloud.app.settings.edit', AppCommands.editSettings);
  registerCommand('azureSpringCloud.app.setting.edit', AppCommands.editSetting);
  registerCommand('azureSpringCloud.app.setting.delete', AppCommands.deleteSetting);
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

async function viewProperties(_context: IActionContext, node: ServiceTreeItem | AppTreeItem | AppInstanceTreeItem): Promise<void> {
  await openReadOnlyJson(node, node.data);
}

async function selectSubscription() {
  return commands.executeCommand('azure-account.selectSubscriptions');
}
