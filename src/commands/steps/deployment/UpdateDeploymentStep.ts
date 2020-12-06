import { AzureWizardExecuteStep, createAzureClient } from "vscode-azureextensionui";
import { Progress } from "vscode";
import { localize } from "../../../utils";
import { ext } from "../../../extensionVariables";
import { AppPlatformManagementClient } from "@azure/arm-appplatform";
import SpringCloudResourceId from "../../../model/SpringCloudResourceId";
import { IAppDeploymentWizardContext } from "../../../model/IAppDeploymentWizardContext";

export class UpdateDeploymentStep extends AzureWizardExecuteStep<IAppDeploymentWizardContext> {
  public priority: number = 140;

  public async execute(context: IAppDeploymentWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
    const message: string = localize('updateDeployment', 'Updating deployment...');
    ext.outputChannel.appendLog(message);
    progress.report({message});

    const client: AppPlatformManagementClient = await createAzureClient(context, AppPlatformManagementClient);
    const appId = new SpringCloudResourceId(context.app.id!);
    await client.deployments.createOrUpdate(appId.getResourceGroup(), appId.getServiceName(), appId.getAppName(), context.deployment.name || 'default', {
      properties: {
        source: {
          type: 'Jar',
          relativePath: context.uploadDefinition.relativePath
        },
      }
    });
    return Promise.resolve(undefined);
  }

  public shouldExecute(_context: IAppDeploymentWizardContext): boolean {
    return true;
  }
}
