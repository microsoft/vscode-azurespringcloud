/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppPlatformManagementClient, AppResource, Build, BuildResult, BuildResultProvisioningState, DeploymentResource, KnownSupportedRuntimeValue, ResourceUploadDefinition, TestKeys, UserSourceInfoUnion } from "@azure/arm-appplatform";
import { DeploymentInstance } from "@azure/arm-appplatform/src/models/index";
import { AnonymousCredential, ShareFileClient } from "@azure/storage-file-share";
import { IActionContext } from "../../extension.bundle";
import { EnhancedApp, IApp, IDeployment } from "../model";
import { localize } from "../utils";
import { startStreamingLogs, stopStreamingLogs } from "./streamlog/streamingLog";

export class AppService {
    public static readonly DEFAULT_RUNTIME: KnownSupportedRuntimeValue = KnownSupportedRuntimeValue.Java8;
    public static readonly DEFAULT_DEPLOYMENT: string = 'default';
    public static readonly DEFAULT_TANZU_COMPONENT_NAME: string = 'default';

    private readonly client: AppPlatformManagementClient;
    private readonly target: IApp | undefined;

    public constructor(client: AppPlatformManagementClient, app?: IApp) {
        this.client = client;
        this.target = app;
    }

    public enhanceApp(app: IApp): EnhancedApp {
        const appService: AppService = new AppService(this.client, app);
        return Object.assign(appService, app);
    }

    public async start(app?: IApp): Promise<void> {
        const target: IApp = this.getTarget(app);
        const activeDeploymentName: string | undefined = (await this.getActiveDeployment(app))?.name;
        await this.client.deployments.beginStartAndWait(target.service.resourceGroup, target.service.name, target.name, activeDeploymentName!);
    }

    public async stop(app?: IApp): Promise<void> {
        const target: IApp = this.getTarget(app);
        const activeDeploymentName: string | undefined = (await this.getActiveDeployment(app))?.name;
        await this.client.deployments.beginStopAndWait(target.service.resourceGroup, target.service.name, target.name, activeDeploymentName!);
    }

    public async restart(app?: IApp): Promise<void> {
        const target: IApp = this.getTarget(app);
        const activeDeploymentName: string | undefined = (await this.getActiveDeployment(app))?.name;
        await this.client.deployments.beginRestartAndWait(target.service.resourceGroup, target.service.name, target.name, activeDeploymentName!);
    }

    public async remove(app?: IApp): Promise<void> {
        const target: IApp = this.getTarget(app);
        await this.client.apps.beginDeleteAndWait(target.service.resourceGroup, target.service.name, target.name);
    }

    public async reload(app?: IApp): Promise<IApp> {
        const target: IApp = this.getTarget(app);
        const resouce: AppResource = await this.client.apps.get(target.service.resourceGroup, target.service.name, target.name);
        return IApp.fromResource(resouce, target.service);
    }

    public async getDeployments(app?: IApp): Promise<IDeployment[]> {
        const target: IApp = this.getTarget(app);
        const deployments: DeploymentResource[] = [];
        const pagedResources: AsyncIterable<DeploymentResource> = this.client.deployments.list(target.service.resourceGroup, target.service.name, target.name);
        for await (const deployment of pagedResources) {
            deployments.push(deployment);
        }
        return deployments.map(a => IDeployment.fromResource(a, target));
    }

    public async getActiveDeployment(app?: IApp): Promise<IDeployment | undefined> {
        return (await this.getDeployments(app)).find(d => d.properties?.active);
    }

    public async setActiveDeployment(deploymentName: string, app?: IApp): Promise<void> {
        const target: IApp = this.getTarget(app);
        await this.client.apps.beginSetActiveDeploymentsAndWait(target.service.resourceGroup, target.service.name, target.name, {
            activeDeploymentNames: [deploymentName]
        });
    }

