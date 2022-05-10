/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { KnownSupportedRuntimeValue } from "@azure/arm-appplatform";
import { IResourceGroupWizardContext } from '@microsoft/vscode-azext-azureutils';
import { IApp, IDeployment } from "../../../model";

export interface IAppCreationWizardContext extends IResourceGroupWizardContext {
    newAppName?: string;
    newAppRuntime?: KnownSupportedRuntimeValue;
    newApp?: IApp;
    newDeployment?: IDeployment;
}
