/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppPlatformManagementClient } from "@azure/arm-appplatform";
import { createAzureClient } from "@microsoft/vscode-azext-azureutils";
import { AzExtParentTreeItem, AzExtTreeItem, AzureWizard, AzureWizardExecuteStep, IActionContext, TreeItemIconPath } from '@microsoft/vscode-azext-utils';
import { window } from "vscode";
import { AppCommands } from "../commands/AppCommands";
import { IAppDeploymentWizardContext } from "../commands/steps/deployment/IAppDeploymentWizardContext";
import { UpdateDeploymentStep } from "../commands/steps/deployment/UpdateDeploymentStep";
import { UploadArtifactStep } from "../commands/steps/deployment/UploadArtifactStep";
import { EnhancedApp, EnhancedDeployment, IApp, IDeployment } from "../model";
import { AppService } from "../service/AppService";
import { DeploymentService } from "../service/DeploymentService";
import * as utils from "../utils";
import { AppEnvVariablesTreeItem } from "./AppEnvVariablesTreeItem";
import { AppInstancesTreeItem } from "./AppInstancesTreeItem";
import { AppInstanceTreeItem } from "./AppInstanceTreeItem";
import { AppJvmOptionsTreeItem } from "./AppJvmOptionsTreeItem";
import { AppScaleSettingsTreeItem } from "./AppScaleSettingsTreeItem";
import { ServiceTreeItem } from "./ServiceTreeItem";

export class AppTreeItem extends AzExtParentTreeItem {
    public static contextValue: RegExp = /^azureSpringApps\.app\.status-.+$/;
    private static readonly ACCESS_PUBLIC_ENDPOINT: string = 'Access public endpoint';
    private static readonly ACCESS_TEST_ENDPOINT: string = 'Access test endpoint';
    public parent: ServiceTreeItem;
    public data: IApp;
    private deploymentData: IDeployment | undefined;
    private appInstancesTreeItem: AppInstancesTreeItem;
    private scaleSettingsTreeItem: AppScaleSettingsTreeItem;
    private envPropertiesTreeItem: AppEnvVariablesTreeItem;
    private jvmOptionsTreeItem: AppJvmOptionsTreeItem;
    private deleted: boolean;

