/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppPlatformManagementClient } from "@azure/arm-appplatform";
import { AppResource, DeploymentResource, DeploymentResourceStatus } from '@azure/arm-appplatform/esm/models';
import { AzExtTreeItem, AzureParentTreeItem, createAzureClient, IActionContext, TreeItemIconPath } from "vscode-azureextensionui";
import { nonNullProp } from "../utils";
import { AppEnvVariablesTreeItem } from "./AppEnvVariablesTreeItem";
import { AppScaleSettingsTreeItem } from "./AppScaleSettingsTreeItem";
import { SpringCloudServiceTreeItem } from "./SpringCloudServiceTreeItem";
import { TreeUtils } from "../utils/treeUtils";
import { AppJvmOptionsTreeItem } from "./AppJvmOptionsTreeItem";
import { SpringCloudAppInstancesTreeItem } from "./SpringCloudAppInstancesTreeItem";

export class SpringCloudAppTreeItem extends AzureParentTreeItem {
  public static contextValue: string = 'azureSpringCloud.app';
  public readonly contextValue: string = SpringCloudAppTreeItem.contextValue;
  public data: AppResource;
  private readonly scaleSettingsTreeItem: AppScaleSettingsTreeItem;
  private readonly envPropertiesTreeItem: AppEnvVariablesTreeItem;
  private readonly jvmOptionsTreeItem: AppJvmOptionsTreeItem;
  private readonly appInstancesTreeItem: SpringCloudAppInstancesTreeItem;
  private _status: DeploymentResourceStatus | undefined;
  private activeDeployment: DeploymentResource;

  constructor(parent: SpringCloudServiceTreeItem, resource: AppResource) {
    super(parent);
    this.data = resource;
    this.scaleSettingsTreeItem = new AppScaleSettingsTreeItem(this);
    this.envPropertiesTreeItem = new AppEnvVariablesTreeItem(this);
    this.jvmOptionsTreeItem = new AppJvmOptionsTreeItem(this);
    this.appInstancesTreeItem = new SpringCloudAppInstancesTreeItem(this);
    this.refresh();
  }

  public get client(): AppPlatformManagementClient {
    return createAzureClient(this.root, AppPlatformManagementClient);
  }

  public get name(): string {
    return nonNullProp(this.data, 'name');
  }

  public get serviceName(): string {
    return (<SpringCloudServiceTreeItem>this.parent).serviceName;
  }

  public get resourceGroup(): string {
    return (<SpringCloudServiceTreeItem>this.parent).resourceGroup;
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
    switch (this._status) {
      case "Stopped":
        return TreeUtils.getPngIconPath('azure-springcloud-app-stopped');
      case "Failed":
        return TreeUtils.getPngIconPath('azure-springcloud-app-failed');
      case "Allocating":
      case "Upgrading":
      case "Compiling":
        return TreeUtils.getPngIconPath('azure-springcloud-app-pending');
      case "Unknown":
        return TreeUtils.getPngIconPath('azure-springcloud-app-unknown');
      case "Running":
      default:
        return TreeUtils.getPngIconPath('azure-springcloud-app-running');
    }
  }

  public hasMoreChildrenImpl(): boolean {
    return false;
  }

  public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
    return [this.appInstancesTreeItem, this.envPropertiesTreeItem, this.scaleSettingsTreeItem, this.jvmOptionsTreeItem];
  }

  public async deleteTreeItemImpl(_context: IActionContext): Promise<void> {
    await this.client.apps.deleteMethod(this.resourceGroup, this.serviceName, this.name);
  }

  public async start(): Promise<void> {
    await this.client.deployments.start(this.resourceGroup, this.serviceName, this.name, this.data.properties?.activeDeploymentName!);
    await this.refresh()
  }

  public async stop(): Promise<void> {
    await this.client.deployments.stop(this.resourceGroup, this.serviceName, this.name, this.data.properties?.activeDeploymentName!);
    await this.refresh()
  }

  public async restart(): Promise<void> {
    await this.client.deployments.restart(this.resourceGroup, this.serviceName, this.name, this.data.properties?.activeDeploymentName!);
    await this.refresh()
  }

  public async getPublicEndpoint(): Promise<string | undefined> {
    return this.data.properties?.url;
  }

  public async getTestEndpoint(): Promise<string | undefined> {
    const testKeys = await this.client.services.listTestKeys(this.resourceGroup, this.serviceName);
    //TODO: null check
    return `${testKeys.primaryTestEndpoint}/${this.name}/default`;
  }

  public async getActiveDeployment(force: boolean = false): Promise<DeploymentResource> {
    const deploymentName = this.data.properties?.activeDeploymentName!;
    if (force || !this.activeDeployment) {
      this.activeDeployment = await this.client.deployments.get(this.resourceGroup, this.serviceName, this.name, deploymentName!)
    }
    return this.activeDeployment;
  }

  public async refreshImpl(): Promise<void> {
    this.data = await this.client.apps.get(this.resourceGroup, this.serviceName, this.name);
    const deployment = await this.getActiveDeployment();
    this._status = deployment.properties?.status;
  }
}
