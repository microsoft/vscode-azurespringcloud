import { IResourceGroupWizardContext } from "vscode-azureextensionui";
import { AppResource, DeploymentResource, ResourceUploadDefinition } from "@azure/arm-appplatform/esm/models";

export interface IAppDeploymentWizardContext extends IResourceGroupWizardContext {
  uploadDefinition: ResourceUploadDefinition,
  artifactUrl: string;
  app: AppResource;
  deployment: DeploymentResource;
}
