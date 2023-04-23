// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IResourceGroupWizardContext } from '@microsoft/vscode-azext-azureutils';
import { IScaleSettings } from "../../../model";

export interface IScaleSettingsUpdateWizardContext extends IResourceGroupWizardContext {
    newSettings: IScaleSettings;
}
