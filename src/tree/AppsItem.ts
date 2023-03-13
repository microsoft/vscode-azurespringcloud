/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { VerifyProvidersStep } from "@microsoft/vscode-azext-azureutils";
import {
    AzureWizard,
    AzureWizardExecuteStep,
    AzureWizardPromptStep,
    callWithTelemetryAndErrorHandling,
    createSubscriptionContext,
    IActionContext
} from '@microsoft/vscode-azext-utils';
import { ViewPropertiesModel } from "@microsoft/vscode-azureresources-api";
import { TreeItem, TreeItemCollapsibleState, Uri, window } from "vscode";
import { CreateAppDeploymentStep } from "../commands/steps/creation/CreateAppDeploymentStep";
import { CreateAppStep } from "../commands/steps/creation/CreateAppStep";
import { IAppCreationWizardContext } from "../commands/steps/creation/IAppCreationWizardContext";
import { InputAppNameStep } from "../commands/steps/creation/InputAppNameStep";
import { SelectAppStackStep } from "../commands/steps/creation/SelectAppStackStep";
import { UpdateAppStep } from "../commands/steps/creation/UpdateAppStep";
import { ext } from "../extensionVariables";
import { EnhancedApp } from '../service/EnhancedApp';
import { EnhancedService } from '../service/EnhancedService';
import * as utils from "../utils";
import { AppItem } from "./AppItem";
import { ResourceItemBase } from "./SpringAppsBranchDataProvider";

export default class AppsItem implements ResourceItemBase {
    public static contextValue: string = 'azureSpringApps.apps';
    public service: EnhancedService;
    private _deleted: boolean;
    private _appListPromise: Promise<EnhancedApp[]>;

    constructor(service: EnhancedService) {
        this.service = service;
        void this.reinit();
    }

    async getChildren(): Promise<AppItem[]> {
        const result = await callWithTelemetryAndErrorHandling('getChildren', async (_context: IActionContext) => {
            const apps: EnhancedApp[] = await this._appListPromise;
            return apps.map(ca => new AppItem(this, ca));
        });

        return result ?? [];
    }

    getTreeItem(): TreeItem {
        return {
            id: this.id,
            label: this.service.name,
            iconPath: utils.getThemedIconPath('azure-spring-apps'),
            description: this.description,
            contextValue: AppsItem.contextValue,
            collapsibleState: TreeItemCollapsibleState.Collapsed,
        }
    }

    public get id(): string {
        return utils.nonNullProp(this.service, 'id');
    }

    public get description(): string | undefined {
        const state: string | undefined = this.service.properties?.provisioningState;
        return state?.toLowerCase() === 'succeeded' ? undefined : state;
    }

    get viewProperties(): ViewPropertiesModel {
        return {
            label: this.service.name,
            data: this.service.properties ?? {},
        };
    }

    get portalUrl(): Uri {
        return utils.createPortalUrl(this.service.subscription, this.id);
    }

    public get deleted(): boolean {
        return this._deleted;
    }

    public async remove(_context: IActionContext): Promise<void> {
        const description = utils.localize('deleting', 'Deleting...');
        await ext.state.runWithTemporaryDescription(this.id, description, async () => {
            await this.service.remove();
            this._deleted = true;
            ext.branchDataProvider.refresh();
        });
    }

    public async createChild(context: IActionContext): Promise<AppItem> {
        const subContext = createSubscriptionContext(this.service.subscription);
        const wizardContext: IAppCreationWizardContext = Object.assign(context, subContext, { service: this.service });
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
        await ext.state.showCreatingChild(
            this.id,
            utils.localize('createApp', 'Create App "{0}"...', appName),
            async () => {
                try {
                    await wizard.execute();
                } finally {
                    // refresh this node even if create fails because container app provision failure throws an error, but still creates a container app
                    await this.refresh();
                    ext.state.notifyChildrenChanged(this.id);
                }
            });
        const created: string = utils.localize('createdSpringCouldApp', 'Successfully created Spring app "{0}".', appName);
        void window.showInformationMessage(created);
        return new AppItem(this, utils.nonNullProp(wizardContext, 'newApp'));
    }

    public async refresh(): Promise<void> {
        if (!this._deleted) {
            await ext.state.runWithTemporaryDescription(this.id, utils.localize('loading', 'Loading...'), async () => {
                await this.service.refresh();
                void this.reinit();
                ext.state.notifyChildrenChanged(this.id);
            });
        }
    }

    private async reinit(): Promise<void> {
        this._appListPromise = this.service.getApps();
    }
}
