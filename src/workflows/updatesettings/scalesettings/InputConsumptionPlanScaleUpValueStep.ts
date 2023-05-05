// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureWizardPromptStep, IAzureQuickPickItem, IAzureQuickPickOptions } from "@microsoft/vscode-azext-utils";
import { IScaleSettings } from "../../../model";
import { EnhancedDeployment } from "../../../model/EnhancedDeployment";
import { IScaleSettingsUpdateWizardContext } from "./IScaleSettingsUpdateWizardContext";

export class InputConsumptionPlanScaleUpValueStep extends AzureWizardPromptStep<IScaleSettingsUpdateWizardContext> {
    // refer https://github.com/microsoft/vscode-azuretools/issues/789
    public supportsDuplicateSteps: boolean = true;
    private readonly deployment: EnhancedDeployment;
    private static picks: IAzureQuickPickItem<[number, number]>[] = [
        { label: 'vCPU: 0.25, Memory: 512Mi', data: [0.25, 0.5] },
        { label: 'vCPU: 0.50, Memory: 1.0Gi', data: [0.5, 1] },
        { label: 'vCPU: 0.75, Memory: 1.5Gi', data: [0.75, 1.5] },
        { label: 'vCPU: 1.00, Memory: 2.0Gi', data: [1, 2] },
        { label: 'vCPU: 1.25, Memory: 2.5Gi', data: [1.25, 2.5] },
        { label: 'vCPU: 1.50, Memory: 3.0Gi', data: [1.5, 3] },
        { label: 'vCPU: 1.75, Memory: 3.5Gi', data: [1.75, 3.5] },
        { label: 'vCPU: 2.00, Memory: 4.0Gi', data: [2, 4] },
    ];

    constructor(deployment: EnhancedDeployment) {
        super();
        this.deployment = deployment;
    }

    public async prompt(context: IScaleSettingsUpdateWizardContext): Promise<void> {
        const prompt: string = `Scale your application by adjusting the amount of vCPU and memory.`;
        const settings: IScaleSettings = this.deployment.getScaleSettings();
        const options: IAzureQuickPickOptions = {
            placeHolder: prompt,
            isPickSelected: (i: IAzureQuickPickItem<[number, number]>) => settings.memory === i[1]
        };
        const selection: [number, number] = (await context.ui.showQuickPick(InputConsumptionPlanScaleUpValueStep.picks, options)).data;
        context.newSettings.cpu = selection[0];
        context.newSettings.memory = selection[1];
        return Promise.resolve(undefined);
    }

    public shouldPrompt(_context: IScaleSettingsUpdateWizardContext): boolean {
        return this.deployment.app.service.isConsumptionTier();
    }
}
