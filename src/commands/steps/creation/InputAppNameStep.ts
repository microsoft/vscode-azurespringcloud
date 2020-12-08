import { AppPlatformManagementClient } from "@azure/arm-appplatform";
import { AppResource } from "@azure/arm-appplatform/esm/models";
import { AppResourceCollection } from "@azure/arm-appplatform/src/models/index";
import { AzureNameStep, createAzureClient } from "vscode-azureextensionui";
import { ext } from "../../../extensionVariables";
import { SpringCloudResourceId } from "../../../model/SpringCloudResourceId";
import { localize } from "../../../utils";
import { IAppCreationWizardContext } from "./IAppCreationWizardContext";

export class InputAppNameStep extends AzureNameStep<IAppCreationWizardContext> {
    //refer: https://dev.azure.com/msazure/AzureDMSS/_git/AzureDMSS-PortalExtension?path=%2Fsrc%2FSpringCloudPortalExt%2FClient%2FCreateApplication%2FCreateApplicationBlade.ts&version=GBdev&line=463&lineEnd=463&lineStartColumn=25&lineEndColumn=55&lineStyle=plain&_a=contents
    private static readonly VALID_NAME_REGEX: RegExp = /^[a-z][a-z0-9-]{2,30}[a-z0-9]$/;

    private static async validateAppName(name: string, context: IAppCreationWizardContext, client: AppPlatformManagementClient): Promise<string | undefined> {
        name = name.trim();
        if (name) {
            if (!InputAppNameStep.VALID_NAME_REGEX.test(name)) {
                return localize('invalidName', `
                    The name is invalid. It can contain only lowercase letters, numbers and hyphens.
                    The first character must be a letter.
                    The last character must be a letter or number.
                    The value must be between 4 and 32 characters long.
                `);
            } else {
                const serviceId: SpringCloudResourceId = new SpringCloudResourceId(context.service.id!);
                const apps: AppResourceCollection = await client.apps.list(serviceId.resourceGroup, serviceId.serviceName);
                if (apps.every((app: AppResource) => app.name !== name)) {
                    return undefined;
                }
                return localize('existAppName', "App with this name already exists.");
            }
        } else {
            return localize('emptyName', 'The name is required.');
        }
    }

    public async prompt(context: IAppCreationWizardContext): Promise<void> {
        const client: AppPlatformManagementClient = createAzureClient(context, AppPlatformManagementClient);
        const prompt: string = localize('appNamePrompt', 'Enter a globally unique name for the new Spring Cloud app.');
        context.newAppName = (await ext.ui.showInputBox({
            prompt,
            validateInput: async (name: string): Promise<string | undefined> => InputAppNameStep.validateAppName(name, context, client)
        })).trim();
        return Promise.resolve(undefined);
    }

    public shouldPrompt(context: IAppCreationWizardContext): boolean {
        return !context.newAppName;
    }

    protected async isRelatedNameAvailable(_context: IAppCreationWizardContext, _name: string): Promise<boolean> {
        return false;
    }
}
