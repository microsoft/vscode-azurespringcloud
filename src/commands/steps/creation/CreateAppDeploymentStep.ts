import { AppPlatformManagementClient } from "@azure/arm-appplatform";
import { RuntimeVersion } from "@azure/arm-appplatform/esm/models";
import { Progress } from "vscode";
import { AzureWizardExecuteStep, createAzureClient } from "vscode-azureextensionui";
import { ext } from "../../../extensionVariables";
import { SpringCloudResourceId } from "../../../model/SpringCloudResourceId";
import { localize, nonNullProp } from "../../../utils";
import { IAppCreationWizardContext } from "./IAppCreationWizardContext";

export class CreateAppDeploymentStep extends AzureWizardExecuteStep<IAppCreationWizardContext> {
    public priority: number = 140;

    public async execute(context: IAppCreationWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {

        const message: string = localize('creatingNewAppDeployment', 'Creating default deployment...');
        ext.outputChannel.appendLog(message);
        progress.report({message});

        const appRuntime: RuntimeVersion = nonNullProp(context, 'newAppRuntime');
        const deploymentName: string = 'default';

        const client: AppPlatformManagementClient = await createAzureClient(context, AppPlatformManagementClient);
        const appId: SpringCloudResourceId = new SpringCloudResourceId(context.newApp!.id!);
        context.newDeployment = await client.deployments.createOrUpdate(appId.resourceGroup, appId.serviceName, appId.appName, deploymentName, {
            properties: {
                source: {    //refer: https://dev.azure.com/msazure/AzureDMSS/_git/AzureDMSS-PortalExtension?path=%2Fsrc%2FSpringCloudPortalExt%2FClient%2FShared%2FAppsApi.ts&version=GBdev&_a=contents
                    type: 'Jar',
                    relativePath: '<default>'
                },
                deploymentSettings: {
                    memoryInGB: 1,
                    runtimeVersion: appRuntime || "Java_8"
                },
            },
            sku: {
                capacity: 1,
                // When PUT a deployment, the Sku.tier and Sku.name are required but ignored by service side.
                // Hard code these un-used required properties.
                // https://msazure.visualstudio.com/AzureDMSS/_workitems/edit/8082098/
                tier: 'Standard',
                name: 'S0',
            }
        });
        await client.deployments.start(appId.resourceGroup, appId.serviceName, appId.appName, deploymentName);
        return Promise.resolve(undefined);
    }

    public shouldExecute(_context: IAppCreationWizardContext): boolean {
        return true;
    }
}
