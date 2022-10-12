// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzExtParentTreeItem, AzExtTreeItem, AzureWizard, AzureWizardExecuteStep, IActionContext, TreeItemIconPath } from '@microsoft/vscode-azext-utils';
import { window } from "vscode";
import { AppCommands } from "../commands/AppCommands";
import { IAppDeploymentWizardContext } from "../commands/steps/deployment/IAppDeploymentWizardContext";
import { UpdateDeploymentStep } from "../commands/steps/deployment/UpdateDeploymentStep";
import { UploadArtifactStep } from "../commands/steps/deployment/UploadArtifactStep";
import { EnhancedApp } from "../service/EnhancedApp";
import { EnhancedDeployment } from "../service/EnhancedDeployment";
import * as utils from "../utils";
import { AppEnvVariablesTreeItem } from "./AppEnvVariablesTreeItem";
import { AppInstancesTreeItem } from "./AppInstancesTreeItem";
import { AppInstanceTreeItem } from "./AppInstanceTreeItem";
import { AppJvmOptionsTreeItem } from "./AppJvmOptionsTreeItem";
import { AppScaleSettingsTreeItem } from "./AppScaleSettingsTreeItem";
import { ServiceTreeItem } from "./ServiceTreeItem";

export class AppTreeItem extends AzExtParentTreeItem {
    public static contextValue: RegExp = /^azureSpringApps\.app\.status-.+$/;
    public static readonly ACCESS_PUBLIC_ENDPOINT: string = 'Access public endpoint';
    public static readonly ACCESS_TEST_ENDPOINT: string = 'Access test endpoint';
    public readonly parent: ServiceTreeItem;
    public readonly app: EnhancedApp;
    private readonly _appInstancesTreeItem: AppInstancesTreeItem;
    private readonly _scaleSettingsTreeItem: AppScaleSettingsTreeItem;
    private readonly _envPropertiesTreeItem: AppEnvVariablesTreeItem;
    private readonly _jvmOptionsTreeItem: AppJvmOptionsTreeItem;
    private _status: string = 'unknown';
    private deleted: boolean;

    constructor(parent: ServiceTreeItem, app: EnhancedApp, context: IActionContext) {
        super(parent);
        this.app = app;
        this._appInstancesTreeItem = new AppInstancesTreeItem(this);
        this._scaleSettingsTreeItem = new AppScaleSettingsTreeItem(this);
        this._envPropertiesTreeItem = new AppEnvVariablesTreeItem(this);
        this._jvmOptionsTreeItem = new AppJvmOptionsTreeItem(this);
        void this.reloadStatus(context);
    }

    public get id(): string {
        return utils.nonNullProp(this.app, 'id');
    }

    public get label(): string {
        return this.app.name;
    }

    public get description(): string | undefined {
        const state: string | undefined = this.app.properties?.provisioningState;
        return state?.toLowerCase() === 'succeeded' ? undefined : state;
    }

    public get contextValue(): string {
        return `azureSpringApps.app.status-${this.status}`;
    }

    public get iconPath(): TreeItemIconPath {
        return utils.getThemedIconPath(`app-status-${this.status}`);
    }

    public get status(): string {
        return this._status;
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        const activeDeployment: EnhancedDeployment | undefined = await this.app.getActiveDeployment();
        if (!activeDeployment) {
            return [];
        }
        return [this._appInstancesTreeItem, this._envPropertiesTreeItem, this._scaleSettingsTreeItem, this._jvmOptionsTreeItem];
    }

    public async deleteTreeItemImpl(_context: IActionContext): Promise<void> {
        await this.app.remove();
        this.deleted = true;
    }

    public async deployArtifact(context: IActionContext, artifactPath: string): Promise<void> {
        const deployment: EnhancedDeployment | undefined = await this.app.getActiveDeployment();
        if (!deployment) {
            throw new Error(`App "${this.app.name}" has no active deployment.`);
        }
        const deploying: string = utils.localize('deploying', 'Deploying artifact to "{0}".', this.app.name);
        const deployed: string = utils.localize('deployed', 'Successfully deployed artifact to "{0}".', this.app.name);
        const wizardContext: IAppDeploymentWizardContext = Object.assign(context, this.subscription, { app: this.app });
        const executeSteps: AzureWizardExecuteStep<IAppDeploymentWizardContext>[] = [];
        executeSteps.push(new UploadArtifactStep(this.app, artifactPath));
        executeSteps.push(new UpdateDeploymentStep(deployment));
        const wizard: AzureWizard<IAppDeploymentWizardContext> = new AzureWizard(wizardContext, { executeSteps, title: deploying });
        await wizard.execute();
        const task: () => void = async () => {
            const action: string | undefined = await window.showInformationMessage(deployed, AppTreeItem.ACCESS_PUBLIC_ENDPOINT, AppTreeItem.ACCESS_TEST_ENDPOINT);
            if (action) {
                return action === AppTreeItem.ACCESS_PUBLIC_ENDPOINT ? AppCommands.openPublicEndpoint(context, this) : AppCommands.openTestEndpoint(context, this);
            }
        };
        setTimeout(task, 0);
    }

    public async scaleInstances(context: IActionContext): Promise<void> {
        await this._scaleSettingsTreeItem.updateSettingsValue(context);
    }

    public async refreshImpl(_context: IActionContext): Promise<void> {
        if (!this.deleted) {
            await this.app.refresh();
            this._status = await this.app.getStatus();
        }
    }

    public async pickTreeItemImpl(expectedContextValues: (string | RegExp)[], _context: IActionContext): Promise<AzExtTreeItem | undefined> {
        for (const expectedContextValue of expectedContextValues) {
            if (expectedContextValue === AppInstanceTreeItem.contextValue) {
                return this._appInstancesTreeItem;
            }
        }
        return undefined;
    }

    private async reloadStatus(context: IActionContext): Promise<void> {
        await this.runWithTemporaryDescription(context, utils.localize('loading', 'Loading...'), async () => {
            await this.refresh(context);
        });
    }
}
