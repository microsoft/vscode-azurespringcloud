// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

'use strict';

import { registerAzureUtilsExtensionVariables } from '@microsoft/vscode-azext-azureutils';
import { createAzExtOutputChannel, createExperimentationService, registerUIExtensionVariables } from '@microsoft/vscode-azext-utils';
import { AzExtResourceType, AzureResourcesExtensionApi, getAzureResourcesExtensionApi } from '@microsoft/vscode-azureresources-api';
import * as vscode from 'vscode';
import { initialize as initializeDashboardIntegration } from './dashboard';
import { dispose as disposeTelemetryWrapper, initialize, instrumentOperation } from 'vscode-extension-telemetry-wrapper';
import { registerCommands } from './commands';
import { ext } from './extensionVariables';
import { SpringAppsBranchDataProvider } from './tree/SpringAppsBranchDataProvider';
import { TreeItemStateStore } from './tree/TreeItemState';
import { getAiKey, getExtensionId, getExtensionVersion, loadPackageInfo } from './utils';

export async function activateInternal(context: vscode.ExtensionContext, _perfStats: { loadStartTime: number; loadEndTime: number }, ignoreBundle?: boolean): Promise<void> {
    ext.context = context;
    ext.ignoreBundle = ignoreBundle;
    ext.outputChannel = createAzExtOutputChannel('Azure Spring Apps', ext.prefix);
    context.subscriptions.push(ext.outputChannel);

    registerUIExtensionVariables(ext);
    registerAzureUtilsExtensionVariables(ext);

    await loadPackageInfo(context);
    // Usage data statistics.
    if (getAiKey()) {
        initialize(getExtensionId(), getExtensionVersion(), getAiKey(), { firstParty: true });
    }
    instrumentOperation('activation', async () => {
        registerCommands();
        void initializeDashboardIntegration(context);
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
    })();
}

export async function deactivateInternal(): Promise<void> {
    await disposeTelemetryWrapper();
}
