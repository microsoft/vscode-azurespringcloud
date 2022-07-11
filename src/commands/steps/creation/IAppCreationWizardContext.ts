// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { KnownSupportedRuntimeValue } from "@azure/arm-appplatform";
import { IResourceGroupWizardContext } from '@microsoft/vscode-azext-azureutils';
import { EnhancedApp } from "../../../service/EnhancedApp";
import { EnhancedDeployment } from "../../../service/EnhancedDeployment";

export interface IAppCreationWizardContext extends IResourceGroupWizardContext {
    newAppName?: string;
    newAppRuntime?: KnownSupportedRuntimeValue;
    newApp?: EnhancedApp;
    newDeployment?: EnhancedDeployment;
}
