// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { KnownSupportedRuntimeValue } from "@azure/arm-appplatform";
import { IResourceGroupWizardContext } from '@microsoft/vscode-azext-azureutils';
import { EnhancedApp } from "../../model/EnhancedApp";
import { EnhancedDeployment } from "../../model/EnhancedDeployment";

export interface IAppCreationWizardContext extends IResourceGroupWizardContext {
    newAppName?: string;
    newAppRuntime?: KnownSupportedRuntimeValue;
    newApp?: EnhancedApp;
    newDeployment?: EnhancedDeployment;
}
