// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
    AzureWizard,
    AzureWizardExecuteStep,
    AzureWizardPromptStep, createSubscriptionContext,
    IActionContext
} from "@microsoft/vscode-azext-utils";
import { TreeItem, TreeItemCollapsibleState, window } from "vscode";
import { ext } from "../extensionVariables";
import { IScaleSettings } from "../model";
import { EnhancedDeployment } from "../model/EnhancedDeployment";
import { getThemedIconPath, localize } from "../utils";
import { InputConsumptionPlanScaleOutValueStep } from "../workflows/updatesettings/scalesettings/InputConsumptionPlanScaleOutValueStep";
import { InputConsumptionPlanScaleUpValueStep } from "../workflows/updatesettings/scalesettings/InputConsumptionPlanScaleUpValueStep";
import { InputScaleValueStep } from "../workflows/updatesettings/scalesettings/InputScaleValueStep";
import { IScaleSettingsUpdateWizardContext } from "../workflows/updatesettings/scalesettings/IScaleSettingsUpdateWizardContext";
import { UpdateScaleSettingsStep } from "../workflows/updatesettings/scalesettings/UpdateScaleSettingsStep";
import { AppItem } from "./AppItem";
import { AppSettingItem, IOptions } from "./AppSettingItem";
import { AppSettingsItem } from "./AppSettingsItem";

export class AppScaleSettingsItem extends AppSettingsItem {
    public static contextValue: string = 'azureSpringApps.app.scaleSettings';
    private static readonly _options: IOptions = {
        contextValue: 'azureSpringApps.app.scaleSetting',
    };

    public readonly contextValue: string = AppScaleSettingsItem.contextValue;
    public readonly label: string = 'Scale Settings';
    public readonly id: string = `${this.parent.id}/scaleSettings`;

    public constructor(parent: AppItem) {
        super(parent);
    }

    public getTreeItem(): TreeItem | Thenable<TreeItem> {
        return {
            id: this.id,
            label: this.label,
            iconPath: getThemedIconPath('app-scale'),
            contextValue: this.contextValue,
            collapsibleState: TreeItemCollapsibleState.Collapsed,
        };
    }

    public async updateSettingsValue(context: IActionContext, key?: string): Promise<string> {
        const deployment: EnhancedDeployment | undefined = await this.parent.app.activeDeployment;
        if (deployment) {
            const scaling: string = localize('scaling', 'Scaling "{0}"', deployment.app.name);
            const scaled: string = localize('scaled', 'Successfully scaled "{0}".', deployment.app.name);

            const newSettings: IScaleSettings = { ... await deployment.getScaleSettings() };
            const subContext = createSubscriptionContext(this.parent.app.subscription);
            const wizardContext: IScaleSettingsUpdateWizardContext = Object.assign(context, subContext, { newSettings });
            const steps: AzureWizardPromptStep<IScaleSettingsUpdateWizardContext>[] = await this.parent.app.service.isConsumptionTier() ?
                [
                    new InputConsumptionPlanScaleOutValueStep(deployment),
                    new InputConsumptionPlanScaleUpValueStep(deployment),
                ] : [
                    new InputScaleValueStep(deployment, 'capacity'),
                    new InputScaleValueStep(deployment, 'memory'),
                    new InputScaleValueStep(deployment, 'cpu')
                ];
            const promptSteps: AzureWizardPromptStep<IScaleSettingsUpdateWizardContext>[] = [];
            const executeSteps: AzureWizardExecuteStep<IScaleSettingsUpdateWizardContext>[] = [];
            if (!key) {
                promptSteps.push(...steps);
            } else {
                if (await this.parent.app.service.isConsumptionTier()) {
                    promptSteps.push(steps[key === 'capacity' ? 0 : 1]);
                } else {
                    promptSteps.push(steps[['capacity', 'memory', 'cpu'].indexOf(key)]);
                }
            }
            executeSteps.push(new UpdateScaleSettingsStep(deployment));
            const wizard: AzureWizard<IScaleSettingsUpdateWizardContext> = new AzureWizard(wizardContext, { promptSteps, executeSteps, title: scaling });
            await wizard.prompt();
            await ext.state.runWithTemporaryDescription(this.id, 'Scaling...', () => wizard.execute())
            void window.showInformationMessage(scaled);
            void this.parent.refresh();
            return `${wizardContext.newSettings[key ?? 'capacity']}`;
        }
        return '';
    }

    public async updateSettingValue(node: AppSettingItem, context: IActionContext): Promise<string> {
        return this.updateSettingsValue(context, node.key);
    }

    public async deleteSettingItem(_node: AppSettingItem, _context: IActionContext): Promise<void> {
        throw new Error('Scale settings can not be deleted.');
    }

    protected async loadChildren(): Promise<AppSettingItem[] | undefined> {
        const deployment: EnhancedDeployment | undefined = await this.parent.app.activeDeployment;
        const settings: IScaleSettings = await deployment?.getScaleSettings() ?? {};
        const capacityLabel: string = await this.parent.app.service.isConsumptionTier() ? 'Max replicas' : 'Instance count';
        return [
            new AppSettingItem(this, 'capacity', `${settings.capacity}`.trim(), Object.assign({ label: capacityLabel }, AppScaleSettingsItem._options)),
            new AppSettingItem(this, 'cpu', `${settings.cpu}`.trim(), Object.assign({ label: 'vCPU' }, AppScaleSettingsItem._options)),
            new AppSettingItem(this, 'memory', `${settings.memory}`.trim(), Object.assign({ label: 'Memory/GB' }, AppScaleSettingsItem._options))
        ];
    }
}
