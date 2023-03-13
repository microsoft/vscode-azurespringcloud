// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { callWithTelemetryAndErrorHandling, IActionContext } from "@microsoft/vscode-azext-utils";
import { EnhancedDeployment } from "../service/EnhancedDeployment";
import * as utils from "../utils";
import { getThemedIconPath } from "../utils";
import { AppItem } from "./AppItem";
import { AppSettingsItem } from "./AppSettingsItem";
import { AppSettingItem, IOptions } from "./AppSettingItem";
import { ext } from "../extensionVariables";
import * as vscode from "vscode";

export class AppEnvVariablesItem extends AppSettingsItem {
    public static contextValue: string = 'azureSpringApps.app.envVariables';
    //refer: https://dev.azure.com/msazure/AzureDMSS/_git/AzureDMSS-PortalExtension?path=%2Fsrc%2FSpringCloudPortalExt%2FClient%2FApplicationConfiguration%2FApplicationConfigurationBlade.ts&version=GBdev&line=304&lineEnd=304&lineStartColumn=61&lineEndColumn=80&lineStyle=plain&_a=contents
    private static readonly _options: IOptions = {
        hidden: true,
        contextValue: 'azureSpringApps.app.envVariable',
    };
    public readonly contextValue: string = AppEnvVariablesItem.contextValue;
    public readonly label: string = 'Environment Variables';

    public constructor(public readonly parent: AppItem) {
        super(parent);
    }

    async getChildren(): Promise<AppSettingItem[]> {
        const result = await callWithTelemetryAndErrorHandling('getChildren', async (_context) => {
            return Object.entries(await this.variables).map(e => this.toAppSettingItem(e[0], e[1] + '', Object.assign({}, AppEnvVariablesItem._options)));
        });

        return result ?? [];
    }

    getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return {
            id: this.id,
            label: this.label,
            iconPath: getThemedIconPath('app-envvars'),
            contextValue: this.contextValue,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        };
    }

    public get id(): string {
        return `${this.parent.id}/envVariables`;
    }

    public get variables(): Promise<{ [p: string]: string }> {
        return (async () => {
            const deployment: EnhancedDeployment | undefined = await this.parent.app.getActiveDeployment();
            const rawEnvVars: { [p: string]: string } = deployment?.properties?.deploymentSettings?.environmentVariables ?? {};
            if (!rawEnvVars.JAVA_OPTS) {
                delete rawEnvVars.JAVA_OPTS;
            }
            return rawEnvVars;
        })();
    }

    public async createChild(context: IActionContext): Promise<AppSettingItem> {
        const newKey: string = await context.ui.showInputBox({
            prompt: 'Enter new environment variable key',
            validateInput: EnhancedDeployment.validateKey
        });
        const newVal: string = await context.ui.showInputBox({
            prompt: `Enter value for "${newKey}"`,
            validateInput: EnhancedDeployment.validateVal
        });
        await ext.state.showCreatingChild(
            this.id,
            utils.localize('addSettingItem', 'Add Item "{0}"...', newKey),
            async () => {
                try {
                    await this.updateSettingsValue(context, { ...await this.variables, [newKey]: newVal.trim() });
                } finally {
                    // refresh this node even if create fails because container app provision failure throws an error, but still creates a container app
                    ext.state.notifyChildrenChanged(this.id);
                }
            });
        return this.toAppSettingItem(newKey, newVal, Object.assign({}, AppEnvVariablesItem._options));
    }

    public async updateSettingValue(node: AppSettingItem, context: IActionContext): Promise<string> {
        const newVal: string = await context.ui.showInputBox({
            prompt: `Enter value for "${node.key}"`,
            value: node.value,
            validateInput: EnhancedDeployment.validateVal
        });
        await this.updateSettingsValue(context, { ...await this.variables, [node.key.trim()]: newVal.trim() });
        return newVal;
    }

    public async deleteSettingItem(node: AppSettingItem, context: IActionContext): Promise<void> {
        const tempVars: { [p: string]: string } = { ...await this.variables };
        delete tempVars[node.key.trim()];
        await this.updateSettingsValue(context, tempVars);
    }

    public async updateSettingsValue(_context: IActionContext, newVars?: { [p: string]: string }): Promise<void> {
        const deployment: EnhancedDeployment | undefined = await this.parent.app.getActiveDeployment();
        if (deployment) {
            const updating: string = utils.localize('updatingEnvVar', 'Updating environment variables of "{0}"...', deployment.app.name);
            const updated: string = utils.localize('updatedEnvVar', 'Successfully updated environment variables of {0}.', deployment.app.name);
            await utils.runInBackground(updating, updated, () => deployment.updateEnvironmentVariables(newVars ?? {}));
            ext.state.notifyChildrenChanged(this.id);
        }
    }
}
