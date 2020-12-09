import { AzureWizardPromptStep } from "vscode-azureextensionui";
import { ext } from "../../../../extensionVariables";
import { localize } from "../../../../utils";
import { IScaleSettingsUpdateWizardContext } from "./IScaleSettingsUpdateWizardContext";

export class InputScaleValueStep extends AzureWizardPromptStep<IScaleSettingsUpdateWizardContext> {
    private readonly label: string;
    private readonly key: string;
    private readonly scope: { max: number; min: number };

    constructor(label: string, key: string, scope: { max: number; min: number }) {
        super();
        this.label = label;
        this.key = key;
        this.scope = scope;
        // tslint:disable-next-line:no-unsafe-any
        this.validateInput = this.validateInput.bind(this);
    }

    public async prompt(context: IScaleSettingsUpdateWizardContext): Promise<void> {
        const prompt: string = localize('numberInputPrompt', 'Enter new value of "{0}".', this.label);
        const value: string = `${context.oldSettings[this.key]}`;
        context.newSettings[this.key] = Number((await ext.ui.showInputBox({ prompt, value, validateInput: this.validateInput })).trim());
        return Promise.resolve(undefined);
    }

    public shouldPrompt(_context: IScaleSettingsUpdateWizardContext): boolean {
        return true;
    }

    private async validateInput(val: string): Promise<string | undefined> {
        const numVal: number = Number(val);
        if (!Number.isInteger(numVal) || numVal > this.scope.max || numVal < this.scope.min) {
            return localize('invalidScaleSettingValue', 'The value must be integer and between {0} and {1}', this.scope.min, this.scope.max);
        }
        return undefined;
    }
}
