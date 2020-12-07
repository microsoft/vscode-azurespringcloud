import { IResourceGroupWizardContext } from "vscode-azureextensionui";
import { AppResource, DeploymentResource } from "@azure/arm-appplatform/esm/models";

export interface IJvmOptionsUpdateWizardContext extends IResourceGroupWizardContext {
  newJvmOptions?: string;
  app: AppResource;
  deployment: DeploymentResource;
}
