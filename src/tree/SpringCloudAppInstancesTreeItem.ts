/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppPlatformManagementClient } from '@azure/arm-appplatform';
import { AzExtTreeItem, AzureParentTreeItem, createAzureClient, TreeItemIconPath } from "vscode-azureextensionui";
import { localize } from "../utils";
import { TreeUtils } from "../utils/treeUtils";
import { SpringCloudAppTreeItem } from './SpringCloudAppTreeItem';
import { SpringCloudAppInstanceTreeItem } from "./SpringCloudAppInstanceTreeItem";
import { DeploymentResource } from "@azure/arm-appplatform/esm/models";

export class SpringCloudAppInstancesTreeItem extends AzureParentTreeItem {
  public static contextValue: string = 'azureSpringCloud.app.instances';
  public readonly contextValue: string = SpringCloudAppInstancesTreeItem.contextValue;
  public readonly childTypeLabel: string = localize('appInstance', 'AppInstance');
  public readonly id: string = SpringCloudAppInstancesTreeItem.contextValue;
  public readonly label: string = 'App Instances';
  public readonly parent: SpringCloudAppTreeItem;
  private deployment: DeploymentResource;

  public constructor(parent: SpringCloudAppTreeItem, deployment: DeploymentResource) {
    super(parent);
    this.deployment = deployment;
  }

  public get client(): AppPlatformManagementClient {
    return createAzureClient(this.root, AppPlatformManagementClient)
  }

  public get iconPath(): TreeItemIconPath {
    return TreeUtils.getIconPath('azure-springcloud-app-instances');
  }

  public hasMoreChildrenImpl(): boolean {
    return false;
  }

  public async loadMoreChildrenImpl(_clearCache: boolean): Promise<AzExtTreeItem[]> {
    return await this.createTreeItemsWithErrorHandling(
      this.deployment.properties?.instances,
      'invalidSpringCloudAppInstance',
      instance => new SpringCloudAppInstanceTreeItem(this, instance),
      instance => instance.name
    );
  }

  public async refreshImpl(): Promise<void> {
    this.deployment = await this.parent.getActiveDeployment(true);
  }
}
