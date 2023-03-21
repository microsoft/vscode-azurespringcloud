// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { RemoteDebugging } from '@azure/arm-appplatform';
import { AzureWizard, AzureWizardExecuteStep, callWithTelemetryAndErrorHandling, createSubscriptionContext, IActionContext } from '@microsoft/vscode-azext-utils';
import { ViewPropertiesModel } from '@microsoft/vscode-azureresources-api';
import { TreeItem, TreeItemCollapsibleState, Uri, window } from "vscode";
import { Commands } from "../commands/Commands";
import { IAppDeploymentWizardContext } from "../commands/steps/deployment/IAppDeploymentWizardContext";
import { UpdateDeploymentStep } from "../commands/steps/deployment/UpdateDeploymentStep";
import { UploadArtifactStep } from "../commands/steps/deployment/UploadArtifactStep";
import { ext } from '../extensionVariables';
import { EnhancedApp } from "../service/EnhancedApp";
import { EnhancedDeployment } from "../service/EnhancedDeployment";
import * as utils from "../utils";
import { AppEnvVariablesItem } from "./AppEnvVariablesItem";
import { AppInstancesItem } from "./AppInstancesItem";
import { AppJvmOptionsItem } from "./AppJvmOptionsItem";
import { AppScaleSettingsItem } from "./AppScaleSettingsItem";
import AppsItem from './AppsItem';
import { ResourceItemBase } from './SpringAppsBranchDataProvider';

export class AppItem implements ResourceItemBase {
    public static contextValue: RegExp = /^azureSpringApps\.app;status-.+;debugging-.+;public-.+;/i;
    public static readonly ACCESS_PUBLIC_ENDPOINT: string = 'Access public endpoint';
    public static readonly ACCESS_TEST_ENDPOINT: string = 'Access test endpoint';
    public readonly app: EnhancedApp;
    private _children: Promise<ResourceItemBase[] | undefined>;
    private _scaleSettingsItem: AppScaleSettingsItem;
    private _status: string = 'unknown';
    private _debuggingEnabled: boolean | undefined;
    private deleted: boolean;

    constructor(public readonly parent: AppsItem, app: EnhancedApp) {
        this.app = app;
        void this.refresh();
    }

    get viewProperties(): ViewPropertiesModel {
        return {
            label: this.app.name,
            data: this.app.properties ?? {},
        };
    }

    get portalUrl(): Uri {
        return utils.createPortalUrl(this.app.service.subscription, this.app.id);
    }

    async getChildren(): Promise<ResourceItemBase[]> {
        return await this._children ?? [];
    }

    getTreeItem(): TreeItem {
        return {
            id: this.id,
            label: this.app.name,
            iconPath: utils.getThemedIconPath(`app-status-${this._status}`),
            contextValue: this.contextValue,
            description: this.description,
            collapsibleState: TreeItemCollapsibleState.Collapsed,
        }
    }

    public get id(): string {
        return utils.nonNullProp(this.app, 'id');
    }

    public get description(): string | undefined {
        const state: string | undefined = this.app.properties?.provisioningState;
        return state?.toLowerCase() === 'succeeded' ? undefined : state;
    }

    public get contextValue(): string {
        const debugging: string = this._debuggingEnabled === undefined ? 'unknown' : this._debuggingEnabled ? 'enabled' : 'disabled'
        return `azureSpringApps.app;status-${this._status};debugging-${debugging};public-${this.app.properties?.public};`;
    }

    public async deployArtifact(context: IActionContext, artifactPath: string): Promise<void> {
        const deployment: EnhancedDeployment | undefined = await this.app.getActiveDeployment();
        if (!deployment) {
            throw new Error(`App "${this.app.name}" has no active deployment.`);
        }
        const deploying: string = utils.localize('deploying', 'Deploying artifact to "{0}".', this.app.name);
        const deployed: string = utils.localize('deployed', 'Successfully deployed artifact to "{0}".', this.app.name);
        const wizardContext: IAppDeploymentWizardContext = Object.assign(context, createSubscriptionContext(this.app.service.subscription), { app: this.app });
        const executeSteps: AzureWizardExecuteStep<IAppDeploymentWizardContext>[] = [];
        executeSteps.push(new UploadArtifactStep(this.app, artifactPath));
        executeSteps.push(new UpdateDeploymentStep(deployment));
        const wizard: AzureWizard<IAppDeploymentWizardContext> = new AzureWizard(wizardContext, { executeSteps, title: deploying });
        const description = utils.localize('deploying', 'Deploying...');
        await ext.state.runWithTemporaryDescription(this.id, description, () => wizard.execute());
        const task: () => void = async () => {
            const action: string | undefined = await window.showInformationMessage(deployed, AppItem.ACCESS_PUBLIC_ENDPOINT, AppItem.ACCESS_TEST_ENDPOINT);
            if (action) {
                return action === AppItem.ACCESS_PUBLIC_ENDPOINT ? Commands.openPublicEndpoint(context, this) : Commands.openTestEndpoint(context, this);
            }
        };
        setTimeout(task, 0);
    }

    public async scaleInstances(context: IActionContext): Promise<void> {
        await this._scaleSettingsItem?.updateSettingsValue(context);
    }

    public async refresh(): Promise<void> {
        if (!this.deleted) {
            await ext.state.runWithTemporaryDescription(this.app.id, utils.localize('loading', 'Loading...'), async () => {
                await this.app.refresh();
                void this.reload();
                this._status = await this.app.getStatus();
                const deployment: EnhancedDeployment | undefined = await this.app.getActiveDeployment();
                const config: RemoteDebugging | undefined = await deployment?.getDebuggingConfig();
                this._debuggingEnabled = config?.enabled;
                ext.state.notifyChildrenChanged(this.id);
            });
        }
    }

    async start(): Promise<void> {
        const description = utils.localize('start', 'Starting...');
        await ext.state.runWithTemporaryDescription(this.id, description, async () => {
            await this.app.start();
            await this.refresh();
        });
    }

    async stop(): Promise<void> {
        const description = utils.localize('stop', 'Stopping...');
        await ext.state.runWithTemporaryDescription(this.id, description, async () => {
            await this.app.stop();
            await this.refresh();
        });
    }

    async restart(): Promise<void> {
        const description = utils.localize('restart', 'Restarting...');
        await ext.state.runWithTemporaryDescription(this.id, description, async () => {
            await this.app.restart();
            await this.refresh();
        });
    }

    public async remove(): Promise<void> {
        const description = utils.localize('deleting', 'Deleting...');
        await ext.state.runWithTemporaryDescription(this.id, description, async () => {
            await this.app.remove();
            this.deleted = true;
            void this.parent.reloadChildren();
            ext.state.notifyChildrenChanged(this.parent.id);
        });
    }

    private async reload(): Promise<void> {
        this._children = callWithTelemetryAndErrorHandling('getChildren', async (_context) => {
            const activeDeployment: EnhancedDeployment | undefined = await this.app.getActiveDeployment();
            if (!activeDeployment) {
                return [];
            }
            this._scaleSettingsItem = new AppScaleSettingsItem(this);
            return [new AppInstancesItem(this), new AppEnvVariablesItem(this), this._scaleSettingsItem, new AppJvmOptionsItem(this)];
        })
    }
}
