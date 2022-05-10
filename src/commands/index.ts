/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { openInPortal } from '@microsoft/vscode-azext-azureutils';
import {
    CommandCallback,
    IActionContext,
    IParsedError, parseError,
    registerCommand
} from '@microsoft/vscode-azext-utils';
import { commands } from 'vscode';
import { instrumentOperation } from 'vscode-extension-telemetry-wrapper';
import { ext } from '../extensionVariables';
import { AppInstanceTreeItem } from '../tree/AppInstanceTreeItem';
import { AppTreeItem } from "../tree/AppTreeItem";
import { ServiceTreeItem } from '../tree/ServiceTreeItem';
import { SubscriptionTreeItem } from '../tree/SubscriptionTreeItem';
import { showError } from '../utils';
import { AppCommands } from "./AppCommands";
import { ServiceCommands } from "./ServiceCommands";

// tslint:disable-next-line:export-name
export function registerCommands(): void {
    registerCommandWithTelemetryWrapper('azureSpringCloud.common.loadMore', loadMore);
    registerCommandWithTelemetryWrapper('azureSpringCloud.common.refresh', refreshNode);
    registerCommandWithTelemetryWrapper('azureSpringCloud.common.toggleVisibility', AppCommands.toggleVisibility);
    registerCommandWithTelemetryWrapper('azureSpringCloud.subscription.select', selectSubscription);
    registerCommandWithTelemetryWrapper('azureSpringCloud.subscription.createServiceFromPortal', ServiceCommands.createServiceInPortal);
    registerCommandWithTelemetryWrapper('azureSpringCloud.subscription.openInPortal', openPortal);
    registerCommandWithTelemetryWrapper('azureSpringCloud.service.createApp', ServiceCommands.createApp);
    registerCommandWithTelemetryWrapper('azureSpringCloud.service.delete', ServiceCommands.deleteService);
    registerCommandWithTelemetryWrapper('azureSpringCloud.service.openInPortal', ServiceCommands.openPortal);
    registerCommandWithTelemetryWrapper('azureSpringCloud.service.viewProperties', ServiceCommands.viewProperties);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.openPublicEndpoint', AppCommands.openPublicEndpoint);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.openTestEndpoint', AppCommands.openTestEndpoint);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.toggleEndpoint', AppCommands.toggleEndpoint);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.start', AppCommands.startApp);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.stop', AppCommands.stopApp);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.restart', AppCommands.restartApp);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.delete', AppCommands.deleteApp);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.deploy', AppCommands.deploy);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.scale', AppCommands.scale);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.openInPortal', AppCommands.openPortal);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.viewProperties', AppCommands.viewProperties);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.instance.startStreamingLog', AppCommands.startStreamingLogs);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.instance.stopStreamingLog', AppCommands.stopStreamingLogs);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.instance.viewProperties', AppCommands.viewInstanceProperties);
    registerCommandWithTelemetryWrapper('azureSpringCloud.app.settings.add', AppCommands.addSetting);
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
            const e: IParsedError = parseError(error);
            if (!e.isUserCancelledError) {
                // tslint:disable-next-line: no-unsafe-any
                showError(commandId, error);
            }
            throw error;
        }
    })();
    registerCommand(commandId, callbackWithTroubleshooting);
}

type SpringCloudResourceTreeItem = ServiceTreeItem | AppTreeItem | AppInstanceTreeItem;

async function refreshNode(context: IActionContext, node: SpringCloudResourceTreeItem): Promise<void> {
    return ext.tree.refresh(context, node);
}

async function loadMore(context: IActionContext, node: SpringCloudResourceTreeItem): Promise<void> {
    return ext.tree.loadMore(node, context);
}

async function selectSubscription(): Promise<void> {
    return commands.executeCommand('azure-account.selectSubscriptions');
}

async function openPortal(context: IActionContext, node?: SubscriptionTreeItem): Promise<void> {
    node = node ?? await ext.tree.showTreeItemPicker<SubscriptionTreeItem>(SubscriptionTreeItem.contextValue, context);
    return openInPortal(node, node.fullId);
}
