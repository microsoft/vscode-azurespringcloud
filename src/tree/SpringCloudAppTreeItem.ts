/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppPlatformManagementClient } from "@azure/arm-appplatform";
import { AppResource } from '@azure/arm-appplatform/esm/models';
import { AzureParentTreeItem, createAzureClient, IActionContext } from "vscode-azureextensionui";
import { getResourceGroupFromId, getServiceNameFromId } from "../utils/ResourceUtils";
import { nonNullProp } from "../utils/nonNull";

export class SpringCloudAppTreeItem extends AzureParentTreeItem {
  public static contextValue: string = 'azureSpringCloud.app';
  public readonly contextValue: string = SpringCloudAppTreeItem.contextValue;
  public data: AppResource;
  public readonly cTime: number = Date.now();
  public mTime: number = Date.now();

  constructor(parent: AzureParentTreeItem, resource: AppResource) {
    super(parent);
    this.data = resource;
  }

  public get client(): AppPlatformManagementClient {
    return createAzureClient(this.root, AppPlatformManagementClient);
  }

  public get name(): string {
    return nonNullProp(this.data, 'name');
  }

  public get serviceName(): string {
    return getServiceNameFromId(nonNullProp(this.data, 'id'));
  }

  public get resourceGroup(): string {
    return getResourceGroupFromId(nonNullProp(this.data, 'id'));
  }

  public get id(): string {
    return nonNullProp(this.data, 'id');
  }

  public get label(): string {
    return this.name;
  }

  public async deleteTreeItemImpl(_context: IActionContext): Promise<void> {
    await this.client.apps.deleteMethod(this.resourceGroup, this.serviceName, this.name);
  }

  public async start(): Promise<void> {
    await this.client.deployments.start(this.resourceGroup, this.serviceName, this.name, this.data.properties?.activeDeploymentName!);
  }

  public async stop(): Promise<void> {
    await this.client.deployments.stop(this.resourceGroup, this.serviceName, this.name, this.data.properties?.activeDeploymentName!);
  }

  public async restart(): Promise<void> {
    await this.client.deployments.restart(this.resourceGroup, this.serviceName, this.name, this.data.properties?.activeDeploymentName!);
  }

  public async getPublicEndpoint(): Promise<string | undefined> {
    return this.data.properties?.url;
  }

  public async getTestEndpoint(): Promise<string | undefined> {
    const testKeys = await this.client.services.listTestKeys(this.resourceGroup, this.serviceName);
    //TODO: null check
    return `${testKeys.primaryTestEndpoint}/${this.name}/default`;
  }

  public async refreshImpl(): Promise<void> {
    this.mTime = Date.now();
  }

}
