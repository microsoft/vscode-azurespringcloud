import { AzureWizardExecuteStep } from "vscode-azureextensionui";
import { Progress } from "vscode";
import { localize } from "../../../utils";
import { ext } from "../../../extensionVariables";
import { IAppDeploymentWizardContext } from "../../../model/IAppDeploymentWizardContext";
import { AnonymousCredential, ShareFileClient } from "@azure/storage-file-share";

export class UploadArtifactStep extends AzureWizardExecuteStep<IAppDeploymentWizardContext> {
  public priority: number = 135;

  public async execute(context: IAppDeploymentWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {

    const message: string = localize('uploadingArtifact', 'Uploading artifact "{0}" to Azure...', context.artifactUrl);
    ext.outputChannel.appendLog(message);
    progress.report({message});

    const fileClient = new ShareFileClient(context.uploadDefinition.uploadUrl!, new AnonymousCredential);
    await fileClient.uploadFile(context.artifactUrl);

    return Promise.resolve(undefined);
  }

  public shouldExecute(_context: IAppDeploymentWizardContext): boolean {
    return true;
  }
}
