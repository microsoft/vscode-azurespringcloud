/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppPlatformManagementClient, AppResource, AppResourceProperties, Build, BuildResult, BuildResultProvisioningState, DeploymentInstance, DeploymentResource, KnownSupportedRuntimeValue, ResourceUploadDefinition, TestKeys, UserSourceInfoUnion } from "@azure/arm-appplatform";
import { AnonymousCredential, ShareFileClient } from "@azure/storage-file-share";
import { IActionContext } from "../../extension.bundle";
import { localize } from "../utils";
import { EnhancedDeployment } from "./EnhancedDeployment";
import { EnhancedService } from "./EnhancedService";
import { startStreamingLogs, stopStreamingLogs } from "./streamlog/streamingLog";

export class EnhancedApp {
    public static readonly DEFAULT_RUNTIME: KnownSupportedRuntimeValue = KnownSupportedRuntimeValue.Java8;
    public static readonly DEFAULT_DEPLOYMENT: string = 'default';
    public static readonly DEFAULT_TANZU_COMPONENT_NAME: string = 'default';

    public readonly name: string;
    public readonly id: string;
    public readonly service: EnhancedService;
    private _remote: AppResource;
    private activeDeployment: EnhancedDeployment | undefined;

    public constructor(service: EnhancedService, resource: AppResource) {
        this.name = resource.name!;
        this.id = resource.id!;
        this.service = service;
        this._remote = resource;
        this.getActiveDeployment();
    }

    public get properties(): AppResourceProperties | undefined {
        return this._remote.properties;
    }

    get client(): AppPlatformManagementClient {
        return this.service.client;
    }

    public async getStatus(): Promise<string> {
        const activeDeployment: EnhancedDeployment | undefined = await this.getActiveDeployment();
        let _status: string = ((activeDeployment?.properties?.status ||
            activeDeployment?.properties?.provisioningState ||
            this.properties?.provisioningState) ?? 'Unknown').toLowerCase();
        if (_status.endsWith('ing') && _status !== 'running') {
            _status = 'pending';
        }
        if (_status == 'succeeded') { // inactive
            _status = 'unknown';
        }
        return _status;
    }

    public async start(): Promise<void> {
        const activeDeploymentName: string | undefined = (await this.getActiveDeployment())?.name;
        await this.client.deployments.beginStartAndWait(this.service.resourceGroup, this.service.name, this.name, activeDeploymentName!);
    }

    public async stop(): Promise<void> {
        const activeDeploymentName: string | undefined = (await this.getActiveDeployment())?.name;
        await this.client.deployments.beginStopAndWait(this.service.resourceGroup, this.service.name, this.name, activeDeploymentName!);
    }

    public async restart(): Promise<void> {
        const activeDeploymentName: string | undefined = (await this.getActiveDeployment())?.name;
        await this.client.deployments.beginRestartAndWait(this.service.resourceGroup, this.service.name, this.name, activeDeploymentName!);
    }

    public async remove(): Promise<void> {
        await this.client.apps.beginDeleteAndWait(this.service.resourceGroup, this.service.name, this.name);
    }

    public async refresh(): Promise<EnhancedApp> {
        this._remote = await this.client.apps.get(this.service.resourceGroup, this.service.name, this.name);
        await this.getActiveDeployment(true);
        return this;
    }

    public async getDeployments(): Promise<EnhancedDeployment[]> {
        const deployments: DeploymentResource[] = [];
        const pagedResources: AsyncIterable<DeploymentResource> = this.client.deployments.list(this.service.resourceGroup, this.service.name, this.name);
        for await (const deployment of pagedResources) {
            deployments.push(deployment);
        }
        return deployments.map(a => new EnhancedDeployment(this, a));
    }

    public async getActiveDeployment(force: boolean = false): Promise<EnhancedDeployment | undefined> {
        if (force || !this.activeDeployment) {
            this.activeDeployment = (await this.getDeployments()).find(d => d.properties?.active);
        }
        return this.activeDeployment;
    }

    public async setActiveDeployment(deploymentName: string): Promise<void> {
        this._remote = await this.client.apps.beginSetActiveDeploymentsAndWait(this.service.resourceGroup, this.service.name, this.name, {
            activeDeploymentNames: [deploymentName]
        });
    }

