/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, IActionContext, ICreateChildImplContext, TreeItemIconPath } from "@microsoft/vscode-azext-utils";
import { EnhancedDeployment, IDeployment } from "../model";
import { DeploymentService } from "../service/DeploymentService";
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

    public constructor(parent: AppTreeItem, deployment: IDeployment) {
        super(parent, deployment);
    }

    public get id(): string { return AppEnvVariablesTreeItem.contextValue; }
    public get iconPath(): TreeItemIconPath { return utils.getThemedIconPath('app-envvars'); }

    public get variables(): { [p: string]: string } {
        const rawEnvVars: { [p: string]: string } = this.data.properties?.deploymentSettings?.environmentVariables ?? {};
        if (!rawEnvVars.JAVA_OPTS) {
            delete rawEnvVars.JAVA_OPTS;
        }
        return rawEnvVars;
    }

    public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        return Object.entries(this.variables).map(e => this.toAppSettingItem(e[0], e[1] + '', Object.assign({}, AppEnvVariablesTreeItem._options)));
    }

    public async createChildImpl(context: ICreateChildImplContext): Promise<AzExtTreeItem> {
        const newKey: string = await context.ui.showInputBox({
            prompt: 'Enter new environment variable key',
            validateInput: DeploymentService.validateKey
        });
        const newVal: string = await context.ui.showInputBox({
            prompt: `Enter value for "${newKey}"`,
            validateInput: DeploymentService.validateVal
        });
        context.showCreatingTreeItem(newKey);
        await this.updateSettingsValue(context, { ...this.variables, [newKey]: newVal.trim() });
        return this.toAppSettingItem(newKey, newVal, Object.assign({}, AppEnvVariablesTreeItem._options));
    }

    public async updateSettingValue(node: AppSettingTreeItem, context: IActionContext): Promise<string> {
        const newVal: string = await context.ui.showInputBox({
            prompt: `Enter value for "${node.key}"`,
            value: node.value,
            validateInput: DeploymentService.validateVal
        });
        await this.updateSettingsValue(context, { ...this.variables, [node.key.trim()]: newVal.trim() });
        return newVal;
    }

    public async deleteSettingItem(node: AppSettingTreeItem, context: IActionContext): Promise<void> {
        const tempVars: { [p: string]: string } = { ...this.variables };
        delete tempVars[node.key.trim()];
        await this.updateSettingsValue(context, tempVars);
    }

    public async updateSettingsValue(context: IActionContext, newVars?: { [p: string]: string }): Promise<void> {
        const deployment: EnhancedDeployment = this.getDeployment(context);
        const updating: string = utils.localize('updatingEnvVar', 'Updating environment variables of "{0}"...', deployment.app.name);
        const updated: string = utils.localize('updatedEnvVar', 'Successfully updated environment variables of {0}.', deployment.app.name);
        await utils.runInBackground(updating, updated, () => deployment.updateEnvironmentVariables(newVars ?? {}));
        this.parent.refresh(context);
    }
}
