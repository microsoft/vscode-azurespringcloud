/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DeploymentInstance } from "@azure/arm-appplatform";
import { AzExtParentTreeItem, AzExtTreeItem, IActionContext, TreeItemIconPath } from "@microsoft/vscode-azext-utils";
import { IDeployment } from "../model";
import { getThemedIconPath, localize } from "../utils";
import { AppInstanceTreeItem } from "./AppInstanceTreeItem";
import { AppTreeItem } from './AppTreeItem';

export class AppInstancesTreeItem extends AzExtParentTreeItem {
    public static contextValue: string = 'azureSpringApps.app.instances';
    public readonly contextValue: string = AppInstancesTreeItem.contextValue;
    public readonly childTypeLabel: string = localize('appInstance', 'Spring App Instance');
    public readonly label: string = 'App Instances';
    public readonly parent: AppTreeItem;
    private data: IDeployment;

    public constructor(parent: AppTreeItem, deployment: IDeployment) {
        super(parent);
        this.data = deployment;
    }

    public get id(): string { return AppInstancesTreeItem.contextValue; }
    public get iconPath(): TreeItemIconPath { return getThemedIconPath('app-instances'); }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        return await this.createTreeItemsWithErrorHandling(
            this.data.properties!.instances,
            'invalidSpringCloudAppInstance',
            (instance: DeploymentInstance) => new AppInstanceTreeItem(this, instance),
            (instance: DeploymentInstance) => instance.name
        );
    }

    public async refreshImpl(context: IActionContext): Promise<void> {
        this.data = (await this.parent.getActiveDeployment(context, true))!;
    }
}