    public async createDeployment(name: string, runtime?: KnownSupportedRuntimeValue): Promise<EnhancedDeployment> {
        let source: UserSourceInfoUnion | undefined;
        if (this.service.sku?.name?.toLowerCase().startsWith('e')) {
            source = { type: 'BuildResult', buildResultId: '<default>' };
        } else {
            source = { type: 'Jar', relativePath: '<default>', runtimeVersion: runtime ?? EnhancedApp.DEFAULT_RUNTIME };
        }
        // refer: https://dev.azure.com/msazure/AzureDMSS/_git/AzureDMSS-PortalExtension?path=%2Fsrc%2FSpringCloudPortalExt%2FClient%2FShared%2FAppsApi.ts&version=GBdev&_a=contents
        const deployment: DeploymentResource = await this.client.deployments.beginCreateOrUpdateAndWait(this.service.resourceGroup, this.service.name, this.name, name, {
            properties: {
                source,
                deploymentSettings: {
                    resourceRequests: {
                        memory: '1Gi',
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
        return new EnhancedDeployment(this, deployment);
    }

    public async startDeployment(name: string): Promise<void> {
        await this.client.deployments.beginStartAndWait(this.service.resourceGroup, this.service.name, this.name, name);
    }

    public async getTestKeys(): Promise<TestKeys> {
        return await this.client.services.listTestKeys(this.service.resourceGroup, this.service.name);
    }

    public async getTestEndpoint(): Promise<string | undefined> {
        const testKeys: TestKeys | undefined = await this.getTestKeys();
        return `${testKeys.primaryTestEndpoint}/${this.name}/default`;
    }

    public async getPublicEndpoint(): Promise<string | undefined> {
        if (this.properties?.url && this.properties?.url !== 'None') {
            return this.properties?.url;
        }
        return undefined;
    }

    public async setPublic(isPublic: boolean): Promise<void> {
        this._remote = await this.client.apps.beginCreateOrUpdateAndWait(this.service.resourceGroup, this.service.name, this.name, {
            properties: { public: isPublic }
        });
    }

    public async togglePublic(): Promise<void> {
        const isPublic: boolean = this.properties?.public ?? false;
        await this.setPublic(!isPublic);
    }

    public async getUploadDefinition(): Promise<ResourceUploadDefinition> {
        return this.client.apps.getResourceUploadUrl(this.service.resourceGroup, this.service.name, this.name);
    }

    public async uploadArtifact(path: string): Promise<string | undefined> {
        const uploadDefinition: ResourceUploadDefinition = await this.getUploadDefinition();
        const fileClient: ShareFileClient = new ShareFileClient(uploadDefinition.uploadUrl!, new AnonymousCredential());
        await fileClient.uploadFile(path);
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
        const buildResultName: string | undefined = build.properties?.triggeredBuildResult?.id?.split('/').pop()!;
        let status: BuildResultProvisioningState | undefined;
        const start: number = Date.now();
        while (status !== 'Succeeded') {
            const result: BuildResult = await this.client.buildServiceOperations.getBuildResult(this.service.resourceGroup, this.service.name, EnhancedApp.DEFAULT_TANZU_COMPONENT_NAME, this.name, buildResultName);
            status = result.properties?.provisioningState;
            if (status === 'Queuing' || status === 'Building') {
                if (Date.now() - start > 60000 * 60) {
                    throw new Error(`Build timeout for buildId: ${buildResultId}`);
                }
                // tslint:disable-next-line no-string-based-set-timeout
                await new Promise(r => setTimeout(r, 10000)); // wait for 10 seconds
                continue;
            } else {
                throw new Error(`Build failed for buildId: ${buildResultId}`);
            }
        }
        return build.properties?.triggeredBuildResult?.id;
    }

    public async startStreamingLogs(context: IActionContext, instance: DeploymentInstance): Promise<void> {
        if (instance.status !== 'Running') {
            throw new Error(localize('instanceNotRunning', 'Selected instance is not running.'));
        }
        const testKey: TestKeys = await this.getTestKeys();
        await startStreamingLogs(context, this.name, testKey, instance);
    }

    public async stopStreamingLogs(instance: DeploymentInstance): Promise<void> {
        await stopStreamingLogs(this.name, instance);
    }
}
