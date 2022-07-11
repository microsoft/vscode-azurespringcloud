// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { JarUploadedUserSourceInfo } from "@azure/arm-appplatform";
import {
    AzExtTreeItem,
    AzureWizard,
    AzureWizardExecuteStep,
    AzureWizardPromptStep,
    IActionContext,
    ICreateChildImplContext,
    TreeItemIconPath
} from "@microsoft/vscode-azext-utils";
import { window } from "vscode";
import { IJvmOptionsUpdateWizardContext } from "../commands/steps/settings/jvmoptions/IJvmOptionsUpdateWizardContext";
import { InputJvmOptionsStep } from "../commands/steps/settings/jvmoptions/InputJvmOptionsStep";
import { UpdateJvmOptionsStep } from "../commands/steps/settings/jvmoptions/UpdateJvmOptionsStep";
import { EnhancedDeployment } from "../service/EnhancedDeployment";
import { getThemedIconPath, localize } from "../utils";
import { AppSettingsTreeItem } from "./AppSettingsTreeItem";
import { AppSettingTreeItem, IOptions } from "./AppSettingTreeItem";
import { AppTreeItem } from "./AppTreeItem";

export class AppJvmOptionsTreeItem extends AppSettingsTreeItem {
    public static contextValue: string = 'azureSpringApps.app.jvmOptions';
    private static readonly _options: IOptions = {
        contextValue: 'azureSpringApps.app.jvmOption',
    };
    private static readonly JVM_OPTION_PATTERN: RegExp = /^-[a-zA-Z_]+\S*$/;
    public readonly contextValue: string = AppJvmOptionsTreeItem.contextValue;
    public readonly label: string = 'JVM Options';

    public constructor(parent: AppTreeItem) {
        super(parent);
    }

    public get iconPath(): TreeItemIconPath { return getThemedIconPath('app-jvmoptions'); }
    public get id(): string { return AppJvmOptionsTreeItem.contextValue; }

    public get options(): Promise<string[]> {
        return (async () => {
            const deployment: EnhancedDeployment | undefined = await this.parent.app.getActiveDeployment();
            const enterpriseOptionsStr: string | undefined = deployment?.properties?.deploymentSettings?.environmentVariables?.JAVA_OPTS;
            const source: JarUploadedUserSourceInfo = <JarUploadedUserSourceInfo>deployment?.properties?.source;
            const oldOptionsStr: string | undefined = source?.jvmOptions?.trim();
            const optionsStr: string | undefined = enterpriseOptionsStr ?? oldOptionsStr;
            if (optionsStr) {
                return ` ${optionsStr}`.split(/\s+-/).filter(s => s.trim()).map(s => `-${s}`);
            }
            return [];
        })();

    }

    public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        return (await this.options).map(option => this.toAppSettingItem('', option.trim(), Object.assign({}, AppJvmOptionsTreeItem._options)));
    }

    public async createChildImpl(context: ICreateChildImplContext): Promise<AzExtTreeItem> {
        const newVal: string = await context.ui.showInputBox({
            prompt: 'Enter new JVM option:',
            placeHolder: 'e.g. -Xmx2048m',
            validateInput: this.validateJvmOption
        });
        context.showCreatingTreeItem(newVal);
        await this.updateSettingsValue(context, [...await this.options, newVal]);
        return this.toAppSettingItem('', newVal, Object.assign({}, AppJvmOptionsTreeItem._options));
    }

    public async updateSettingValue(node: AppSettingTreeItem, context: IActionContext | ICreateChildImplContext): Promise<string> {
        const newVal: string = await context.ui.showInputBox({
            prompt: 'Update JVM option:',
            value: node.value ?? '',
            placeHolder: 'e.g. -Xmx2048m',
            validateInput: this.validateJvmOption
        });
        const options: string[] = [...await this.options];
        const index: number = options.indexOf(node.value.trim());
        options.splice(index, 1, newVal.trim());
        await this.updateSettingsValue(context, options);
        return newVal;
    }

    public async deleteSettingItem(node: AppSettingTreeItem, context: IActionContext): Promise<void> {
        const tempOptions: string[] = [...await this.options];
        const index: number = tempOptions.indexOf(node.value);
        tempOptions.splice(index, 1);
        await this.updateSettingsValue(context, tempOptions);
    }

    public async updateSettingsValue(context: IActionContext, newJvmOptions?: string[]): Promise<void> {
        const deployment: EnhancedDeployment | undefined = await this.parent.app.getActiveDeployment();
        if (deployment) {
            const updating: string = localize('updatingJvmOptions', 'Updating JVM options of "{0}"', deployment.app.name);
            const updated: string = localize('updatedJvmOptions', 'Successfully updated JVM options of "{0}".', deployment.app.name);

            const wizardContext: IJvmOptionsUpdateWizardContext = Object.assign(context, this.subscription, {
                newJvmOptions: newJvmOptions?.join(' ')
            });

            const promptSteps: AzureWizardPromptStep<IJvmOptionsUpdateWizardContext>[] = [];
            const executeSteps: AzureWizardExecuteStep<IJvmOptionsUpdateWizardContext>[] = [];
            promptSteps.push(new InputJvmOptionsStep(deployment));
            executeSteps.push(new UpdateJvmOptionsStep(deployment));
            const wizard: AzureWizard<IJvmOptionsUpdateWizardContext> = new AzureWizard(wizardContext, { promptSteps, executeSteps, title: updating });
            await wizard.prompt();
            await wizard.execute();
            window.showInformationMessage(updated);
            this.parent.refresh(context);
        }
    }

    public async validateJvmOption(v: string): Promise<string | undefined> {
        if (!v.trim()) {
            return `Enter a value.`;
        } else if (!AppJvmOptionsTreeItem.JVM_OPTION_PATTERN.test(v)) {
            return `Invalid JVM option.`;
        } else if ((await this.options).includes(v)) {
            return `${v} is already set`;
        }
        return undefined;
    }
}
