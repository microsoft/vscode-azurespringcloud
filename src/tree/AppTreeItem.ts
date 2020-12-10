/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppPlatformManagementClient } from "@azure/arm-appplatform";
import { AppResource, DeploymentResource, ResourceUploadDefinition, TestKeys } from '@azure/arm-appplatform/esm/models';
import { ProgressLocation, window } from "vscode";
import {
    AzExtTreeItem,
    AzureParentTreeItem,
    AzureWizard,
    AzureWizardExecuteStep,
    createAzureClient,
    IActionContext,
    TreeItemIconPath
} from "vscode-azureextensionui";
import { IAppDeploymentWizardContext } from "../commands/steps/deployment/IAppDeploymentWizardContext";
import { UpdateDeploymentStep } from "../commands/steps/deployment/UpdateDeploymentStep";
import { UploadArtifactStep } from "../commands/steps/deployment/UploadArtifactStep";
import { ext } from "../extensionVariables";
import { localize, nonNullProp } from "../utils";
import { TreeUtils } from "../utils/TreeUtils";
import { AppEnvVariablesTreeItem } from "./AppEnvVariablesTreeItem";
import { AppInstancesTreeItem } from "./AppInstancesTreeItem";
import { AppJvmOptionsTreeItem } from "./AppJvmOptionsTreeItem";
import { AppScaleSettingsTreeItem } from "./AppScaleSettingsTreeItem";
import { ServiceTreeItem } from "./ServiceTreeItem";

export class AppTreeItem extends AzureParentTreeItem {
    public static contextValue: string = 'azureSpringCloud.app';
    public readonly contextValue: string = AppTreeItem.contextValue;
    public parent: ServiceTreeItem;
    public app: AppResource;
    private deployment: DeploymentResource | undefined;
    private scaleSettingsTreeItem: AppScaleSettingsTreeItem;
    private deleted: boolean;

    constructor(parent: ServiceTreeItem, resource: AppResource) {
        super(parent);
        this.app = resource;
        this.refresh();
    }

    public get client(): AppPlatformManagementClient {
        return createAzureClient(this.root, AppPlatformManagementClient);
    }

    public get name(): string {
        return nonNullProp(this.app, 'name');
    }

    public get serviceName(): string {
        return this.parent.serviceName;
    }

    public get resourceGroup(): string {
        return this.parent.resourceGroup;
    }

    public get data(): AppResource {
        return this.app;
    }

    public get id(): string {
        return nonNullProp(this.app, 'id');
    }

    public get label(): string {
        return this.name;
    }

    public get description(): string | undefined {
        const state: string | undefined = this.app.properties?.provisioningState;
        return state?.toLowerCase() === 'succeeded' ? undefined : state;
    }

    // tslint:disable:no-unexternalized-strings
    public get iconPath(): TreeItemIconPath {
        switch (this.deployment?.properties?.status) {
            case "Stopped":
                return TreeUtils.getPngIconPath('azure-springcloud-app-stopped');
            case "Failed":
                return TreeUtils.getPngIconPath('azure-springcloud-app-failed');
            case "Allocating":
            case "Upgrading":
            case "Compiling":
                return TreeUtils.getPngIconPath('azure-springcloud-app-pending');
            case "Unknown":
                return TreeUtils.getPngIconPath('azure-springcloud-app-unknown');
            case "Running":
            default:
                return TreeUtils.getPngIconPath('azure-springcloud-app-running');
        }
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        this.deployment = await this.getActiveDeployment();
        this.scaleSettingsTreeItem = new AppScaleSettingsTreeItem(this, this.deployment);
        const appInstancesTreeItem: AppInstancesTreeItem = new AppInstancesTreeItem(this, this.deployment);
        const envPropertiesTreeItem: AppEnvVariablesTreeItem = new AppEnvVariablesTreeItem(this, this.deployment);
        const jvmOptionsTreeItem: AppJvmOptionsTreeItem = new AppJvmOptionsTreeItem(this, this.deployment);
        return [appInstancesTreeItem, envPropertiesTreeItem, this.scaleSettingsTreeItem, jvmOptionsTreeItem];
    }

