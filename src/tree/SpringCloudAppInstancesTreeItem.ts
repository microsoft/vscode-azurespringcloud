/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppPlatformManagementClient } from '@azure/arm-appplatform';
import { AzExtTreeItem, AzureParentTreeItem, createAzureClient, TreeItemIconPath } from "vscode-azureextensionui";
import { localize } from "../utils/localize";
import { treeUtils } from "../utils/treeUtils";
import { SpringCloudAppTreeItem } from './SpringCloudAppTreeItem';
import { SpringCloudAppInstanceTreeItem } from "./SpringCloudAppInstanceTreeItem";

export class SpringCloudAppInstancesTreeItem extends AzureParentTreeItem {
  public static contextValue: string = 'azureSpringCloud.app.instances';
  public readonly contextValue: string = SpringCloudAppInstancesTreeItem.contextValue;
  public readonly childTypeLabel: string = localize('appInstance', 'AppInstance');
  public readonly id: string = SpringCloudAppInstancesTreeItem.contextValue;
  public readonly label: string = 'App Instances';

  public constructor(parent: SpringCloudAppTreeItem) {
    super(parent);
  }

  public get app(): SpringCloudAppTreeItem {
    return <SpringCloudAppTreeItem>this.parent;
  }

  public get client(): AppPlatformManagementClient {
    return createAzureClient(this.root, AppPlatformManagementClient)
  }

  public get iconPath(): TreeItemIconPath {
    return treeUtils.getIconPath('azure-springcloud-app-instances');
  }

  public hasMoreChildrenImpl(): boolean {
    return false;
  }

  public async loadMoreChildrenImpl(_clearCache: boolean): Promise<AzExtTreeItem[]> {
    const deployment = await this.app.getActiveDeployment(true) || [];
    return await this.createTreeItemsWithErrorHandling(
      deployment.properties?.instances,
      'invalidSpringCloudAppInstance',
      instance => new SpringCloudAppInstanceTreeItem(this, instance),
      instance => instance.name
    );
  }
}
