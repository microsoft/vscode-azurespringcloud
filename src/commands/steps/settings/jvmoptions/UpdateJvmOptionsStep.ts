import { AppPlatformManagementClient } from "@azure/arm-appplatform";
import { Progress } from "vscode";
import { AzureWizardExecuteStep, createAzureClient } from "vscode-azureextensionui";
import { SpringCloudResourceId } from "../../../../model/SpringCloudResourceId";
import { localize } from "../../../../utils";
import { IJvmOptionsUpdateWizardContext } from "./IJvmOptionsUpdateWizardContext";

export class UpdateJvmOptionsStep extends AzureWizardExecuteStep<IJvmOptionsUpdateWizardContext> {
    public priority: number = 145;

    public async execute(context: IJvmOptionsUpdateWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const appId: SpringCloudResourceId = new SpringCloudResourceId(context.app.id!);
        const message: string = localize('updatingJvmOptions', 'Updating JVM Options of Spring Cloud app "{0}"...', appId.appName);
        progress.report({ message });

        const client: AppPlatformManagementClient = createAzureClient(context, AppPlatformManagementClient);
        await client.deployments.update(appId.resourceGroup, appId.serviceName, appId.appName, context.deployment.name!, {
            properties: {
                deploymentSettings: {
                    jvmOptions: context.newJvmOptions
                }
            }
        });
        return Promise.resolve(undefined);
    }

    public shouldExecute(context: IJvmOptionsUpdateWizardContext): boolean {
        return context.newJvmOptions !== undefined;
    }
}
