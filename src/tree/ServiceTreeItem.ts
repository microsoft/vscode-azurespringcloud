/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppPlatformManagementClient } from '@azure/arm-appplatform';
import { ServiceResource } from '@azure/arm-appplatform/esm/models';
import { createAzureClient, VerifyProvidersStep } from "@microsoft/vscode-azext-azureutils";
import {
    AzExtParentTreeItem,
    AzExtTreeItem,
    AzureWizard,
    AzureWizardExecuteStep,
    AzureWizardPromptStep, IActionContext, ICreateChildImplContext,
    TreeItemIconPath
} from '@microsoft/vscode-azext-utils';
import { window } from "vscode";
import { CreateAppDeploymentStep } from "../commands/steps/creation/CreateAppDeploymentStep";
import { CreateAppStep } from "../commands/steps/creation/CreateAppStep";
import { IAppCreationWizardContext } from "../commands/steps/creation/IAppCreationWizardContext";
import { InputAppNameStep } from "../commands/steps/creation/InputAppNameStep";
import { SelectAppStackStep } from "../commands/steps/creation/SelectAppStackStep";
import { UpdateAppStep } from "../commands/steps/creation/UpdateAppStep";
import { EnhancedService, IApp, IService } from "../model";
import { ServiceService } from "../service/ServiceService";
import * as utils from "../utils";
import { AppTreeItem } from './AppTreeItem';

export class ServiceTreeItem extends AzExtParentTreeItem {
    public static contextValue: string = 'azureSpringApps.apps';
    public readonly contextValue: string = ServiceTreeItem.contextValue;
    public readonly childTypeLabel: string = utils.localize('springCloud.app', 'Spring App');
    public data: IService;

    private _nextLink: string | undefined;
    private deleted: boolean;

    constructor(parent: AzExtParentTreeItem, service: ServiceResource) {
        super(parent);
        this.data = IService.fromResource(service);
    }

    public get id(): string {
        return utils.nonNullProp(this.data, 'id');
    }

    public get label(): string {
        return this.data.name;
    }

    public get description(): string | undefined {
        const state: string | undefined = this.data.properties?.provisioningState;
        return state?.toLowerCase() === 'succeeded' ? undefined : state;
    }

    public get iconPath(): TreeItemIconPath {
        return utils.getThemedIconPath('azure-spring-apps');
    }

    public getService(context: IActionContext): EnhancedService {
        const client: AppPlatformManagementClient = createAzureClient([context, this], AppPlatformManagementClient);
        const serviceService: ServiceService = new ServiceService(client, this.data);
        return Object.assign(serviceService, this.data);
    }

    public hasMoreChildrenImpl(): boolean {
        return !!this._nextLink;
    }

    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }
        const result: { nextLink?: string; apps: IApp[] } = await this.getService(context).getApps(this._nextLink);
        this._nextLink = result.nextLink;
        return await this.createTreeItemsWithErrorHandling(
            result.apps,
            'invalidSpringCloudApp',
            app => {
                const item: AppTreeItem = new AppTreeItem(this, app);
                item.refresh(context);
                return item;
            },
            app => app.name
        );
    }

    public async deleteTreeItemImpl(context: IActionContext): Promise<void> {
        const service: EnhancedService = this.getService(context);
        const deleting: string = utils.localize('deletingSpringCLoudService', 'Deleting Azure Spring Apps "{0}"...', this.data.name);
        const deleted: string = utils.localize('deletedSpringCloudService', 'Successfully deleted Azure Spring Apps "{0}".', this.data.name);
        await utils.runInBackground(deleting, deleted, () => service.remove());
        this.deleted = true;
    }

    public async createChildImpl(context: ICreateChildImplContext): Promise<AzExtTreeItem> {
        const service: EnhancedService = this.getService(context);
        const wizardContext: IAppCreationWizardContext = Object.assign(context, this.subscription, {
            service: this.data
        });

        const promptSteps: AzureWizardPromptStep<IAppCreationWizardContext>[] = [];
        const executeSteps: AzureWizardExecuteStep<IAppCreationWizardContext>[] = [];
        promptSteps.push(new InputAppNameStep(service));
        promptSteps.push(new SelectAppStackStep());
        executeSteps.push(new VerifyProvidersStep(['Microsoft.AppPlatform']));
        executeSteps.push(new CreateAppStep(service));
        executeSteps.push(new CreateAppDeploymentStep(service));
        executeSteps.push(new UpdateAppStep(service));
        const creating: string = utils.localize('creatingSpringCouldApp', 'Creating new Spring app in Azure');
        const wizard: AzureWizard<IAppCreationWizardContext> = new AzureWizard(wizardContext, { promptSteps, executeSteps, title: creating });

        await wizard.prompt();
        const appName: string = utils.nonNullProp(wizardContext, 'newAppName');
        context.showCreatingTreeItem(appName);
        await wizard.execute();
        const created: string = utils.localize('createdSpringCouldApp', 'Successfully created Spring app "{0}".', appName);
        window.showInformationMessage(created);
        const item: AppTreeItem = new AppTreeItem(this, utils.nonNullProp(wizardContext, 'newApp'));
        item.refresh(context);
        return item;
    }

    public async refreshImpl(context: IActionContext): Promise<void> {
        const service: EnhancedService = this.getService(context);
        if (!this.deleted) {
            this.data = await service.reload();
        }
    }
}
