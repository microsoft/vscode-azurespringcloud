/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { commands } from 'vscode';
import { AzureTreeItem, IActionContext, openInPortal, openReadOnlyJson, registerCommand } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { AppInstanceTreeItem } from "../tree/AppInstanceTreeItem";
import { AppTreeItem } from "../tree/AppTreeItem";
import { ServiceTreeItem } from "../tree/ServiceTreeItem";
import { AppCommands } from "./AppCommands";
import { ServiceCommands } from "./ServiceCommands";

// tslint:disable-next-line:export-name
export function registerCommands(): void {
    registerCommand("azureSpringCloud.common.loadMore", loadMore);
    registerCommand("azureSpringCloud.common.refresh", refreshNode);
    registerCommand("azureSpringCloud.common.openInPortal", openPortal);
    registerCommand('azureSpringCloud.common.toggleVisibility', AppCommands.toggleVisibility, 250);
    registerCommand("azureSpringCloud.common.viewProperties", viewProperties);
    registerCommand("azureSpringCloud.subscription.select", selectSubscription);
    registerCommand("azureSpringCloud.subscription.createServiceFromPortal", ServiceCommands.createServiceInPortal);
    registerCommand("azureSpringCloud.service.createApp", ServiceCommands.createApp);
    registerCommand("azureSpringCloud.service.delete", ServiceCommands.deleteService);
    registerCommand("azureSpringCloud.app.openPublicEndpoint", AppCommands.openPublicEndpoint);
    registerCommand("azureSpringCloud.app.openTestEndpoint", AppCommands.openTestEndpoint);
    registerCommand("azureSpringCloud.app.toggleEndpoint", AppCommands.toggleEndpoint);
    registerCommand("azureSpringCloud.app.start", AppCommands.startApp);
    registerCommand("azureSpringCloud.app.stop", AppCommands.stopApp);
    registerCommand("azureSpringCloud.app.restart", AppCommands.restartApp);
    registerCommand("azureSpringCloud.app.delete", AppCommands.deleteApp);
    registerCommand("azureSpringCloud.app.deploy", AppCommands.deploy);
    registerCommand("azureSpringCloud.app.scale", AppCommands.scale);
    registerCommand("azureSpringCloud.app.instance.startStreamingLog", AppCommands.startStreamingLogs);
    registerCommand("azureSpringCloud.app.instance.stopStreamingLog", AppCommands.stopStreamingLogs);
    registerCommand('azureSpringCloud.app.settings.addSetting', AppCommands.addSetting);
    registerCommand('azureSpringCloud.app.settings.edit', AppCommands.editSettings);
    registerCommand('azureSpringCloud.app.setting.edit', AppCommands.editSetting);
    registerCommand('azureSpringCloud.app.setting.delete', AppCommands.deleteSetting);
}

async function refreshNode(_context: IActionContext, node?: AzureTreeItem): Promise<void> {
    return ext.tree.refresh(node);
}

async function loadMore(context: IActionContext, node: AzureTreeItem): Promise<void> {
    return ext.tree.loadMore(node, context);
}

async function openPortal(_context: IActionContext, node: AzureTreeItem): Promise<void> {
    await openInPortal(node.root, node.fullId);
}

async function viewProperties(_context: IActionContext, node: ServiceTreeItem | AppTreeItem | AppInstanceTreeItem): Promise<void> {
    await openReadOnlyJson(node, node.data);
}

async function selectSubscription(): Promise<void> {
    return commands.executeCommand('azure-account.selectSubscriptions');
}
