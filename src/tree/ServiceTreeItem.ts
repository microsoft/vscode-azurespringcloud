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
import { AppTreeItem } from './AppTreeItem';
import SpringCloudResourceId from "../model/SpringCloudResourceId";
import IAppCreationWizardContext from "../model/IAppCreationWizardContext";
import { InputAppNameStep } from "../commands/steps/creation/InputAppNameStep";
import { SelectAppStackStep } from "../commands/steps/creation/SelectAppStackStep";
import { CreateAppStep } from "../commands/steps/creation/CreateAppStep";
import { CreateAppDeploymentStep } from "../commands/steps/creation/CreateAppDeploymentStep";
import { UpdateAppStep } from "../commands/steps/creation/UpdateAppStep";
import { ProgressLocation, window } from "vscode";

export class ServiceTreeItem extends AzureParentTreeItem {
  public static contextValue: string = 'azureSpringCloud.service';
  public readonly contextValue: string = ServiceTreeItem.contextValue;
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
      app => new AppTreeItem(this, app),
      app => app.name
    );
  }

  public async refreshImpl(): Promise<void> {
    this.service = await this.client.services.get(this.resourceGroup, this.name);
  }

  public async deleteTreeItemImpl(): Promise<void> {
    const deleting: string = localize('deletingSpringCLoudService', 'Deleting Spring Cloud service "{0}"...', this.name);
    const deleted: string = localize('deletedSpringCloudService', 'Successfully deleted Spring Cloud service "{0}".', this.name);

    await window.withProgress({location: ProgressLocation.Notification, title: deleting}, async (): Promise<void> => {
      ext.outputChannel.appendLog(deleting);
      await this.client.services.deleteMethod(this.resourceGroup, this.name);
      window.showInformationMessage(deleted);
      ext.outputChannel.appendLog(deleted);
    });
  }

  public async createChildImpl(context: ICreateChildImplContext): Promise<AzExtTreeItem> {
    const wizardContext: IAppCreationWizardContext = Object.assign(context, this.root, {
      service: this.service
    });

    const promptSteps: AzureWizardPromptStep<IAppCreationWizardContext>[] = [];
    const executeSteps: AzureWizardExecuteStep<IAppCreationWizardContext>[] = [];
    promptSteps.push(new InputAppNameStep());
    promptSteps.push(new SelectAppStackStep());
    executeSteps.push(new VerifyProvidersStep(['Microsoft.AppPlatform']));
    executeSteps.push(new CreateAppStep());
    executeSteps.push(new CreateAppDeploymentStep());
    executeSteps.push(new UpdateAppStep());
    const title: string = localize('creatingSpringCouldApp', 'Creating new Spring Cloud App in Azure');
    const wizard: AzureWizard<IAppCreationWizardContext> = new AzureWizard(wizardContext, {promptSteps, executeSteps, title});

    await wizard.prompt();
    const appName = nonNullProp(wizardContext, 'newAppName');
    context.showCreatingTreeItem(appName);
    await wizard.execute();
    const createSucceeded: string = localize('createdSpringCouldApp', 'Successfully created Spring Cloud app "{0}".', appName);
    window.showInformationMessage(createSucceeded);

    return new AppTreeItem(this, nonNullProp(wizardContext, 'newApp'));
  }
}
