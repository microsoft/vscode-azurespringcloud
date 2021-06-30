/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IResourceGroupWizardContext } from "vscode-azureextensionui";
import { IScaleSettings } from "../../../../model";

export interface IScaleSettingsUpdateWizardContext extends IResourceGroupWizardContext {
    newSettings: IScaleSettings;
}
