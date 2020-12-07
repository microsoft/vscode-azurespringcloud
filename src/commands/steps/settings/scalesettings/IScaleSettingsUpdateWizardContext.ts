import { AppResource, DeploymentResource } from "@azure/arm-appplatform/esm/models";
import { IResourceGroupWizardContext } from "vscode-azureextensionui";
import { IScaleSettings } from "./IScaleSettings";

export interface IScaleSettingsUpdateWizardContext extends IResourceGroupWizardContext {
    app: AppResource;
    deployment: DeploymentResource;
    newSettings: IScaleSettings;
}
