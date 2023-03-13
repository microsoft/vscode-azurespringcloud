// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

'use strict';

import { registerAzureUtilsExtensionVariables } from '@microsoft/vscode-azext-azureutils';
import { callWithTelemetryAndErrorHandling, createAzExtOutputChannel, createExperimentationService, IActionContext, registerUIExtensionVariables } from '@microsoft/vscode-azext-utils';
import { AzExtResourceType, AzureResourcesExtensionApi, getAzureResourcesExtensionApi } from '@microsoft/vscode-azureresources-api';
import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { ext } from './extensionVariables';
import { SpringAppsBranchDataProvider } from './tree/SpringAppsBranchDataProvider';
import { TreeItemStateStore } from './tree/TreeItemState';

export async function activateInternal(context: vscode.ExtensionContext, perfStats: { loadStartTime: number; loadEndTime: number }, ignoreBundle?: boolean): Promise<void> {
    ext.context = context;
    ext.ignoreBundle = ignoreBundle;
    ext.outputChannel = createAzExtOutputChannel('Azure Spring Apps', ext.prefix);
    context.subscriptions.push(ext.outputChannel);

    registerUIExtensionVariables(ext);
    registerAzureUtilsExtensionVariables(ext);

    await callWithTelemetryAndErrorHandling('azureSpringApps.activate', async (activateContext: IActionContext) => {
        activateContext.telemetry.properties.isActivationEvent = 'true';
        activateContext.telemetry.measurements.mainFileLoad = (perfStats.loadEndTime - perfStats.loadStartTime) / 1000;

        registerCommands();


        const rgApiProvider: AzureResourcesExtensionApi = await getAzureResourcesExtensionApi(context, '2.0.0');
        if (rgApiProvider) {
            ext.experimentationService = await createExperimentationService(context);

            ext.state = new TreeItemStateStore();
            ext.rgApiV2 = await getAzureResourcesExtensionApi(context, '2.0.0');
            ext.branchDataProvider = new SpringAppsBranchDataProvider();
            ext.rgApiV2.resources.registerAzureResourceBranchDataProvider(AzExtResourceType.SpringApps, ext.branchDataProvider);
        } else {
            throw new Error('Could not find the Azure Resource Groups extension');
        }
    });
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivateInternal(): void {
}
