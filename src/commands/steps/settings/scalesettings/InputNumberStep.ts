import { AzureWizardPromptStep } from "vscode-azureextensionui";
import { ext } from "../../../../extensionVariables";
import { localize } from "../../../../utils";
import { IScaleSettingsUpdateWizardContext } from "./IScaleSettingsUpdateWizardContext";

export class InputNumberStep extends AzureWizardPromptStep<IScaleSettingsUpdateWizardContext> {
    private readonly label: string;
    private readonly key: string;

    constructor(label: string, key: string) {
        super();
        this.label = label;
        this.key = key;
    }

    public async prompt(context: IScaleSettingsUpdateWizardContext): Promise<void> {
        const prompt: string = localize('numberInputPrompt', 'Enter new value of "{0}".', this.label);
        const value: string = context.newSettings[this.key] + '';
        context.newSettings[this.key] = Number((await ext.ui.showInputBox({prompt, value, validateInput: this.validateInput})).trim());
        return Promise.resolve(undefined);
    }

    public shouldPrompt(_context: IScaleSettingsUpdateWizardContext): boolean {
        return true;
    }

    private async validateInput(val: string): Promise<string | undefined> {
        const numVal: number = Number(val);
        if (isNaN(numVal)) {
            return 'Only number is acceptable!';
        }
        return undefined;
    }
}
