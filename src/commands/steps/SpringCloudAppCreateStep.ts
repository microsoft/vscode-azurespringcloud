import ISpringCloudAppWizardContext from "../../model/ISpringCloudAppWizardContext";
import { AzureWizardExecuteStep, createAzureClient } from "vscode-azureextensionui";
import { Progress } from "vscode";
import { localize, nonNullProp } from "../../utils";
import { ext } from "../../extensionVariables";
import { AppPlatformManagementClient } from "@azure/arm-appplatform";
import SpringCloudResourceId from "../../model/SpringCloudResourceId";

export class SpringCloudAppCreateStep extends AzureWizardExecuteStep<ISpringCloudAppWizardContext> {
  public priority: number = 135;

  public async execute(context: ISpringCloudAppWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {

    const message: string = localize('creatingNewApp', 'Creating new Spring Cloud app "{0}"...', context.newAppName);
    ext.outputChannel.appendLog(message);
    progress.report({message});

    const appName: string = nonNullProp(context, 'newAppName');
    const client: AppPlatformManagementClient = await createAzureClient(context, AppPlatformManagementClient);
    const serviceId = new SpringCloudResourceId(context.service.id!);
    context.newApp = await client.apps.createOrUpdate(serviceId.getResourceGroup(), serviceId.getServiceName(), appName, {
      properties: {
        publicProperty: true
      }
    });
    return Promise.resolve(undefined);
  }

  public shouldExecute(_context: ISpringCloudAppWizardContext): boolean {
    return true;
  }
}
