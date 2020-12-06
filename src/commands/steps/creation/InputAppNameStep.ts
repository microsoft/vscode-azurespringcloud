import { AzureNameStep, createAzureClient, IAzureNamingRules } from "vscode-azureextensionui";
import IAppCreationWizardContext from "../../../model/IAppCreationWizardContext";
import { localize } from "../../../utils";
import { ext } from "../../../extensionVariables";
import { AppPlatformManagementClient } from "@azure/arm-appplatform";

const appNamingRules: IAzureNamingRules = {
  minLength: 2,
  maxLength: 60,
  invalidCharsRegExp: /[^a-zA-Z0-9\-]/
};

export class InputAppNameStep extends AzureNameStep<IAppCreationWizardContext> {
  public async prompt(context: IAppCreationWizardContext): Promise<void> {
    const client: AppPlatformManagementClient = await createAzureClient(context, AppPlatformManagementClient);
    const prompt: string = localize('appNamePrompt', 'Enter a globally unique name for the new Spring Cloud app.');
    context.newAppName = (await ext.ui.showInputBox({
      prompt,
      validateInput: async (name: string): Promise<string | undefined> => this.validateSiteName(name, client)
    })).trim();
    return Promise.resolve(undefined);
  }

  private async validateSiteName(name: string, _client: AppPlatformManagementClient): Promise<string | undefined> {
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

  public shouldPrompt(context: IAppCreationWizardContext): boolean {
    return !context.newAppName;
  }

  protected async isRelatedNameAvailable(_context: IAppCreationWizardContext, _name: string): Promise<boolean> {
    return false;
  }
}
