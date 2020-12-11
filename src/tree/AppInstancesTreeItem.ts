/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppPlatformManagementClient } from '@azure/arm-appplatform';
import { DeploymentInstance } from "@azure/arm-appplatform/esm/models";
import { AzExtTreeItem, AzureParentTreeItem, createAzureClient, TreeItemIconPath } from "vscode-azureextensionui";
import { IDeployment } from "../model";
import { localize } from "../utils";
import { TreeUtils } from "../utils/TreeUtils";
import { AppInstanceTreeItem } from "./AppInstanceTreeItem";
import { AppTreeItem } from './AppTreeItem';

export class AppInstancesTreeItem extends AzureParentTreeItem {
    public static contextValue: string = 'azureSpringCloud.app.instances';
    public readonly contextValue: string = AppInstancesTreeItem.contextValue;
    public readonly childTypeLabel: string = localize('appInstance', 'AppInstance');
    public readonly id: string = AppInstancesTreeItem.contextValue;
    public readonly label: string = 'App Instances';
    public readonly parent: AppTreeItem;
    public readonly iconPath: TreeItemIconPath = TreeUtils.getIconPath('azure-springcloud-app-instances');
    private data: IDeployment;

    public constructor(parent: AppTreeItem, deployment: IDeployment) {
        super(parent);
        this.data = deployment;
    }

    public get client(): AppPlatformManagementClient {
        return createAzureClient(this.root, AppPlatformManagementClient);
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async loadMoreChildrenImpl(_clearCache: boolean): Promise<AzExtTreeItem[]> {
        return await this.createTreeItemsWithErrorHandling(
            this.data.properties!.instances,
            'invalidSpringCloudAppInstance',
            (instance: DeploymentInstance) => new AppInstanceTreeItem(this, instance),
            (instance: DeploymentInstance) => instance.name
        );
    }

    public async refreshImpl(): Promise<void> {
        this.data = await this.parent.getActiveDeployment(true);
    }
}