    constructor(parent: ServiceTreeItem, app: IApp) {
        super(parent);
        this.data = app;
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

    public get contextValue(): string {
        return `azureSpringApps.app.status-${this.status}`;
    }

    public get iconPath(): TreeItemIconPath {
        return utils.getThemedIconPath(`app-status-${this.status}`);
    }

    // tslint:disable:no-unexternalized-strings
    public get status(): string {
        if (!this.data.properties?.activeDeploymentName) {
            return "failed";
        }
        switch (this.data.properties?.provisioningState) {
            case "Creating":
            case "Updating":
                return 'pending';
            case "Failed":
                return "failed";
            case "Succeeded":
            default:
        }
        switch (this.deploymentData?.properties?.status) {
            case "Stopped":
                return 'stopped';
            case "Failed":
                return 'failed';
            case "Allocating":
            case "Upgrading":
            case "Compiling":
                return 'pending';
            case "Unknown":
                return 'unknown';
            case "Running":
            default:
                return 'running';
        }
    }

    public getApp(context: IActionContext): EnhancedApp {
        const client: AppPlatformManagementClient = createAzureClient([context, this], AppPlatformManagementClient);
        const appService: AppService = new AppService(client, this.data);
        return Object.assign(appService, this.data);
    }

    public getDeployment(context: IActionContext): EnhancedDeployment | undefined {
        if (!this.deploymentData) {
            return undefined;
        }
        const client: AppPlatformManagementClient = createAzureClient([context, this], AppPlatformManagementClient);
        const deploymentService: DeploymentService = new DeploymentService(client, this.deploymentData);
        return Object.assign(deploymentService, this.deploymentData);
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async loadMoreChildrenImpl(_clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        return this.initItemsIfNot(context);
    }

    public async deleteTreeItemImpl(context: IActionContext): Promise<void> {
        const app: EnhancedApp = this.getApp(context);
        const deleting: string = utils.localize('deletingSpringCLoudApp', 'Deleting Spring app "{0}"...', this.data.name);
        const deleted: string = utils.localize('deletedSpringCLoudApp', 'Successfully deleted Spring app "{0}".', this.data.name);
        await utils.runInBackground(deleting, deleted, () => app.remove());
        this.deleted = true;
    }

    public async toggleEndpoint(context: IActionContext): Promise<void> {
        const app: EnhancedApp = this.getApp(context);
        const isPublic: boolean = this.data.properties?.publicProperty ?? false;
        const doing: string = isPublic ? `Unassigning public endpoint of "${this.data.name}".` : `Assigning public endpoint to "${this.data.name}".`;
        const done: string = isPublic ? `Successfully unassigned public endpoint of "${this.data.name}".` : `Successfully assigned public endpoint to "${this.data.name}".`;
        await utils.runInBackground(doing, done, () => app.setPublic(!isPublic));
        this.refresh(context);
    }

    public async getActiveDeployment(context: IActionContext, force: boolean = false): Promise<IDeployment | undefined> {
        if (force || !this.deploymentData) {
            const app: EnhancedApp = this.getApp(context);
            this.deploymentData = await app.getActiveDeployment();
        }
        return this.deploymentData;
    }

    public async deployArtifact(context: IActionContext, artifactPath: string): Promise<void> {
        const app: EnhancedApp = this.getApp(context);
        const deployment: EnhancedDeployment | undefined = this.getDeployment(context);
        const deploying: string = utils.localize('deploying', 'Deploying artifact to "{0}".', this.data.name);
        const deployed: string = utils.localize('deployed', 'Successfully deployed artifact to "{0}".', this.data.name);

        const wizardContext: IAppDeploymentWizardContext = Object.assign(context, this.subscription, { app });

        const executeSteps: AzureWizardExecuteStep<IAppDeploymentWizardContext>[] = [];
        executeSteps.push(new UploadArtifactStep(app, artifactPath));
        executeSteps.push(new UpdateDeploymentStep(deployment!));
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
        await this.initItemsIfNot(context);
        await this.scaleSettingsTreeItem.updateSettingsValue(context);
    }

    public async refreshImpl(context: IActionContext): Promise<void> {
        if (!this.deleted) {
            const app: EnhancedApp = this.getApp(context);
            this.data = await app.reload();
            this.deploymentData = await app.getActiveDeployment();
        }
    }

    public async pickTreeItemImpl(expectedContextValues: (string | RegExp)[], context: IActionContext): Promise<AzExtTreeItem | undefined> {
        for (const expectedContextValue of expectedContextValues) {
            if (expectedContextValue === AppInstanceTreeItem.contextValue) {
                await this.initItemsIfNot(context);
                return this.appInstancesTreeItem;
            }
        }
        return undefined;
    }

    private async initItemsIfNot(context: IActionContext): Promise<AzExtTreeItem[]> {
        this.deploymentData = await this.getActiveDeployment(context);
        if (!this.deploymentData) {
            return [];
        }
        this.scaleSettingsTreeItem = this.scaleSettingsTreeItem ?? new AppScaleSettingsTreeItem(this, this.deploymentData);
        this.appInstancesTreeItem = this.appInstancesTreeItem ?? new AppInstancesTreeItem(this, this.deploymentData);
        this.envPropertiesTreeItem = this.envPropertiesTreeItem ?? new AppEnvVariablesTreeItem(this, this.deploymentData);
        this.jvmOptionsTreeItem = this.jvmOptionsTreeItem ?? new AppJvmOptionsTreeItem(this, this.deploymentData);
        return [this.appInstancesTreeItem, this.envPropertiesTreeItem, this.scaleSettingsTreeItem, this.jvmOptionsTreeItem];
    }
}
