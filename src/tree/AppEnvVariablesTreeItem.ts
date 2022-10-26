// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzExtTreeItem, IActionContext, ICreateChildImplContext, TreeItemIconPath } from "@microsoft/vscode-azext-utils";
import { EnhancedDeployment } from "../service/EnhancedDeployment";
import * as utils from "../utils";
import { AppSettingsTreeItem } from "./AppSettingsTreeItem";
import { AppSettingTreeItem, IOptions } from "./AppSettingTreeItem";
import { AppTreeItem } from "./AppTreeItem";

export class AppEnvVariablesTreeItem extends AppSettingsTreeItem {
    public static contextValue: string = 'azureSpringApps.app.envVariables';
    //refer: https://dev.azure.com/msazure/AzureDMSS/_git/AzureDMSS-PortalExtension?path=%2Fsrc%2FSpringCloudPortalExt%2FClient%2FApplicationConfiguration%2FApplicationConfigurationBlade.ts&version=GBdev&line=304&lineEnd=304&lineStartColumn=61&lineEndColumn=80&lineStyle=plain&_a=contents
    private static readonly _options: IOptions = {
        hidden: true,
        contextValue: 'azureSpringApps.app.envVariable',
    };
    public readonly contextValue: string = AppEnvVariablesTreeItem.contextValue;
    public readonly label: string = 'Environment Variables';

    public constructor(parent: AppTreeItem) {
        super(parent);
    }

    public get id(): string { return AppEnvVariablesTreeItem.contextValue; }
    public get iconPath(): TreeItemIconPath { return utils.getThemedIconPath('app-envvars'); }

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

    public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        return Object.entries(await this.variables).map(e => this.toAppSettingItem(e[0], e[1] + '', Object.assign({}, AppEnvVariablesTreeItem._options)));
    }

    public async createChildImpl(context: ICreateChildImplContext): Promise<AzExtTreeItem> {
        const newKey: string = await context.ui.showInputBox({
            prompt: 'Enter new environment variable key',
            validateInput: EnhancedDeployment.validateKey
        });
        const newVal: string = await context.ui.showInputBox({
            prompt: `Enter value for "${newKey}"`,
            validateInput: EnhancedDeployment.validateVal
        });
        context.showCreatingTreeItem(newKey);
        await this.updateSettingsValue(context, { ...await this.variables, [newKey]: newVal.trim() });
        return this.toAppSettingItem(newKey, newVal, Object.assign({}, AppEnvVariablesTreeItem._options));
    }

    public async updateSettingValue(node: AppSettingTreeItem, context: IActionContext): Promise<string> {
        const newVal: string = await context.ui.showInputBox({
            prompt: `Enter value for "${node.key}"`,
            value: node.value,
            validateInput: EnhancedDeployment.validateVal
        });
        await this.updateSettingsValue(context, { ...await this.variables, [node.key.trim()]: newVal.trim() });
        return newVal;
    }

    public async deleteSettingItem(node: AppSettingTreeItem, context: IActionContext): Promise<void> {
        const tempVars: { [p: string]: string } = { ...await this.variables };
        delete tempVars[node.key.trim()];
        await this.updateSettingsValue(context, tempVars);
    }

    public async updateSettingsValue(context: IActionContext, newVars?: { [p: string]: string }): Promise<void> {
        const deployment: EnhancedDeployment | undefined = await this.parent.app.getActiveDeployment();
        if (deployment) {
            const updating: string = utils.localize('updatingEnvVar', 'Updating environment variables of "{0}"...', deployment.app.name);
            const updated: string = utils.localize('updatedEnvVar', 'Successfully updated environment variables of {0}.', deployment.app.name);
            await utils.runInBackground(updating, updated, () => deployment.updateEnvironmentVariables(newVars ?? {}));
            void this.parent.refresh(context);
        }
    }
}
