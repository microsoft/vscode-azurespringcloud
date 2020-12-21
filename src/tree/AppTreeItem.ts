/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppPlatformManagementClient } from "@azure/arm-appplatform";
import { window } from "vscode";
import {
    AzExtTreeItem,
    AzureParentTreeItem,
    AzureWizard,
    AzureWizardExecuteStep,
    createAzureClient,
    IActionContext,
    TreeItemIconPath
} from "vscode-azureextensionui";
import { AppCommands } from "../commands/AppCommands";
import { IAppDeploymentWizardContext } from "../commands/steps/deployment/IAppDeploymentWizardContext";
import { UpdateDeploymentStep } from "../commands/steps/deployment/UpdateDeploymentStep";
import { UploadArtifactStep } from "../commands/steps/deployment/UploadArtifactStep";
import { EnhancedApp, EnhancedDeployment, IApp, IDeployment } from "../model";
import { AppService } from "../service/AppService";
import { DeploymentService } from "../service/DeploymentService";
import * as utils from "../utils";
import { TreeUtils } from "../utils/TreeUtils";
import { AppEnvVariablesTreeItem } from "./AppEnvVariablesTreeItem";
import { AppInstancesTreeItem } from "./AppInstancesTreeItem";
import { AppJvmOptionsTreeItem } from "./AppJvmOptionsTreeItem";
import { AppScaleSettingsTreeItem } from "./AppScaleSettingsTreeItem";
import { ServiceTreeItem } from "./ServiceTreeItem";

export class AppTreeItem extends AzureParentTreeItem {
    public static contextValue: string = 'azureSpringCloud.app';
    private static readonly ACCESS_PUBLIC_ENDPOINT: string = 'Access public endpoint';
    private static readonly ACCESS_TEST_ENDPOINT: string = 'Access test endpoint';
    public readonly contextValue: string = AppTreeItem.contextValue;
    public parent: ServiceTreeItem;
    public data: IApp;
    private deploymentData: IDeployment | undefined;
    private scaleSettingsTreeItem: AppScaleSettingsTreeItem;
    private deleted: boolean;

    constructor(parent: ServiceTreeItem, app: IApp) {
        super(parent);
        this.data = app;
        this.refresh();
    }

    public get app(): EnhancedApp {
        const client: AppPlatformManagementClient = createAzureClient(this.root, AppPlatformManagementClient);
        const appService: AppService = new AppService(client, this.data);
        return Object.assign(appService, this.data);
    }

    public get deployment(): EnhancedDeployment | undefined {
        if (!this.deploymentData) {
            return undefined;
        }
        const client: AppPlatformManagementClient = createAzureClient(this.root, AppPlatformManagementClient);
        const deploymentService: DeploymentService = new DeploymentService(client, this.deploymentData);
        return Object.assign(deploymentService, this.deploymentData);
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

    // tslint:disable:no-unexternalized-strings
    public get iconPath(): TreeItemIconPath {
        switch (this.deploymentData?.properties?.status) {
            case "Stopped":
                return TreeUtils.getThemedIconPath('app-status-stopped');
            case "Failed":
                return TreeUtils.getThemedIconPath('app-status-failed');
            case "Allocating":
            case "Upgrading":
            case "Compiling":
                return TreeUtils.getThemedIconPath('app-status-pending');
            case "Unknown":
                return TreeUtils.getThemedIconPath('app-status-unknown');
            case "Running":
            default:
                return TreeUtils.getThemedIconPath('app');
        }
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        this.deploymentData = await this.getActiveDeployment();
        this.scaleSettingsTreeItem = new AppScaleSettingsTreeItem(this, this.deploymentData);
        const appInstancesTreeItem: AppInstancesTreeItem = new AppInstancesTreeItem(this, this.deploymentData);
        const envPropertiesTreeItem: AppEnvVariablesTreeItem = new AppEnvVariablesTreeItem(this, this.deploymentData);
        const jvmOptionsTreeItem: AppJvmOptionsTreeItem = new AppJvmOptionsTreeItem(this, this.deploymentData);
        return [appInstancesTreeItem, envPropertiesTreeItem, this.scaleSettingsTreeItem, jvmOptionsTreeItem];
    }

    public async deleteTreeItemImpl(_context: IActionContext): Promise<void> {
        const deleting: string = utils.localize('deletingSpringCLoudApp', 'Deleting Spring Cloud app "{0}"...', this.data.name);
        const deleted: string = utils.localize('deletedSpringCLoudApp', 'Successfully deleted Spring Cloud app "{0}".', this.data.name);
        await utils.runInBackground(deleting, deleted, () => this.app.remove());
        this.deleted = true;
    }

    public async toggleEndpoint(_context: IActionContext): Promise<void> {
        const isPublic: boolean = this.data.properties?.publicProperty ?? false;
        const doing: string = isPublic ? `Unassigning public endpoint of "${this.data.name}".` : `Assigning public endpoint to "${this.data.name}".`;
        const done: string = isPublic ? `Successfully unassigned public endpoint of "${this.data.name}".` : `Successfully assigned public endpoint to "${this.data.name}".`;
        await utils.runInBackground(doing, done, () => this.app.setPublic(!isPublic));
        this.refresh();
    }

    public async getActiveDeployment(force: boolean = false): Promise<IDeployment> {
        if (force || !this.deploymentData) {
            this.deploymentData = await this.app.getActiveDeployment();
        }
        return this.deploymentData;
    }

    public async deployArtifact(context: IActionContext, artifactPath: string): Promise<void> {
        const deploying: string = utils.localize('deploying', 'Deploying artifact to "{0}".', this.data.name);
        const deployed: string = utils.localize('deployed', 'Successfully deployed artifact to "{0}".', this.data.name);

        const wizardContext: IAppDeploymentWizardContext = Object.assign(context, this.root, {
            app: this.app
        });

        const executeSteps: AzureWizardExecuteStep<IAppDeploymentWizardContext>[] = [];
        executeSteps.push(new UploadArtifactStep(this.app, artifactPath));
        executeSteps.push(new UpdateDeploymentStep(this.deployment!));
        const wizard: AzureWizard<IAppDeploymentWizardContext> = new AzureWizard(wizardContext, { executeSteps, title: deploying });
        await wizard.execute();
        setTimeout(async () => {
            const action: string | undefined = await window.showInformationMessage(deployed, AppTreeItem.ACCESS_PUBLIC_ENDPOINT, AppTreeItem.ACCESS_TEST_ENDPOINT);
            if (action) {
                return action === AppTreeItem.ACCESS_PUBLIC_ENDPOINT ? AppCommands.openPublicEndpoint(context, this) : AppCommands.openTestEndpoint(context, this);
            }
        },         0);
    }

    public async scaleInstances(context: IActionContext): Promise<void> {
        await this.scaleSettingsTreeItem.updateSettingsValue(context);
    }

    public async refreshImpl(): Promise<void> {
        if (!this.deleted) {
            this.data = await this.app.reload();
            this.deploymentData = await this.app.getActiveDeployment();
        }
    }
}
