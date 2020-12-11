import { IResourceGroupWizardContext } from "vscode-azureextensionui";

export interface IJvmOptionsUpdateWizardContext extends IResourceGroupWizardContext {
    newJvmOptions?: string;
}
