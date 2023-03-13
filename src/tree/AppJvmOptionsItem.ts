// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { JarUploadedUserSourceInfo } from "@azure/arm-appplatform";
import {
    AzureWizard,
    AzureWizardExecuteStep,
    AzureWizardPromptStep,
    callWithTelemetryAndErrorHandling,
    createSubscriptionContext,
    IActionContext,
    ICreateChildImplContext
} from "@microsoft/vscode-azext-utils";
import * as vscode from "vscode";
import { window } from "vscode";
import { IJvmOptionsUpdateWizardContext } from "../commands/steps/settings/jvmoptions/IJvmOptionsUpdateWizardContext";
import { InputJvmOptionsStep } from "../commands/steps/settings/jvmoptions/InputJvmOptionsStep";
import { UpdateJvmOptionsStep } from "../commands/steps/settings/jvmoptions/UpdateJvmOptionsStep";
import { EnhancedDeployment } from "../service/EnhancedDeployment";
import * as utils from "../utils";
import { getThemedIconPath, localize } from "../utils";
import { AppSettingsItem } from "./AppSettingsItem";
import { AppSettingItem, IOptions } from "./AppSettingItem";
import { AppItem } from "./AppItem";
import { ext } from "../extensionVariables";

export class AppJvmOptionsItem extends AppSettingsItem {
    public static contextValue: string = 'azureSpringApps.app.jvmOptions';
    private static readonly _options: IOptions = {
        contextValue: 'azureSpringApps.app.jvmOption',
    };
    private static readonly JVM_OPTION_PATTERN: RegExp = /^-[a-zA-Z_]+\S*$/;
    public readonly contextValue: string = AppJvmOptionsItem.contextValue;
    public readonly label: string = 'JVM Options';

    public constructor(public readonly parent: AppItem) {
        super(parent);
    }

    async getChildren(): Promise<AppSettingItem[]> {
        const result = await callWithTelemetryAndErrorHandling('getChildren', async (_context) => {
            return (await this.options).map(option => this.toAppSettingItem('', option.trim(), Object.assign({}, AppJvmOptionsItem._options)));
        });

        return result ?? [];
    }

    getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return {
            id: this.id,
            label: this.label,
            iconPath: getThemedIconPath('app-jvmoptions'),
            contextValue: this.contextValue,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        };
    }

    public get id(): string {
        return `${this.parent.id}/jvmOptions`;
    }

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

    public async createChild(context: IActionContext): Promise<AppSettingItem> {
        const newVal: string = await context.ui.showInputBox({
            prompt: 'Enter new JVM option:',
            placeHolder: 'e.g. -Xmx2048m',
            validateInput: this.validateJvmOption
        });
        await ext.state.showCreatingChild(
            this.id,
            utils.localize('addSettingItem', 'Add Item "{0}"...', newVal),
            async () => {
                try {
                    await this.updateSettingsValue(context, [...await this.options, newVal]);
                } finally {
                    // refresh this node even if create fails because container app provision failure throws an error, but still creates a container app
                    ext.state.notifyChildrenChanged(this.id);
                }
            });
        return this.toAppSettingItem('', newVal, Object.assign({}, AppJvmOptionsItem._options));
    }

    public async updateSettingValue(node: AppSettingItem, context: IActionContext | ICreateChildImplContext): Promise<string> {
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

    public async deleteSettingItem(node: AppSettingItem, context: IActionContext): Promise<void> {
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

            const subContext = createSubscriptionContext(this.parent.app.subscription);
            const wizardContext: IJvmOptionsUpdateWizardContext = Object.assign(context, subContext, {
                newJvmOptions: newJvmOptions?.join(' ')
            });

            const promptSteps: AzureWizardPromptStep<IJvmOptionsUpdateWizardContext>[] = [];
            const executeSteps: AzureWizardExecuteStep<IJvmOptionsUpdateWizardContext>[] = [];
            promptSteps.push(new InputJvmOptionsStep(deployment));
            executeSteps.push(new UpdateJvmOptionsStep(deployment));
            const wizard: AzureWizard<IJvmOptionsUpdateWizardContext> = new AzureWizard(wizardContext, { promptSteps, executeSteps, title: updating });
            await wizard.prompt();
            await wizard.execute();
            void window.showInformationMessage(updated);
            ext.state.notifyChildrenChanged(this.id);
        }
    }

    public async validateJvmOption(v: string): Promise<string | undefined> {
        if (!v.trim()) {
            return `Enter a value.`;
        } else if (!AppJvmOptionsItem.JVM_OPTION_PATTERN.test(v)) {
            return `Invalid JVM option.`;
        } else if ((await this.options).includes(v)) {
            return `${v} is already set`;
        }
        return undefined;
    }
}
