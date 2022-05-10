/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ResourceUploadDefinition } from "@azure/arm-appplatform";
import { IResourceGroupWizardContext } from '@microsoft/vscode-azext-azureutils';

export interface IAppDeploymentWizardContext extends IResourceGroupWizardContext {
    uploadDefinition?: ResourceUploadDefinition;
}
