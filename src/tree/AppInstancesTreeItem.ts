// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DeploymentInstance } from "@azure/arm-appplatform";
import { AzExtParentTreeItem, AzExtTreeItem, IActionContext, TreeItemIconPath } from "@microsoft/vscode-azext-utils";
import { EnhancedDeployment } from "../service/EnhancedDeployment";
import { getThemedIconPath, localize } from "../utils";
import { AppInstanceTreeItem } from "./AppInstanceTreeItem";
import { AppTreeItem } from './AppTreeItem';

export class AppInstancesTreeItem extends AzExtParentTreeItem {
    public static contextValue: string = 'azureSpringApps.app.instances';
    public readonly contextValue: string = AppInstancesTreeItem.contextValue;
    public readonly childTypeLabel: string = localize('appInstance', 'Spring App Instance');
    public readonly label: string = 'App Instances';
    public readonly parent: AppTreeItem;

    public constructor(parent: AppTreeItem) {
        super(parent);
    }

    public get id(): string { return AppInstancesTreeItem.contextValue; }
    public get iconPath(): TreeItemIconPath { return getThemedIconPath('app-instances'); }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        const deployment: EnhancedDeployment | undefined = await this.parent.app.getActiveDeployment();
        if (deployment) {
            return await this.createTreeItemsWithErrorHandling(
                deployment.properties!.instances,
                'invalidSpringCloudAppInstance',
                (instance: DeploymentInstance) => new AppInstanceTreeItem(this, instance),
                (instance: DeploymentInstance) => instance.name
            );
        }
        return [];
    }

    public async refreshImpl(_context: IActionContext): Promise<void> {
        await this.parent.app.refresh();
    }
}
