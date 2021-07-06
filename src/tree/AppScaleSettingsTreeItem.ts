/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { window } from "vscode";
import { AzExtTreeItem, AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep, IActionContext, TreeItemIconPath } from "vscode-azureextensionui";
import { InputScaleValueStep } from "../commands/steps/settings/scalesettings/InputScaleValueStep";
import { IScaleSettingsUpdateWizardContext } from "../commands/steps/settings/scalesettings/IScaleSettingsUpdateWizardContext";
import { UpdateScaleSettingsStep } from "../commands/steps/settings/scalesettings/UpdateScaleSettingsStep";
import { IDeployment, IScaleSettings } from "../model";
import { getThemedIconPath, localize } from "../utils";
import { AppSettingsTreeItem } from "./AppSettingsTreeItem";
import { AppSettingTreeItem, IOptions } from "./AppSettingTreeItem";
import { AppTreeItem } from "./AppTreeItem";

export class AppScaleSettingsTreeItem extends AppSettingsTreeItem {
    public static contextValue: string = 'azureSpringCloud.app.scaleSettings';
    private static readonly _options: IOptions = {
        contextValue: 'azureSpringCloud.app.scaleSetting',
    };

    public readonly contextValue: string = AppScaleSettingsTreeItem.contextValue;
    public readonly iconPath: TreeItemIconPath = getThemedIconPath('app-scale');
    public readonly id: string = AppScaleSettingsTreeItem.contextValue;
    public readonly label: string = 'Scale Settings';

    public constructor(parent: AppTreeItem, deployment: IDeployment) {
        super(parent, deployment);
    }

    public get settings(): IScaleSettings {
        return this.deployment.getScaleSettings();
    }

    public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        return Object.entries(this.settings)
            .map(e => this.toAppSettingItem(e[0], `${e[1]}`, Object.assign({ label: IScaleSettings.LABELS[e[0]] }, AppScaleSettingsTreeItem._options)));
    }

    public async updateSettingsValue(context: IActionContext, key?: string): Promise<string> {
        const scaling: string = localize('scaling', 'Scaling "{0}"', this.deployment.app.name);
        const scaled: string = localize('scaled', 'Successfully scaled "{0}".', this.deployment.app.name);

        const newSettings: IScaleSettings = { ...this.settings };
        const wizardContext: IScaleSettingsUpdateWizardContext = Object.assign(context, this.root, { newSettings });
        const steps: AzureWizardPromptStep<IScaleSettingsUpdateWizardContext>[] = [
            new InputScaleValueStep(this.deployment, 'capacity'),
            new InputScaleValueStep(this.deployment, 'memory'),
            new InputScaleValueStep(this.deployment, 'cpu')
        ];
        const promptSteps: AzureWizardPromptStep<IScaleSettingsUpdateWizardContext>[] = [];
        const executeSteps: AzureWizardExecuteStep<IScaleSettingsUpdateWizardContext>[] = [];
        if (!key) {
            promptSteps.push(...steps);
        } else {
            promptSteps.push(steps[['capacity', 'memory', 'cpu'].indexOf(key)]);
        }
        executeSteps.push(new UpdateScaleSettingsStep(this.deployment));
        const wizard: AzureWizard<IScaleSettingsUpdateWizardContext> = new AzureWizard(wizardContext, { promptSteps, executeSteps, title: scaling });
        await wizard.prompt();
        await wizard.execute();
        this.parent.refresh();
        window.showInformationMessage(scaled);
        return `${wizardContext.newSettings[key ?? 'capacity']}`;
    }

    public async updateSettingValue(node: AppSettingTreeItem, context: IActionContext): Promise<string> {
        return this.updateSettingsValue(context, node.key);
    }

    public async deleteSettingItem(_node: AppSettingTreeItem, _context: IActionContext): Promise<void> {
        // tslint:disable-next-line:no-unexternalized-strings
        throw new Error("Scale settings can not be deleted.");
    }
}
