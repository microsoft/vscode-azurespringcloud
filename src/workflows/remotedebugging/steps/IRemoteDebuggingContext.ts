// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { RemoteDebugging } from '@azure/arm-appplatform';
import { IResourceGroupWizardContext } from '@microsoft/vscode-azext-azureutils';
import { DebugProxy } from '../DebugProxy';

export interface IRemoteDebuggingContext extends IResourceGroupWizardContext {
    config: RemoteDebugging;
    proxy?: DebugProxy;
    configurationName?: string;
}
