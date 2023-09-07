// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureWizardPromptStep } from "@microsoft/vscode-azext-utils";
import { IScaleSettings } from "../../../model";
import { EnhancedDeployment } from "../../../model/EnhancedDeployment";
import { localize } from "../../../utils";
import { IScaleSettingsUpdateWizardContext } from "./IScaleSettingsUpdateWizardContext";

export class InputConsumptionPlanScaleOutValueStep extends AzureWizardPromptStep<IScaleSettingsUpdateWizardContext> {
    // refer https://github.com/microsoft/vscode-azuretools/issues/789
    public supportsDuplicateSteps: boolean = true;
    private readonly deployment: EnhancedDeployment;

    constructor(deployment: EnhancedDeployment) {
        super();
        this.deployment = deployment;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        this.validateInput = this.validateInput.bind(this);
    }

    public async prompt(context: IScaleSettingsUpdateWizardContext): Promise<void> {
        const prompt: string = `Enter new value of "Max replicas" that'll be deployed in response to a trigger event.`;
        const settings: IScaleSettings = await this.deployment.getScaleSettings();
        const value: string = `${settings.capacity}`;
        context.newSettings.capacity = Number((await context.ui.showInputBox({ prompt, value, validateInput: this.validateInput })).trim());
        return Promise.resolve(undefined);
    }

    public shouldPrompt(_context: IScaleSettingsUpdateWizardContext): boolean {
        return true;
    }

    private async validateInput(val: string): Promise<string | undefined> {
        const numVal: number = Number(val);
        const valid: boolean = Number.isInteger(numVal) && numVal <= 30 && numVal >= 1;
        if (!valid) {
            return localize('invalidCapacitySettingValue', 'The value can only be an integer between {0} and {1}', 1, 30);
        }
        return undefined;
    }
}
