// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
    AppPlatformManagementClient,
    AppResource,
    AppResourceProperties,
    Build,
    BuildResult,
    BuildResultProvisioningState,
    DeploymentResource,
    KnownSupportedRuntimeValue,
    ResourceUploadDefinition,
    TestKeys,
    UserSourceInfoUnion
} from "@azure/arm-appplatform";
import { AnonymousCredential, ShareFileClient } from "@azure/storage-file-share";
import { AzureSubscription } from "@microsoft/vscode-azureresources-api";
import { ext } from "../extensionVariables";
import { EnhancedDeployment } from "./EnhancedDeployment";
import { EnhancedService } from "./EnhancedService";

export class EnhancedApp {
    public static readonly DEFAULT_RUNTIME: KnownSupportedRuntimeValue = KnownSupportedRuntimeValue.Java17;
    public static readonly DEFAULT_DEPLOYMENT: string = 'default';
    public static readonly DEFAULT_TANZU_COMPONENT_NAME: string = 'default';

    public readonly name: string;
    public readonly id: string;
    public readonly service: EnhancedService;
    private _remote: Promise<AppResource>;
    private _activeDeployment: Promise<EnhancedDeployment | undefined>;

    public constructor(service: EnhancedService, resource: AppResource) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.name = resource.name!;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.id = resource.id!;
        this.service = service;
        this._remote = Promise.resolve(resource);
        this._activeDeployment = this.loadActiveDeployment();
    }

    public get properties(): Promise<AppResourceProperties | undefined> {
        return this._remote.then(r => r.properties);
    }

    public get client(): AppPlatformManagementClient {
        return this.service.client;
    }

    public get subscription(): AzureSubscription {
        return this.service.subscription;
    }

    public get activeDeployment(): Promise<EnhancedDeployment | undefined> {
        return this._activeDeployment;
    }

    public get remote(): Promise<AppResource> {
        return this._remote;
    }

    public async getStatus(): Promise<string> {
        const activeDeployment: EnhancedDeployment | undefined = await this.activeDeployment;
        let _status: string = (((await activeDeployment?.properties)?.status ||
            (await activeDeployment?.properties)?.provisioningState ||
            (await this.properties)?.provisioningState) ?? 'Unknown').toLowerCase();
        if (_status.endsWith('ing') && _status !== 'running') {
            _status = 'pending';
        }
        if (_status === 'succeeded') { // inactive
            _status = 'unknown';
        }
        return _status;
    }

    public async start(): Promise<void> {
        ext.outputChannel.appendLog(`[App] starting app ${this.name}.`);
        const activeDeploymentName: string | undefined = (await this.activeDeployment)?.name;
        if (!activeDeploymentName) {
            throw new Error(`app ${this.name} has no active deployment.`);
        }
        await this.client.deployments.beginStartAndWait(this.service.resourceGroup, this.service.name, this.name, activeDeploymentName);
        ext.outputChannel.appendLog(`[App] app ${this.name} is started.`);
    }

    public async stop(): Promise<void> {
        ext.outputChannel.appendLog(`[App] stopping app ${this.name}.`);
        const activeDeploymentName: string | undefined = (await this.activeDeployment)?.name;
        if (!activeDeploymentName) {
            throw new Error(`app ${this.name} has no active deployment.`);
        }
        await this.client.deployments.beginStopAndWait(this.service.resourceGroup, this.service.name, this.name, activeDeploymentName);
        ext.outputChannel.appendLog(`[App] app ${this.name} is stopped.`);
    }

    public async restart(): Promise<void> {
        ext.outputChannel.appendLog(`[App] restarting app ${this.name}.`);
        const activeDeploymentName: string | undefined = (await this.activeDeployment)?.name;
        if (!activeDeploymentName) {
            throw new Error(`app ${this.name} has no active deployment.`);
        }
        await this.client.deployments.beginRestartAndWait(this.service.resourceGroup, this.service.name, this.name, activeDeploymentName);
        ext.outputChannel.appendLog(`[App] app ${this.name} is restarted.`);
    }

    public async remove(): Promise<void> {
        ext.outputChannel.appendLog(`[App] deleting app ${this.name}.`);
        await this.client.apps.beginDeleteAndWait(this.service.resourceGroup, this.service.name, this.name);
        ext.outputChannel.appendLog(`[App] app ${this.name} is deleted.`);
    }

    public async refresh(): Promise<EnhancedApp> {
        this._remote = this.client.apps.get(this.service.resourceGroup, this.service.name, this.name);
        this._activeDeployment = this.loadActiveDeployment();
        return Promise.all([this._remote, this._activeDeployment]).then(() => this);
    }

    public async getDeployments(): Promise<EnhancedDeployment[]> {
        const deployments: DeploymentResource[] = [];
        const pagedResources: AsyncIterable<DeploymentResource> = this.client.deployments.list(this.service.resourceGroup, this.service.name, this.name);
        for await (const deployment of pagedResources) {
            deployments.push(deployment);
        }
        return deployments.map(a => new EnhancedDeployment(this, a));
    }

    private async loadActiveDeployment(): Promise<EnhancedDeployment | undefined> {
        let activeDeployment: Promise<EnhancedDeployment | undefined> = Promise.resolve(undefined);
        const deploymentResources: AsyncIterable<DeploymentResource> = this.client.deployments.list(this.service.resourceGroup, this.service.name, this.name);
        for await (const deploymentResource of deploymentResources) {
            if (deploymentResource.properties?.active) {
                activeDeployment = Promise.resolve(new EnhancedDeployment(this, deploymentResource));
                break;
            }
        }
        return activeDeployment;
    }

    public async setActiveDeployment(deploymentName: string): Promise<void> {
        ext.outputChannel.appendLog(`[App] setting (${deploymentName}) as the new active deployment of app (${this.name}).`);
        this._remote = this.client.apps.beginSetActiveDeploymentsAndWait(this.service.resourceGroup, this.service.name, this.name, {
            activeDeploymentNames: [deploymentName]
        });
        this._activeDeployment = this.loadActiveDeployment();
        ext.outputChannel.appendLog(`[App] (${deploymentName}) is set as new active deployment of app (${this.name}).`);
    }

    public async createDeployment(name: string, runtime?: KnownSupportedRuntimeValue): Promise<EnhancedDeployment> {
        let source: UserSourceInfoUnion | undefined;
        ext.outputChannel.appendLog(`[Deployment] creating deployment (${name}) of app (${this.name}).`);
        if (await this.service.isEnterpriseTier()) {
            source = { type: 'BuildResult', buildResultId: '<default>' };
        } else {
            source = { type: 'Jar', relativePath: '<default>', runtimeVersion: runtime ?? EnhancedApp.DEFAULT_RUNTIME };
        }
        // refer: https://dev.azure.com/msazure/AzureDMSS/_git/AzureDMSS-PortalExtension?path=%2Fsrc%2FSpringCloudPortalExt%2FClient%2FShared%2FAppsApi.ts&version=GBdev&_a=contents
        const deployment: DeploymentResource = await this.client.deployments.beginCreateOrUpdateAndWait(this.service.resourceGroup, this.service.name, this.name, name, {
            properties: {
                active: true,
                source,
                deploymentSettings: {
                    resourceRequests: {
                        memory: await this.service.isConsumptionTier() ? '2Gi' : '1Gi',
                        cpu: '1'
                    }
                },
            },
            sku: {
                capacity: 1,
                // When PUT a deployment, the Sku.tier and Sku.name are required but ignored by service side.
                // Hard code these un-used required properties.
                // https://msazure.visualstudio.com/AzureDMSS/_workitems/edit/8082098/
                tier: 'Standard',
                name: 'S0',
            }
        });
        ext.outputChannel.appendLog(`[Deployment] new deployment (${name}) of app (${this.name}) is created.`);
        return new EnhancedDeployment(this, deployment);
    }

    public async startDeployment(name: string): Promise<void> {
        ext.outputChannel.appendLog(`[Deployment] starting deployment (${name}) of app (${this.name}).`);
        await this.client.deployments.beginStartAndWait(this.service.resourceGroup, this.service.name, this.name, name);
        ext.outputChannel.appendLog(`[Deployment] deployment (${name}) of app (${this.name}) is started.`);
    }

    public async getTestKeys(): Promise<TestKeys> {
        return await this.client.services.listTestKeys(this.service.resourceGroup, this.service.name);
    }

    public async getTestEndpoint(): Promise<string | undefined> {
        if (await this.service.isConsumptionTier()) {
            throw new Error(`Test endpoint is not supported for apps of consumption plan.`);
        }
        const testKeys: TestKeys | undefined = await this.getTestKeys();
        return `${testKeys.primaryTestEndpoint}/${this.name}/default`;
    }

    public async getPublicEndpoint(): Promise<string | undefined> {
        const p = await this.properties;
        if (p?.url && p?.url !== 'None') {
            return p?.url;
        }
        return undefined;
    }

    public async setPublic(isPublic: boolean): Promise<void> {
        ext.outputChannel.appendLog(`[App] setting app (${this.name}) public.`);
        this._remote = this.client.apps.beginCreateOrUpdateAndWait(this.service.resourceGroup, this.service.name, this.name, {
            properties: { public: isPublic }
        });
        ext.outputChannel.appendLog(`[App] app (${this.name}) is set public.`);
    }

    public async togglePublic(): Promise<void> {
        const isPublic: boolean = (await this.properties)?.public ?? false;
        await this.setPublic(!isPublic);
    }

    public async getUploadDefinition(): Promise<ResourceUploadDefinition> {
        return this.client.apps.getResourceUploadUrl(this.service.resourceGroup, this.service.name, this.name);
    }

    public async getLiveViewUrl(): Promise<string | undefined> {
        const url: string | undefined = await this.service.getLiveViewUrl();
        return url ? `${url}/apps/${this.name}` : undefined;
    }

    public async uploadArtifact(path: string): Promise<string | undefined> {
        const uploadDefinition: ResourceUploadDefinition = await this.getUploadDefinition();
        if (!uploadDefinition.uploadUrl) {
            throw new Error(`faild to get upload url of app ${this.name}.`);
        }
        ext.outputChannel.appendLog(`[App] uploading artifact (${path}) to app ${this.name}.`);
        const fileClient: ShareFileClient = new ShareFileClient(uploadDefinition.uploadUrl, new AnonymousCredential());
        await fileClient.uploadFile(path);
        ext.outputChannel.appendLog(`[App] artifact (${path}) is uploaded to app ${this.name}.`);
        return uploadDefinition.relativePath;
    }

    public async enqueueBuild(relativePath: string): Promise<string | undefined> {
        const build: Build = await this.client.buildServiceOperations.createOrUpdateBuild(this.service.resourceGroup, this.service.name, EnhancedApp.DEFAULT_TANZU_COMPONENT_NAME, this.name, {
            properties: {
                builder: `${this.service.id}/buildservices/${EnhancedApp.DEFAULT_TANZU_COMPONENT_NAME}/builders/${EnhancedApp.DEFAULT_TANZU_COMPONENT_NAME}`,
                agentPool: `${this.service.id}/buildservices/${EnhancedApp.DEFAULT_TANZU_COMPONENT_NAME}/agentPools/${EnhancedApp.DEFAULT_TANZU_COMPONENT_NAME}`,
                relativePath
            }
        });
        const buildResultId: string | undefined = build.properties?.triggeredBuildResult?.id;
        const buildResultName: string | undefined = build.properties?.triggeredBuildResult?.id?.split('/').pop();
        let status: BuildResultProvisioningState | undefined;
        const start: number = Date.now();
        while (status !== 'Succeeded') {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const result: BuildResult = await this.client.buildServiceOperations.getBuildResult(this.service.resourceGroup, this.service.name, EnhancedApp.DEFAULT_TANZU_COMPONENT_NAME, this.name, buildResultName!);
            status = result.properties?.provisioningState;
            if (status === 'Succeeded') {
                break;
            } else if (status === 'Queuing' || status === 'Building') {
                if (Date.now() - start > 60000 * 60) {
                    throw new Error(`Build timeout for buildId: ${buildResultId}`);
                }
                // tslint:disable-next-line no-string-based-set-timeout
                await new Promise(r => setTimeout(r, 10000)); // wait for 10 seconds
            } else {
                throw new Error(`Build failed for buildId: ${buildResultId}`);
            }
        }
        return build.properties?.triggeredBuildResult?.id;
    }
}
