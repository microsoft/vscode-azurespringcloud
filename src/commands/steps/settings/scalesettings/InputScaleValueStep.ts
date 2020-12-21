import { AzureWizardPromptStep } from "vscode-azureextensionui";
import { ext } from "../../../../extensionVariables";
import { EnhancedDeployment, IScaleSettings } from "../../../../model";
import { localize } from "../../../../utils";
import { IScaleSettingsUpdateWizardContext } from "./IScaleSettingsUpdateWizardContext";

export class InputScaleValueStep extends AzureWizardPromptStep<IScaleSettingsUpdateWizardContext> {
    private readonly key: string;
    private readonly deployment: EnhancedDeployment;

    constructor(deployment: EnhancedDeployment, key: string) {
        super();
        this.deployment = deployment;
        this.key = key;
        // tslint:disable-next-line:no-unsafe-any
        this.validateInput = this.validateInput.bind(this);
    }

    public async prompt(context: IScaleSettingsUpdateWizardContext): Promise<void> {
        const prompt: string = localize('numberInputPrompt', 'Enter new value of "{0}".', IScaleSettings.LABELS[this.key]);
        const settings: IScaleSettings = this.deployment.getScaleSettings();
        const value: string = `${settings[this.key]}`;
        context.newSettings[this.key] = Number((await ext.ui.showInputBox({ prompt, value, validateInput: this.validateInput })).trim());
        return Promise.resolve(undefined);
    }

    public shouldPrompt(_context: IScaleSettingsUpdateWizardContext): boolean {
        return true;
    }

    private async validateInput(val: string): Promise<string | undefined> {
        const numVal: number = Number(val);
        const scope: { max: number; min: number } = IScaleSettings.SCOPES[this.deployment.sku?.tier ?? 'Basic'][this.key];
        if (!Number.isInteger(numVal) || numVal > scope.max || numVal < scope.min) {
            if (this.key === 'cpu' && this.deployment.sku?.tier === 'Basic') {
                return localize('invalidBasicCPU', 'Each app instance can have only 1 vCPU for Basic pricing tier');
            }
            return localize('invalidScaleSettingValue', 'The value must be integer and between {0} and {1}', scope.min, scope.max);
        }
        return undefined;
    }
}
