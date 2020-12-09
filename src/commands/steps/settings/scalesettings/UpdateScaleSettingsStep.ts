import { AppPlatformManagementClient } from "@azure/arm-appplatform";
import { DeploymentResource } from "@azure/arm-appplatform/esm/models";
import { Progress } from "vscode";
import { AzureWizardExecuteStep, createAzureClient } from "vscode-azureextensionui";
import { SpringCloudResourceId } from "../../../../model/SpringCloudResourceId";
import { localize } from "../../../../utils";
import { IScaleSettings } from "./IScaleSettings";
import { IScaleSettingsUpdateWizardContext } from "./IScaleSettingsUpdateWizardContext";

export class UpdateScaleSettingsStep extends AzureWizardExecuteStep<IScaleSettingsUpdateWizardContext> {
    public priority: number = 145;

    private static toResource(context: IScaleSettingsUpdateWizardContext): DeploymentResource {
        const resource: DeploymentResource = { properties: { deploymentSettings: { cpu: context.newSettings.cpu, memoryInGB: context.newSettings.memory } } };
        if (context.newSettings.capacity !== undefined) {
            context.deployment.sku!.capacity = context.newSettings.capacity;
            resource.sku = context.deployment.sku;
        }
        return resource;
    }

    public async execute(context: IScaleSettingsUpdateWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const appId: SpringCloudResourceId = new SpringCloudResourceId(context.app.id!);
        const n: IScaleSettings = context.newSettings;
        const o: IScaleSettings = context.oldSettings;
        if (n.capacity === o.capacity && n.memory === o.memory && n.cpu === o.cpu) {
            progress.report({ message: localize('noScaleSettingChanged', 'No setting is changed') });
            return Promise.resolve(undefined);
        }
        const message: string = localize('updatingScaleSetting', 'Updating scale settings of Spring Cloud app "{0}"...', appId.appName);
        progress.report({ message });

        const client: AppPlatformManagementClient = createAzureClient(context, AppPlatformManagementClient);
        const resource: DeploymentResource = UpdateScaleSettingsStep.toResource(context);
        await client.deployments.update(appId.resourceGroup, appId.serviceName, appId.appName, context.deployment.name!, resource);
        return Promise.resolve(undefined);
    }

    public shouldExecute(context: IScaleSettingsUpdateWizardContext): boolean {
        return context.newSettings !== undefined;
    }
}
