// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureWizardExecuteStep } from "@microsoft/vscode-azext-utils";
import { Progress } from "vscode";
import { IScaleSettings } from "../../../model";
import { EnhancedDeployment } from "../../../model/EnhancedDeployment";
import { localize } from "../../../utils";
import { IScaleSettingsUpdateWizardContext } from "./IScaleSettingsUpdateWizardContext";

export class UpdateScaleSettingsStep extends AzureWizardExecuteStep<IScaleSettingsUpdateWizardContext> {
    public readonly priority: number = 145;
    private readonly deployment: EnhancedDeployment;

    constructor(deployment: EnhancedDeployment) {
        super();
        this.deployment = deployment;
    }

    public async execute(context: IScaleSettingsUpdateWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const o: IScaleSettings = await this.deployment.getScaleSettings();
        const n: IScaleSettings = context.newSettings;
        if (n.capacity === o.capacity && n.memory === o.memory && n.cpu === o.cpu) {
            progress.report({ message: localize('noScaleSettingChanged', 'No setting is changed') });
            return Promise.resolve(undefined);
        }
        const message: string = localize('updatingScaleSetting', 'Updating scale settings of "{0}"...', this.deployment.app.name);
        progress.report({ message });
        await this.deployment.updateScaleSettings(context.newSettings);
        return Promise.resolve(undefined);
    }

    public shouldExecute(context: IScaleSettingsUpdateWizardContext): boolean {
        return context.newSettings !== undefined;
    }
}
