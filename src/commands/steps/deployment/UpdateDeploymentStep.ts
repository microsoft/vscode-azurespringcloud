import { AppPlatformManagementClient } from "@azure/arm-appplatform";
import { Progress } from "vscode";
import { AzureWizardExecuteStep, createAzureClient } from "vscode-azureextensionui";
import { ext } from "../../../extensionVariables";
import { SpringCloudResourceId } from "../../../model/SpringCloudResourceId";
import { localize } from "../../../utils";
import { IAppDeploymentWizardContext } from "./IAppDeploymentWizardContext";

export class UpdateDeploymentStep extends AzureWizardExecuteStep<IAppDeploymentWizardContext> {
    public priority: number = 140;

    public async execute(context: IAppDeploymentWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const message: string = localize('updateDeployment', 'Updating deployment...');
        ext.outputChannel.appendLog(message);
        progress.report({message});

        const client: AppPlatformManagementClient = await createAzureClient(context, AppPlatformManagementClient);
        const appId: SpringCloudResourceId = new SpringCloudResourceId(context.app.id!);
        await client.deployments.createOrUpdate(appId.resourceGroup, appId.serviceName, appId.appName, context.deployment.name || 'default', {
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
