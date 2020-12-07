import { AppResource, DeploymentResource } from "@azure/arm-appplatform/esm/models";
import { IResourceGroupWizardContext } from "vscode-azureextensionui";

export interface IJvmOptionsUpdateWizardContext extends IResourceGroupWizardContext {
    newJvmOptions?: string;
    app: AppResource;
    deployment: DeploymentResource;
}
