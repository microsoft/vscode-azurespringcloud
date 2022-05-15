/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

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
