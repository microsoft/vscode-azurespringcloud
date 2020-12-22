import { RuntimeVersion } from "@azure/arm-appplatform/esm/models";
import { IResourceGroupWizardContext } from "vscode-azureextensionui";
import { IApp, IDeployment } from "../../../model";

export interface IAppCreationWizardContext extends IResourceGroupWizardContext {
    newAppName?: string;
    newAppRuntime?: RuntimeVersion;
    newApp?: IApp;
    newDeployment?: IDeployment;
}
