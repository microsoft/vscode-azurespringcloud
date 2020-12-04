import { IResourceGroupWizardContext } from "vscode-azureextensionui";
import { AppResource, DeploymentResource, RuntimeVersion, ServiceResource } from "@azure/arm-appplatform/esm/models";

export default interface ISpringCloudAppWizardContext extends IResourceGroupWizardContext {
  newAppName?: string
  newAppRuntime?: RuntimeVersion
  newApp?: AppResource;
  newDeployment?: DeploymentResource;
  service: ServiceResource;
}
