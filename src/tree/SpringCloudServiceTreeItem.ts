/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppPlatformManagementClient } from '@azure/arm-appplatform';
import { ServiceResource } from '@azure/arm-appplatform/esm/models';
import * as Models from '@azure/arm-appplatform/src/models/index';
import {
  AzExtTreeItem,
  AzureParentTreeItem,
  AzureWizard,
  AzureWizardExecuteStep,
  AzureWizardPromptStep,
  createAzureClient,
  ICreateChildImplContext,
  TreeItemIconPath,
  VerifyProvidersStep
} from "vscode-azureextensionui";
import { ext } from "../extensionVariables";
import { localize, nonNullProp } from "../utils";
import { TreeUtils } from "../utils/treeUtils";
import { SpringCloudAppTreeItem } from './SpringCloudAppTreeItem';
import SpringCloudResourceId from "../model/SpringCloudResourceId";
import ISpringCloudAppWizardContext from "../model/ISpringCloudAppWizardContext";
import { AppNameStep } from "../commands/steps/AppNameStep";
import { AppStackStep } from "../commands/steps/AppStackStep";
import { SpringCloudAppCreateStep } from "../commands/steps/SpringCloudAppCreateStep";
import { SpringCloudAppDeploymentCreateStep } from "../commands/steps/SpringCloudAppDeploymentCreateStep";
import { SpringCloudAppUpdateStep } from "../commands/steps/SpringCloudAppUpdateStep";

export class SpringCloudServiceTreeItem extends AzureParentTreeItem {
  public static contextValue: string = 'azureSpringCloud.service';
  public readonly contextValue: string = SpringCloudServiceTreeItem.contextValue;
  public readonly childTypeLabel: string = localize('app', 'App');
  public service: ServiceResource;

  private _nextLink: string | undefined;
  private resourceId: SpringCloudResourceId;

  constructor(parent: AzureParentTreeItem, service: ServiceResource) {
    super(parent);
    this.service = service;
    this.resourceId = new SpringCloudResourceId(nonNullProp(this.service, 'id'))
  }

  public get client(): AppPlatformManagementClient {
    return createAzureClient(this.root, AppPlatformManagementClient)
  }

  public get name(): string {
    return nonNullProp(this.service, 'name');
  }

  public get serviceName(): string {
    return this.name;
  }

  public get resourceGroup(): string {
    return this.resourceId.getResourceGroup();
  }

  public get data(): ServiceResource {
    return this.service;
  }

  public get id(): string {
    return nonNullProp(this.service, 'id');
  }

  public get label(): string {
    return this.name;
  }

  public get description(): string | undefined {
    const state: string | undefined = this.service.properties?.provisioningState;
    return state?.toLowerCase() === 'succeeded' ? undefined : state;
  }

  public get iconPath(): TreeItemIconPath {
    return TreeUtils.getPngIconPath('azure-springcloud-small');
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
    this.service = await this.client.services.get(this.resourceGroup, this.name);
  }

  public async deleteTreeItemImpl(): Promise<void> {
    await this.client.services.deleteMethod(this.resourceGroup, this.name);
    ext.outputChannel.appendLog(localize('deletedService', 'Successfully deleted Spring Cloud Service "{0}".', this.name));
  }

  public async createChildImpl(context: ICreateChildImplContext): Promise<AzExtTreeItem> {
    const wizardContext: ISpringCloudAppWizardContext = Object.assign(context, this.root, {
      service: this.service
    });

    const promptSteps: AzureWizardPromptStep<ISpringCloudAppWizardContext>[] = [];
    const executeSteps: AzureWizardExecuteStep<ISpringCloudAppWizardContext>[] = [];
    promptSteps.push(new AppNameStep());
    promptSteps.push(new AppStackStep());
    executeSteps.push(new VerifyProvidersStep(['Microsoft.AppPlatform']));
    executeSteps.push(new SpringCloudAppCreateStep());
    executeSteps.push(new SpringCloudAppDeploymentCreateStep());
    executeSteps.push(new SpringCloudAppUpdateStep());
    const title: string = localize('appCreatingTitle', 'Create new Spring Cloud App in Azure');
    const wizard: AzureWizard<ISpringCloudAppWizardContext> = new AzureWizard(wizardContext, {promptSteps, executeSteps, title});

    await wizard.prompt();
    context.showCreatingTreeItem(nonNullProp(wizardContext, 'newAppName'));

    await wizard.execute();

    return new SpringCloudAppTreeItem(this, nonNullProp(wizardContext, 'newApp'));
  }
}
