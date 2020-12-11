import { IResourceGroupWizardContext } from "vscode-azureextensionui";
import { IScaleSettings } from "../../../../model";

export interface IScaleSettingsUpdateWizardContext extends IResourceGroupWizardContext {
    newSettings: IScaleSettings;
}
