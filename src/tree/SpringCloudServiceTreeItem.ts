/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppPlatformManagementClient } from '@azure/arm-appplatform';
import { ServiceResource } from '@azure/arm-appplatform/esm/models';
import * as Models from '@azure/arm-appplatform/src/models/index';
import { AzExtTreeItem, AzureParentTreeItem, createAzureClient, TreeItemIconPath } from "vscode-azureextensionui";
import { ext } from "../extensionVariables";
import { localize } from "../utils/localize";
import { nonNullProp } from "../utils/nonNull";
import { treeUtils } from "../utils/treeUtils";
import { SpringCloudAppTreeItem } from './SpringCloudAppTreeItem';
import SpringCloudResourceId from "../model/SpringCloudResourceId";

export class SpringCloudServiceTreeItem extends AzureParentTreeItem {
  public static contextValue: string = 'azureSpringCloud.service';
  public readonly contextValue: string = SpringCloudServiceTreeItem.contextValue;
  public readonly childTypeLabel: string = localize('app', 'App');
  public data: ServiceResource;

  private _nextLink: string | undefined;
  private resourceId: SpringCloudResourceId;

  constructor(parent: AzureParentTreeItem, service: ServiceResource) {
    super(parent);
    this.data = service;
    this.resourceId = new SpringCloudResourceId(nonNullProp(this.data, 'id'))
  }

  public get client(): AppPlatformManagementClient {
    return createAzureClient(this.root, AppPlatformManagementClient)
  }

  public get name(): string {
    return nonNullProp(this.data, 'name');
  }

  public get serviceName(): string {
    return this.name;
  }

  public get resourceGroup(): string {
    return this.resourceId.getResourceGroup();
  }

  public get id(): string {
    return nonNullProp(this.data, 'id');
  }

  public get label(): string {
    return this.name;
  }

  public get description(): string | undefined {
    const state: string | undefined = this.data.properties?.provisioningState;
    return state?.toLowerCase() === 'succeeded' ? undefined : state;
  }

  public get iconPath(): TreeItemIconPath {
    return treeUtils.getPngIconPath('azure-springcloud-small');
  }

  public hasMoreChildrenImpl(): boolean {
    return !!this._nextLink;
  }

  public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzExtTreeItem[]> {
    if (clearCache) {
      this._nextLink = undefined;
    }
    const client: AppPlatformManagementClient = createAzureClient(this.root, AppPlatformManagementClient);
    const apps: Models.AppsListNextResponse = this._nextLink ? await client.apps.listNext(this._nextLink) : await client.apps.list(this.resourceGroup, this.name);
    this._nextLink = apps.nextLink;
    return await this.createTreeItemsWithErrorHandling(
      apps,
      'invalidSpringCloudApp',
      app => new SpringCloudAppTreeItem(this, app),
      app => app.name
    );
  }

  public async refreshImpl(): Promise<void> {
    this.data = await this.client.services.get(this.resourceGroup, this.name);
  }

  public async deleteTreeItemImpl(): Promise<void> {
    await this.client.services.deleteMethod(this.resourceGroup, this.name);
    ext.outputChannel.appendLog(localize('deletedService', 'Successfully deleted Spring Cloud Service "{0}".', this.name));
  }
}
