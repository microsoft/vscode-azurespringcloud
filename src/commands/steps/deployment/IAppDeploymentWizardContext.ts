import { ResourceUploadDefinition } from "@azure/arm-appplatform/esm/models";
import { IResourceGroupWizardContext } from "vscode-azureextensionui";

export interface IAppDeploymentWizardContext extends IResourceGroupWizardContext {
    uploadDefinition?: ResourceUploadDefinition;
}
