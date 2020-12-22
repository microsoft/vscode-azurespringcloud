/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { commands } from 'vscode';
import { AzureTreeItem, CommandCallback, IActionContext, openInPortal, openReadOnlyJson, registerCommand } from 'vscode-azureextensionui';
import { instrumentOperation } from 'vscode-extension-telemetry-wrapper';
import { ext } from '../extensionVariables';
import { AppInstanceTreeItem } from "../tree/AppInstanceTreeItem";
import { AppTreeItem } from "../tree/AppTreeItem";
import { ServiceTreeItem } from "../tree/ServiceTreeItem";
import { generalErrorHandler } from '../utils/uiUtils';
import { AppCommands } from "./AppCommands";
import { ServiceCommands } from "./ServiceCommands";

// tslint:disable-next-line:export-name
export function registerCommands(): void {
    registerCommandWithTelemetryWrapper('azureSpringCloud.common.loadMore', loadMore);
    registerCommandWithTelemetryWrapper('azureSpringCloud.common.refresh', refreshNode);
    registerCommandWithTelemetryWrapper('azureSpringCloud.common.openInPortal', openPortal);
    registerCommandWithTelemetryWrapper('azureSpringCloud.common.toggleVisibility', AppCommands.toggleVisibility);
    registerCommandWithTelemetryWrapper('azureSpringCloud.common.viewProperties', viewProperties);
    registerCommandWithTelemetryWrapper('azureSpringCloud.subscription.select', selectSubscription);
    registerCommandWithTelemetryWrapper('azureSpringCloud.subscription.createServiceFromPortal', ServiceCommands.createServiceInPortal);
    registerCommandWithTelemetryWrapper('azureSpringCloud.service.createApp', ServiceCommands.createApp);
    registerCommandWithTelemetryWrapper('azureSpringCloud.service.delete', ServiceCommands.deleteService);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.openPublicEndpoint', AppCommands.openPublicEndpoint);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.openTestEndpoint', AppCommands.openTestEndpoint);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.toggleEndpoint', AppCommands.toggleEndpoint);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.start', AppCommands.startApp);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.stop', AppCommands.stopApp);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.restart', AppCommands.restartApp);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.delete', AppCommands.deleteApp);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.deploy', AppCommands.deploy);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.scale', AppCommands.scale);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.instance.startStreamingLog', AppCommands.startStreamingLogs);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.instance.stopStreamingLog', AppCommands.stopStreamingLogs);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.settings.addSetting', AppCommands.addSetting);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.settings.edit', AppCommands.editSettings);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.setting.edit', AppCommands.editSetting);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.setting.delete', AppCommands.deleteSetting);
}

function registerCommandWithTelemetryWrapper(commandId: string, callback: CommandCallback): void {
    // tslint:disable-next-line:no-any
    const callbackWithTroubleshooting: CommandCallback = (context: IActionContext, ...args: any[]) => instrumentOperation(commandId, async () => {
        try {
            // tslint:disable-next-line: no-unsafe-any
            await callback(context, ...args);
        } catch (error) {
            // tslint:disable-next-line: no-unsafe-any
            generalErrorHandler(commandId, error);
        }
    })();
    registerCommand(commandId, callbackWithTroubleshooting);
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
