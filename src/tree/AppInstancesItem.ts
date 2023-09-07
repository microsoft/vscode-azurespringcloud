// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { TreeItem, TreeItemCollapsibleState } from "vscode";
import { EnhancedDeployment } from "../model/EnhancedDeployment";
import { EnhancedInstance } from "../model/EnhancedInstance";
import { getThemedIconPath, localize } from "../utils";
import { AppInstanceItem } from "./AppInstanceItem";
import { AppItem } from './AppItem';
import { ResourceItemBase } from "./SpringAppsBranchDataProvider";

export class AppInstancesItem implements ResourceItemBase {
    public static contextValue: string = 'azureSpringApps.app.instances';
    public readonly contextValue: string = AppInstancesItem.contextValue;
    public readonly childTypeLabel: string = localize('appInstance', 'Spring App Instance');
    public readonly label: string = 'App Instances';

    public constructor(public readonly parent: AppItem) {
    }

    async getChildren(): Promise<AppInstanceItem[]> {
        const deployment: EnhancedDeployment | undefined = await this.parent.app.activeDeployment;
        if (deployment) {
            return deployment.instances?.then(instances => instances?.map(instance => new AppInstanceItem(this, new EnhancedInstance(deployment, instance))) ?? []);
        }
        return [];
    }

    getTreeItem(): TreeItem | Thenable<TreeItem> {
        return {
            id: this.id,
            label: this.label,
            iconPath: getThemedIconPath('app-instances'),
            contextValue: this.contextValue,
            collapsibleState: TreeItemCollapsibleState.Collapsed
        };
    }

    public get id(): string {
        return `${this.parent.id}/instances`;
    }

    public async refresh(): Promise<void> {
        await this.parent.refresh();
    }
}
