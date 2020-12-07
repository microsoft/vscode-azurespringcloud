import { AzureWizardPromptStep } from "vscode-azureextensionui";
import { localize } from "../../../../utils";
import { ext } from "../../../../extensionVariables";
import { IJvmOptionsUpdateWizardContext } from "./IJvmOptionsUpdateWizardContext";

export class InputJvmOptionsStep extends AzureWizardPromptStep<IJvmOptionsUpdateWizardContext> {
  public async prompt(context: IJvmOptionsUpdateWizardContext): Promise<void> {
    const prompt: string = localize('jvmOptionsPrompt', 'Enter new JVM options for the Spring Cloud app.');
    context.newJvmOptions = (await ext.ui.showInputBox({
      prompt,
      value: context.deployment.properties?.deploymentSettings?.jvmOptions || '',
      validateInput: this.validateInput
    })).trim();
    return Promise.resolve(undefined);
  }

  private async validateInput(_name: string): Promise<string | undefined> {
    return undefined;//TODO: validating
  }

  public shouldPrompt(context: IJvmOptionsUpdateWizardContext): boolean {
    return context.newJvmOptions == undefined;
  }
}
