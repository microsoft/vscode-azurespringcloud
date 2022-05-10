/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppPlatformManagementClient } from "@azure/arm-appplatform";
import { createAzureClient } from "@microsoft/vscode-azext-azureutils";
import { AzExtParentTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';
import { ext } from "../extensionVariables";
import { EnhancedDeployment, IDeployment } from "../model";
import { DeploymentService } from "../service/DeploymentService";
import { AppSettingTreeItem, IOptions } from "./AppSettingTreeItem";
import { AppTreeItem } from "./AppTreeItem";

export abstract class AppSettingsTreeItem extends AzExtParentTreeItem {
    public readonly childTypeLabel: string = 'App Setting';
    public parent: AppTreeItem;
    protected data: IDeployment;

    protected constructor(parent: AppTreeItem, deployment: IDeployment) {
        super(parent);
        this.data = deployment;
    }

    public getDeployment(context: IActionContext): EnhancedDeployment {
        const client: AppPlatformManagementClient = createAzureClient([context, this], AppPlatformManagementClient);
        const deploymentService: DeploymentService = new DeploymentService(client, this.data);
        return Object.assign(deploymentService, this.data);
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public toAppSettingItem(key: string, value: string, options?: IOptions): AppSettingTreeItem {
        return new AppSettingTreeItem(this, key.trim(), value.trim(), options);
    }

    public async toggleVisibility(context: IActionContext): Promise<void> {
        const settings: AppSettingTreeItem[] = <AppSettingTreeItem[]>await ext.tree.getChildren(this);
        const hidden: boolean = settings.every(s => s.hidden);
        for (const s of settings) {
            if (s.toggleVisibility !== undefined) {
                await s.toggleVisibility(context, !hidden);
            }
        }
    }

    public async refreshImpl(context: IActionContext): Promise<void> {
        this.data = await this.getDeployment(context).reload();
    }

    public abstract updateSettingValue(node: AppSettingTreeItem, context: IActionContext): Promise<string>;

    // tslint:disable-next-line:no-any
    public abstract updateSettingsValue(context: IActionContext): Promise<any>;

    public abstract deleteSettingItem(node: AppSettingTreeItem, context: IActionContext): Promise<void>;
}
