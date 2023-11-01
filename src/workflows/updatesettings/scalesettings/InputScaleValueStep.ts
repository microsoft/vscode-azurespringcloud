// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureWizardPromptStep } from "@microsoft/vscode-azext-utils";
import { IScaleSettings } from "../../../model";
import { EnhancedDeployment } from "../../../model/EnhancedDeployment";
import { localize } from "../../../utils";
import { IScaleSettingsUpdateWizardContext } from "./IScaleSettingsUpdateWizardContext";

export class InputScaleValueStep extends AzureWizardPromptStep<IScaleSettingsUpdateWizardContext> {
    // refer https://github.com/microsoft/vscode-azuretools/issues/789
    public supportsDuplicateSteps: boolean = true;
    private readonly key: string;
    private readonly deployment: EnhancedDeployment;

    constructor(deployment: EnhancedDeployment, key: string) {
        super();
        this.deployment = deployment;
        this.key = key;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this.validateInput = this.validateInput.bind(this);
    }

    public async prompt(context: IScaleSettingsUpdateWizardContext): Promise<void> {
        const prompt: string = localize('numberInputPrompt', 'Enter new value of "{0}".', IScaleSettings.LABELS[this.key]);
        const settings: IScaleSettings = await this.deployment.getScaleSettings();
        const value: string = `${settings[this.key]}`;
        context.newSettings[this.key] = Number((await context.ui.showInputBox({ prompt, value, validateInput: this.validateInput })).trim());
        return Promise.resolve(undefined);
    }

    public shouldPrompt(_context: IScaleSettingsUpdateWizardContext): boolean {
        return true;
    }

    private async validateInput(val: string): Promise<string | undefined> {
        const numVal: number = Number(val);
        const tier: string | undefined = (await this.deployment.app.service.sku)?.tier;
        const scope: { max: number; min: number } = IScaleSettings.SCOPES[tier ?? 'Basic'][this.key];
        if (this.key === 'cpu') {
            const valid: boolean = numVal === 0.5 || (Number.isInteger(numVal) && numVal <= scope.max && numVal >= scope.min);
            if (!valid) {
                if (tier === 'Basic') {
                    return localize('invalidBasicCPU', 'Each app instance can have only 0.5 or 1 vCPU for Basic pricing tier');
                } else {
                    return localize('invalidScaleSettingValue', 'The value can only be 0.5 or an integer between 1 and {0}', scope.max);
                }
            }
        } else if (this.key === 'memory') {
            const valid: boolean = numVal === 0.5 || (Number.isInteger(numVal) && numVal <= scope.max && numVal >= scope.min);
            if (!valid) {
                return localize('invalidScaleSettingValue', 'The value can only be 0.5 or an integer between 1 and {0}', scope.max);
            }
        } else {
            const valid: boolean = Number.isInteger(numVal) && numVal <= scope.max && numVal >= scope.min;
            if (!valid) {
                return localize('invalidCapacitySettingValue', 'The value can only be an integer between {0} and {1}', scope.min, scope.max);
            }
        }
        return undefined;
    }
}
