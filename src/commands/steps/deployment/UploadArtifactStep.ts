import { AnonymousCredential, ShareFileClient } from "@azure/storage-file-share";
import { Progress } from "vscode";
import { AzureWizardExecuteStep } from "vscode-azureextensionui";
import { ext } from "../../../extensionVariables";
import { localize } from "../../../utils";
import { IAppDeploymentWizardContext } from "./IAppDeploymentWizardContext";

export class UploadArtifactStep extends AzureWizardExecuteStep<IAppDeploymentWizardContext> {
    public priority: number = 135;

    public async execute(context: IAppDeploymentWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {

        const message: string = localize('uploadingArtifact', 'Uploading artifact "{0}" to Azure...', context.artifactUrl);
        ext.outputChannel.appendLog(message);
        progress.report({message});

        const fileClient: ShareFileClient = new ShareFileClient(context.uploadDefinition.uploadUrl!, new AnonymousCredential());
        await fileClient.uploadFile(context.artifactUrl);

        return Promise.resolve(undefined);
    }

    public shouldExecute(_context: IAppDeploymentWizardContext): boolean {
        return true;
    }
}
