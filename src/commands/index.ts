// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CommandCallback, IActionContext, IParsedError, parseError, registerCommandWithTreeNodeUnwrapping } from '@microsoft/vscode-azext-utils';
import { instrumentOperation } from 'vscode-extension-telemetry-wrapper';
import { ResourceItemBase } from "../tree/SpringAppsBranchDataProvider";
import { showError } from '../utils';
import { Commands } from "./Commands";

export function registerCommands(): void {
    registerCommandWithTelemetryWrapper('azureSpringApps.common.refresh', refreshNode);
    registerCommandWithTelemetryWrapper('azureSpringApps.common.toggleVisibility', Commands.toggleVisibility);
    registerCommandWithTelemetryWrapper('azureSpringApps.apps.createInPortal', Commands.createServiceInPortal);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.create', Commands.createApp);
    registerCommandWithTelemetryWrapper('azureSpringApps.apps.delete', Commands.deleteService);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.openPublicEndpoint', Commands.openPublicEndpoint);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.openTestEndpoint', Commands.openTestEndpoint);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.assignEndpoint', Commands.assignEndpoint);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.unassignEndpoint', Commands.unassignEndpoint);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.start', Commands.startApp);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.stop', Commands.stopApp);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.restart', Commands.restartApp);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.delete', Commands.deleteApp);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.deploy', Commands.deploy);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.scale', Commands.scale);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.enableRemoteDebugging', Commands.enableRemoteDebugging);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.disableRemoteDebugging', Commands.disableRemoteDebugging);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.instance.startRemoteDebugging', Commands.startRemoteDebugging);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.instance.startStreamingLog', Commands.startStreamingLogs);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.instance.stopStreamingLog', Commands.stopStreamingLogs);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.settings.add', Commands.addSetting);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.settings.edit', Commands.editSettings);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.setting.edit', Commands.editSetting);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.setting.delete', Commands.deleteSetting);
}

function registerCommandWithTelemetryWrapper(commandId: string, callback: CommandCallback): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const callbackWithTroubleshooting: CommandCallback = (context: IActionContext, ...args: []) => instrumentOperation(commandId, async () => {
        try {
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
    registerCommandWithTreeNodeUnwrapping(commandId, callbackWithTroubleshooting);
}

async function refreshNode(_context: IActionContext, node: ResourceItemBase): Promise<void> {
    await node.refresh();
}
