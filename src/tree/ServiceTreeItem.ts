/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppPlatformManagementClient } from '@azure/arm-appplatform';
import { ServiceResource } from '@azure/arm-appplatform/esm/models';
import { window } from "vscode";
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
import { CreateAppDeploymentStep } from "../commands/steps/creation/CreateAppDeploymentStep";
import { CreateAppStep } from "../commands/steps/creation/CreateAppStep";
import { IAppCreationWizardContext } from "../commands/steps/creation/IAppCreationWizardContext";
import { InputAppNameStep } from "../commands/steps/creation/InputAppNameStep";
import { SelectAppStackStep } from "../commands/steps/creation/SelectAppStackStep";
import { UpdateAppStep } from "../commands/steps/creation/UpdateAppStep";
import { EnhancedService, IApp, IService } from "../model";
import { ServiceService } from "../service/ServiceService";
import * as utils from "../utils";
import { TreeUtils } from "../utils/TreeUtils";
import { AppTreeItem } from './AppTreeItem';

export class ServiceTreeItem extends AzureParentTreeItem {
    public static contextValue: string = 'azureSpringCloud.service';
    public readonly contextValue: string = ServiceTreeItem.contextValue;
    public readonly childTypeLabel: string = utils.localize('app', 'App');
    public data: IService;

    private _nextLink: string | undefined;
    private deleted: boolean;

    constructor(parent: AzureParentTreeItem, service: ServiceResource) {
        super(parent);
        this.data = IService.fromResource(service);
    }

    public get service(): EnhancedService {
        const client: AppPlatformManagementClient = createAzureClient(this.root, AppPlatformManagementClient);
        const serviceService: ServiceService = new ServiceService(client, this.data);
        return Object.assign(serviceService, this.data);
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
        return TreeUtils.getThemedIconPath('azure-spring-cloud');
    }

    public hasMoreChildrenImpl(): boolean {
        return !!this._nextLink;
    }

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }
        const result: { nextLink?: string; apps: IApp[] } = await this.service.getApps(this._nextLink);
        this._nextLink = result.nextLink;
        return await this.createTreeItemsWithErrorHandling(
            result.apps,
            'invalidSpringCloudApp',
            app => new AppTreeItem(this, app),
            app => app.name
        );
    }

    public async deleteTreeItemImpl(): Promise<void> {
        const deleting: string = utils.localize('deletingSpringCLoudService', 'Deleting Spring Cloud service "{0}"...', this.data.name);
        const deleted: string = utils.localize('deletedSpringCloudService', 'Successfully deleted Spring Cloud service "{0}".', this.data.name);
        await utils.runInBackground(deleting, deleted, () => this.service.remove());
        this.deleted = true;
    }

    public async createChildImpl(context: ICreateChildImplContext): Promise<AzExtTreeItem> {
        const wizardContext: IAppCreationWizardContext = Object.assign(context, this.root, {
            service: this.data
        });

        const promptSteps: AzureWizardPromptStep<IAppCreationWizardContext>[] = [];
        const executeSteps: AzureWizardExecuteStep<IAppCreationWizardContext>[] = [];
        promptSteps.push(new InputAppNameStep(this.service));
        promptSteps.push(new SelectAppStackStep());
        executeSteps.push(new VerifyProvidersStep(['Microsoft.AppPlatform']));
        executeSteps.push(new CreateAppStep(this.service));
        executeSteps.push(new CreateAppDeploymentStep(this.service));
        executeSteps.push(new UpdateAppStep(this.service));
        const creating: string = utils.localize('creatingSpringCouldApp', 'Creating new Spring Cloud app in Azure');
        const wizard: AzureWizard<IAppCreationWizardContext> = new AzureWizard(wizardContext, { promptSteps, executeSteps, title: creating });

        await wizard.prompt();
        const appName: string = utils.nonNullProp(wizardContext, 'newAppName');
        context.showCreatingTreeItem(appName);
        await wizard.execute();
        const created: string = utils.localize('createdSpringCouldApp', 'Successfully created Spring Cloud app "{0}".', appName);
        window.showInformationMessage(created);

        return new AppTreeItem(this, utils.nonNullProp(wizardContext, 'newApp'));
    }

    public async refreshImpl(): Promise<void> {
        if (!this.deleted) {
            this.data = await this.service.reload();
        }
    }
}
