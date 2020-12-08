import { AppPlatformManagementClient } from "@azure/arm-appplatform";
import { Progress } from "vscode";
import { AzureWizardExecuteStep, createAzureClient } from "vscode-azureextensionui";
import { ext } from "../../../extensionVariables";
import { SpringCloudResourceId } from "../../../model/SpringCloudResourceId";
import { localize, nonNullProp } from "../../../utils";
import { IAppCreationWizardContext } from "./IAppCreationWizardContext";

export class CreateAppStep extends AzureWizardExecuteStep<IAppCreationWizardContext> {
    public priority: number = 135;

    public async execute(context: IAppCreationWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {

        const message: string = localize('creatingNewApp', 'Creating and provisioning new app "{0}"...', context.newAppName);
        ext.outputChannel.appendLog(message);
        progress.report({ message });

        const appName: string = nonNullProp(context, 'newAppName');
        const client: AppPlatformManagementClient = createAzureClient(context, AppPlatformManagementClient);
        const serviceId: SpringCloudResourceId = new SpringCloudResourceId(context.service.id!);
        context.newApp = await client.apps.createOrUpdate(serviceId.resourceGroup, serviceId.serviceName, appName, {
            properties: {
                publicProperty: true
            }
        });
        return Promise.resolve(undefined);
    }

    public shouldExecute(_context: IAppCreationWizardContext): boolean {
        return true;
    }
}