    public async deleteTreeItemImpl(_context: IActionContext): Promise<void> {
        const deleting: string = localize('deletingSpringCLoudApp', 'Deleting Spring Cloud app "{0}"...', this.name);
        const deleted: string = localize('deletedSpringCLoudApp', 'Successfully deleted Spring Cloud app "{0}".', this.name);

        await window.withProgress({ location: ProgressLocation.Notification, title: deleting }, async (): Promise<void> => {
            ext.outputChannel.appendLog(deleting);
            await this.client.apps.deleteMethod(this.resourceGroup, this.serviceName, this.name);
            window.showInformationMessage(deleted);
            ext.outputChannel.appendLog(deleted);
        });
        this.deleted = true;
    }

    public async start(): Promise<void> {
        await this.client.deployments.start(this.resourceGroup, this.serviceName, this.name, this.app.properties?.activeDeploymentName!);
        this.refresh();
    }

    public async stop(): Promise<void> {
        await this.client.deployments.stop(this.resourceGroup, this.serviceName, this.name, this.app.properties?.activeDeploymentName!);
        this.refresh();
    }

    public async restart(): Promise<void> {
        await this.client.deployments.restart(this.resourceGroup, this.serviceName, this.name, this.app.properties?.activeDeploymentName!);
        this.refresh();
    }

    public async getPublicEndpoint(): Promise<string | undefined> {
        if (this.app.properties?.url && this.app.properties?.url !== 'None') {
            return this.app.properties?.url;
        }
        return undefined;
    }

    public async getTestKeys(): Promise<TestKeys> {
        return await this.client.services.listTestKeys(this.resourceGroup, this.serviceName);
    }

    public async getTestEndpoint(): Promise<string | undefined> {
        const testKeys: TestKeys | undefined = await this.client.services.listTestKeys(this.resourceGroup, this.serviceName);
        return `${testKeys.primaryTestEndpoint}/${this.name}/default`;
    }

    public async toggleEndpoint(_context: IActionContext): Promise<void> {
        const isPublic: boolean = this.app.properties?.publicProperty ?? false;
        const doing: string = isPublic ? `Unassigning public endpoint of Spring Cloud app "${this.name}".` : `Assigning public endpoint to Spring Cloud app "${this.name}".`;
        const done: string = isPublic ? `Successfully unassigned public endpoint of Spring Cloud app "${this.name}".` : `Successfully assigned public endpoint to Spring Cloud app "${this.name}".`;
        await window.withProgress({ location: ProgressLocation.Notification, title: doing }, async (): Promise<void> => {
            ext.outputChannel.appendLog(doing);
            await this.client.apps.createOrUpdate(this.resourceGroup, this.serviceName, this.name, {
                properties: {
                    activeDeploymentName: this.deployment?.name,
                    publicProperty: !isPublic
                }
            });
            window.showInformationMessage(done);
            ext.outputChannel.appendLog(done);
        });
        this.refresh();
    }

    public async getActiveDeployment(force: boolean = false): Promise<DeploymentResource> {
        const deploymentName: string = this.app.properties?.activeDeploymentName!;
        if (force || !this.deployment) {
            this.deployment = await this.client.deployments.get(this.resourceGroup, this.serviceName, this.name, deploymentName);
        }
        return this.deployment;
    }

    public async deployArtifact(context: IActionContext, artifactUrl: string): Promise<void> {
        const deploying: string = localize('deploying', 'Deploying artifact to Spring Cloud app "{0}".', this.name);
        const deployed: string = localize('deployed', 'Successfully deployed artifact to Spring Cloud app "{0}".', this.name);

        const uploadDefinition: ResourceUploadDefinition = await this.client.apps.getResourceUploadUrl(this.resourceGroup, this.serviceName, this.name);
        const deployment: DeploymentResource = await this.getActiveDeployment();
        const wizardContext: IAppDeploymentWizardContext = Object.assign(context, this.root, {
            uploadDefinition,
            artifactUrl,
            deployment,
            app: this.app
        });

        const executeSteps: AzureWizardExecuteStep<IAppDeploymentWizardContext>[] = [];
        executeSteps.push(new UploadArtifactStep());
        executeSteps.push(new UpdateDeploymentStep());
        const wizard: AzureWizard<IAppDeploymentWizardContext> = new AzureWizard(wizardContext, { executeSteps, title: deploying });
        await wizard.execute();
        window.showInformationMessage(deployed);
    }

    public async scaleInstances(context: IActionContext): Promise<void> {
        await this.scaleSettingsTreeItem.updateSettingsValue(context);
    }

    public async refreshImpl(): Promise<void> {
        if (!this.deleted) {
            this.app = await this.client.apps.get(this.resourceGroup, this.serviceName, this.name);
            this.deployment = await this.getActiveDeployment(true);
        }
    }
}