    public async createDeployment(name: string, runtime: KnownSupportedRuntimeValue, app?: IApp): Promise<IDeployment> {
        const target: IApp = this.getTarget(app);
        let source: UserSourceInfoUnion | undefined;
        if (target.service.sku?.name?.toLowerCase().startsWith('e')) {
            source = { type: 'BuildResult', buildResultId: '<default>' };
        } else {
            source = { type: 'Jar', relativePath: '<default>', runtimeVersion: runtime ?? AppService.DEFAULT_RUNTIME };
        }
        // refer: https://dev.azure.com/msazure/AzureDMSS/_git/AzureDMSS-PortalExtension?path=%2Fsrc%2FSpringCloudPortalExt%2FClient%2FShared%2FAppsApi.ts&version=GBdev&_a=contents
        await this.client.deployments.beginCreateOrUpdateAndWait(target.service.resourceGroup, target.service.name, target.name, name, {
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
        const deployment: DeploymentResource = await this.client.deployments.get(target.service.resourceGroup, target.service.name, target.name, name);
        return IDeployment.fromResource(deployment, target);
    }

    public async startDeployment(name: string, app?: IApp): Promise<void> {
        const target: IApp = this.getTarget(app);
        await this.client.deployments.beginStartAndWait(target.service.resourceGroup, target.service.name, target.name, name);
    }

    public async getTestKeys(app?: IApp): Promise<TestKeys> {
        const target: IApp = this.getTarget(app);
        return await this.client.services.listTestKeys(target.service.resourceGroup, target.service.name);
    }

    public async getTestEndpoint(app?: IApp): Promise<string | undefined> {
        const target: IApp = this.getTarget(app);
        const testKeys: TestKeys | undefined = await this.getTestKeys(app);
        return `${testKeys.primaryTestEndpoint}/${target.name}/default`;
    }

    public async getPublicEndpoint(app?: IApp): Promise<string | undefined> {
        const target: IApp = this.getTarget(app);
        if (target.properties?.url && target.properties?.url !== 'None') {
            return target.properties?.url;
        }
        return undefined;
    }

    public async setPublic(isPublic: boolean, app?: IApp): Promise<void> {
        const target: IApp = this.getTarget(app);
        await this.client.apps.beginCreateOrUpdateAndWait(target.service.resourceGroup, target.service.name, target.name, {
            properties: { public: isPublic }
        });
    }

    public async getUploadDefinition(app?: IApp): Promise<ResourceUploadDefinition> {
        const target: IApp = this.getTarget(app);
        return this.client.apps.getResourceUploadUrl(target.service.resourceGroup, target.service.name, target.name);
    }

    public async uploadArtifact(path: string, app?: IApp): Promise<string | undefined> {
        const target: IApp = this.getTarget(app);
        const uploadDefinition: ResourceUploadDefinition = await this.getUploadDefinition(target);
        const fileClient: ShareFileClient = new ShareFileClient(uploadDefinition.uploadUrl!, new AnonymousCredential());
        await fileClient.uploadFile(path);
        return uploadDefinition.relativePath;
    }

    public async enqueueBuild(relativePath: string, app?: IApp): Promise<string | undefined> {
        const target: IApp = this.getTarget(app);
        const build: Build = await this.client.buildServiceOperations.createOrUpdateBuild(target.service.resourceGroup, target.service.name, AppService.DEFAULT_TANZU_COMPONENT_NAME, target.name, {
            properties: {
                builder: `${target.service.id}/buildservices/${AppService.DEFAULT_TANZU_COMPONENT_NAME}/builders/${AppService.DEFAULT_TANZU_COMPONENT_NAME}`,
                agentPool: `${target.service.id}/buildservices/${AppService.DEFAULT_TANZU_COMPONENT_NAME}/agentPools/${AppService.DEFAULT_TANZU_COMPONENT_NAME}`,
                relativePath
            }
        });
        const buildResultId: string | undefined = build.properties?.triggeredBuildResult?.id;
        const buildResultName: string | undefined = build.properties?.triggeredBuildResult?.id?.split('/').pop()!;
        let status: BuildResultProvisioningState | undefined;
        const start: number = Date.now();
        while (status !== 'Succeeded') {
            const result: BuildResult = await this.client.buildServiceOperations.getBuildResult(target.service.resourceGroup, target.service.name, AppService.DEFAULT_TANZU_COMPONENT_NAME, target.name, buildResultName);
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

    public async startStreamingLogs(context: IActionContext, instance: DeploymentInstance, app?: IApp): Promise<void> {
        const target: IApp = this.getTarget(app);
        if (instance.status !== 'Running') {
            throw new Error(localize('instanceNotRunning', 'Selected instance is not running.'));
        }
        const testKey: TestKeys = await this.getTestKeys(target);
        await startStreamingLogs(context, target.name, testKey, instance);
    }

    public async stopStreamingLogs(instance: DeploymentInstance, app?: IApp): Promise<void> {
        const target: IApp = this.getTarget(app);
        await stopStreamingLogs(target.name, instance);
    }

    private getTarget(app?: IApp): IApp {
        // @ts-ignore
        return app ?? this.target;
    }
}
