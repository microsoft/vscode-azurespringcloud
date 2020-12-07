import { AppResource, DeploymentResource, RuntimeVersion, ServiceResource } from "@azure/arm-appplatform/esm/models";
import { IResourceGroupWizardContext } from "vscode-azureextensionui";

export interface IAppCreationWizardContext extends IResourceGroupWizardContext {
    newAppName?: string;
    newAppRuntime?: RuntimeVersion;
    newApp?: AppResource;
    newDeployment?: DeploymentResource;
    service: ServiceResource;
}
