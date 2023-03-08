/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { VerifyProvidersStep } from "@microsoft/vscode-azext-azureutils";
import {
    AzExtParentTreeItem,
    AzExtTreeItem,
    AzureWizard,
    AzureWizardExecuteStep,
    AzureWizardPromptStep, IActionContext, ICreateChildImplContext,
    ISubscriptionContext,
    TreeItemIconPath
} from '@microsoft/vscode-azext-utils';
import { ResolvedAppResourceBase, ResolvedAppResourceTreeItem } from "@microsoft/vscode-azext-utils/hostapi";
import { window } from "vscode";
import { CreateAppDeploymentStep } from "../commands/steps/creation/CreateAppDeploymentStep";
import { CreateAppStep } from "../commands/steps/creation/CreateAppStep";
import { IAppCreationWizardContext } from "../commands/steps/creation/IAppCreationWizardContext";
import { InputAppNameStep } from "../commands/steps/creation/InputAppNameStep";
import { SelectAppStackStep } from "../commands/steps/creation/SelectAppStackStep";
import { UpdateAppStep } from "../commands/steps/creation/UpdateAppStep";
import { EnhancedApp } from '../service/EnhancedApp';
import { EnhancedService } from '../service/EnhancedService';
import * as utils from "../utils";
import { AppTreeItem } from './AppTreeItem';


export type ServiceTreeItem = ResolvedAppResourceTreeItem<ResolvedService> & AzExtParentTreeItem & ResolvedService;

export default class ResolvedService implements ResolvedAppResourceBase {
    public static contextValue: string = 'azureSpringApps.apps';
    public readonly contextValuesToAdd: string[] = [ResolvedService.contextValue];
    public readonly childTypeLabel: string = utils.localize('springCloud.app', 'Spring App');
    public service: EnhancedService;

    private readonly _subscription: ISubscriptionContext;
    private _nextLink: string | undefined;
    private _appsPromise: Promise<EnhancedApp[]>;
    private deleted: boolean;

    constructor(subscription: ISubscriptionContext, service: EnhancedService) {
        this._subscription = subscription;
        this.service = service;
        void this.reinit();
    }

    public get id(): string {
        return utils.nonNullProp(this.service, 'id');
    }

    public get label(): string {
        return this.service.name;
    }

    public get description(): string | undefined {
        const state: string | undefined = this.service.properties?.provisioningState;
        return state?.toLowerCase() === 'succeeded' ? undefined : state;
    }

    public get iconPath(): TreeItemIconPath {
        return utils.getThemedIconPath('azure-spring-apps');
    }

    public hasMoreChildrenImpl(): boolean {
        return !!this._nextLink;
    }

    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }
        const apps: EnhancedApp[] = await this._appsPromise;
        const proxyTreeItem: ServiceTreeItem = this as unknown as ServiceTreeItem;
        return apps.map((app) => new AppTreeItem(proxyTreeItem, app, context));
    }

    public async deleteTreeItemImpl(_context: IActionContext): Promise<void> {
        await this.service.remove();
        this.deleted = true;
    }

    public async createChildImpl(context: ICreateChildImplContext): Promise<AzExtTreeItem> {
        const wizardContext: IAppCreationWizardContext = Object.assign(context, this._subscription, { service: this.service });
        const promptSteps: AzureWizardPromptStep<IAppCreationWizardContext>[] = [];
        const executeSteps: AzureWizardExecuteStep<IAppCreationWizardContext>[] = [];
        promptSteps.push(new InputAppNameStep(this.service));
        promptSteps.push(new SelectAppStackStep(this.service));
        executeSteps.push(new VerifyProvidersStep(['Microsoft.AppPlatform']));
        executeSteps.push(new CreateAppStep(this.service));
        executeSteps.push(new CreateAppDeploymentStep());
        executeSteps.push(new UpdateAppStep());
        const creating: string = utils.localize('creatingSpringCouldApp', 'Creating new Spring app in Azure');
        const wizard: AzureWizard<IAppCreationWizardContext> = new AzureWizard(wizardContext, { promptSteps, executeSteps, title: creating });

        await wizard.prompt();
        const appName: string = utils.nonNullProp(wizardContext, 'newAppName');
        context.showCreatingTreeItem(appName);
        await wizard.execute();
        const created: string = utils.localize('createdSpringCouldApp', 'Successfully created Spring app "{0}".', appName);
        void window.showInformationMessage(created);
        const proxyTreeItem: ServiceTreeItem = this as unknown as ServiceTreeItem;
        return new AppTreeItem(proxyTreeItem, utils.nonNullProp(wizardContext, 'newApp'), context);
    }

    public async refreshImpl(_context: IActionContext): Promise<void> {
        if (!this.deleted) {
            await this.service.refresh();
            void this.reinit();
        }
    }

    private async reinit(): Promise<void> {
        this._appsPromise = this.service.getApps();
    }
}
