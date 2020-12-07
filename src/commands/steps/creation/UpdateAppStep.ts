import { AppPlatformManagementClient } from "@azure/arm-appplatform";
import { Progress } from "vscode";
import { AzureWizardExecuteStep, createAzureClient } from "vscode-azureextensionui";
import { SpringCloudResourceId } from "../../../model/SpringCloudResourceId";
import { localize, nonNullProp } from "../../../utils";
import { IAppCreationWizardContext } from "./IAppCreationWizardContext";

export class UpdateAppStep extends AzureWizardExecuteStep<IAppCreationWizardContext> {
    public priority: number = 145;

    public async execute(context: IAppCreationWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const message: string = localize('updatingNewApp', 'Activating deployment for Spring Cloud app "{0}"...', context.newAppName);
        progress.report({message});

        const appName: string = nonNullProp(context, 'newAppName');
        const client: AppPlatformManagementClient = await createAzureClient(context, AppPlatformManagementClient);
        const serviceId: SpringCloudResourceId = new SpringCloudResourceId(context.service.id!);
        context.newApp = await client.apps.createOrUpdate(serviceId.resourceGroup, serviceId.serviceName, appName, {
            properties: {
                activeDeploymentName: "default",
                publicProperty: true
            }
        });
        return Promise.resolve(undefined);
    }

    public shouldExecute(_context: IAppCreationWizardContext): boolean {
        return true;
    }
}
