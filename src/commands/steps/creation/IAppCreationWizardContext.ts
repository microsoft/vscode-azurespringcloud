/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RuntimeVersion } from "@azure/arm-appplatform/esm/models";
import { IResourceGroupWizardContext } from '@microsoft/vscode-azext-azureutils';
import { IApp, IDeployment } from "../../../model";

export interface IAppCreationWizardContext extends IResourceGroupWizardContext {
    newAppName?: string;
    newAppRuntime?: RuntimeVersion;
    newApp?: IApp;
    newDeployment?: IDeployment;
}
