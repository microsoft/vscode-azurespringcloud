import { AppPlatformManagementClient } from "@azure/arm-appplatform";
import { AzureNameStep, createAzureClient, IAzureNamingRules } from "vscode-azureextensionui";
import { ext } from "../../../extensionVariables";
import { localize } from "../../../utils";
import { IAppCreationWizardContext } from "./IAppCreationWizardContext";

const appNamingRules: IAzureNamingRules = {
    minLength: 2,
    maxLength: 60,
    invalidCharsRegExp: /[^a-zA-Z0-9\-]/
};

export class InputAppNameStep extends AzureNameStep<IAppCreationWizardContext> {

    private static async validateAppName(name: string, _client: AppPlatformManagementClient): Promise<string | undefined> {
        name = name.trim();
        if (name.length < appNamingRules.minLength || name.length > appNamingRules.maxLength) {
            return localize('invalidLength', 'The name must be between {0} and {1} characters.', appNamingRules.minLength, appNamingRules.maxLength);
        } else if (appNamingRules.invalidCharsRegExp.test(name)) {
            return localize('invalidChars', "The name can only contain letters, numbers, or hyphens.");
        } else {
            //TODO: validate if app with same name exists
            return undefined;
        }
    }

    public async prompt(context: IAppCreationWizardContext): Promise<void> {
        const client: AppPlatformManagementClient = createAzureClient(context, AppPlatformManagementClient);
        const prompt: string = localize('appNamePrompt', 'Enter a globally unique name for the new Spring Cloud app.');
        context.newAppName = (await ext.ui.showInputBox({
            prompt,
            validateInput: async (name: string): Promise<string | undefined> => InputAppNameStep.validateAppName(name, client)
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
