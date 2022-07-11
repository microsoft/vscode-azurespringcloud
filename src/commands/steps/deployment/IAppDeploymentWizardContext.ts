// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IResourceGroupWizardContext } from '@microsoft/vscode-azext-azureutils';

export interface IAppDeploymentWizardContext extends IResourceGroupWizardContext {
    relativePathOrBuildResultId?: string;
}
