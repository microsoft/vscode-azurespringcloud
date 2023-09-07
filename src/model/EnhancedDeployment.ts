// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AppPlatformManagementClient, DeploymentResource, DeploymentResourceProperties, DeploymentSettings, JarUploadedUserSourceInfo, RemoteDebugging, ResourceRequests, Sku } from "@azure/arm-appplatform";
import { ext } from "../extensionVariables";
import { IScaleSettings } from "../model";
import { localize } from "../utils";
import { EnhancedApp } from "./EnhancedApp";
import { EnhancedInstance } from "./EnhancedInstance";

export class EnhancedDeployment {
    private static readonly VALID_ENV_VAR_KEY: RegExp = /^[a-zA-Z_][\w.-]*$/;
    private static readonly DEFAULT_DEPLOYMENT_NAME: string = 'default';

    public readonly name: string;
    public readonly id: string;
    public readonly app: EnhancedApp;
    private _remote: Promise<DeploymentResource>;

    public constructor(app: EnhancedApp, resource: DeploymentResource) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.name = resource.name!;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.id = resource.id!;
        this.app = app;
        this._remote = Promise.resolve(resource);
    }

    get runtimeVersion(): Promise<string | undefined> {
        return this.properties.then(p => p?.source as JarUploadedUserSourceInfo).then(s => s.runtimeVersion);
    }

    public static validateKey(v: string): string | undefined {
        if (!v.trim()) {
            return localize("emptyEnvVarKey", `The key can not be empty.`);
        } else if (!EnhancedDeployment.VALID_ENV_VAR_KEY.test(v)) {
            return localize("invalidEnvVarKey", `
                        Keys must start with a letter or an underscore(_).
                        Keys may only contain letters, numbers, periods(.), and underscores(_).
                    `);
        } else if (v.trim().length > 4000) {
            return localize("maxLength", `The maximum length is {0} characters.`, 4000);
        }
        return undefined;
    }

    public static validateVal(v: string): string | undefined {
        if (!v.trim()) {
            return localize("emptyEnvVarVal", `The value can not be empty.`);
        } else if (v.trim().length > 4000) {
            return localize("maxLength", `The maximum length is {0} characters.`, 4000);
        }
        return undefined;
    }

    public get properties(): Promise<DeploymentResourceProperties | undefined> {
        return this._remote.then(r => r.properties);
    }

    private get client(): AppPlatformManagementClient {
        return this.app.client;
    }

    public get instances(): Promise<EnhancedInstance[]> {
        return this.properties.then(p => p?.instances).then(instances => instances?.map(instance => new EnhancedInstance(this, instance)) ?? []);
    }

    public get latestInstance(): Promise<EnhancedInstance> {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.instances.then(s => s.reduce((prev, current) => (prev.startTime! > current.startTime!) ? prev : current));
    }

    public get remote(): Promise<DeploymentResource> {
        return this._remote;
    }

    public async refresh(): Promise<EnhancedDeployment> {
        this._remote = this.client.deployments.get(this.app.service.resourceGroup, this.app.service.name, this.app.name, this.name);
        return Promise.all([this._remote]).then(() => this);
    }

    public async updateArtifactPath(relativePathOrBuildId: string): Promise<void> {
        let properties: DeploymentResourceProperties | undefined;
        if (await this.app.service.isEnterpriseTier()) {
            properties = {
                source: { type: 'BuildResult', buildResultId: relativePathOrBuildId }
            };
        } else {
            properties = {
                source: { type: 'Jar', relativePath: relativePathOrBuildId }
            };
        }
        ext.outputChannel.appendLog(`[Deployment] update artifact path of deployment (${this.name}) to ${relativePathOrBuildId}.`);
        this._remote = this.client.deployments.beginUpdateAndWait(this.app.service.resourceGroup, this.app.service.name, this.app.name,
            this.name || EnhancedDeployment.DEFAULT_DEPLOYMENT_NAME, { properties });
        ext.outputChannel.appendLog(`[Deployment] artifact path of deployment (${this.name}) is updated.`);
    }

    public async updateScaleSettings(settings: IScaleSettings): Promise<void> {
        const rawMem: number = settings.memory ?? 1;
        const rawCpu: number = settings.cpu ?? 1;
        const sku: Sku | undefined = await this.app.service.sku;
        const cpu: string = `${rawCpu * 1000}m`;
        const memory: string = `${rawMem * 1024}Mi`;
        const resource: DeploymentResource = {
            properties: {
                deploymentSettings: {
                    resourceRequests: { cpu, memory }
                }
            },
            sku: {
                ...sku, capacity: settings.capacity ?? sku?.capacity
            }
        };
        if (await this.app.service.isConsumptionTier()) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            resource.properties!.deploymentSettings!.scale = {
                minReplicas: (await this.properties)?.deploymentSettings?.scale?.minReplicas ?? 1,
                maxReplicas: settings.capacity ?? sku?.capacity ?? 10
            }
        }
        ext.outputChannel.appendLog(`[Deployment] update scale settings of deployment (${this.name}).`);
        this._remote = this.client.deployments.beginUpdateAndWait(this.app.service.resourceGroup, this.app.service.name, this.app.name, this.name, resource);
        ext.outputChannel.appendLog(`[Deployment] scale settings of deployment (${this.name}) is updated.`);
    }

    public async updateEnvironmentVariables(environmentVariables: { [p: string]: string }): Promise<void> {
        ext.outputChannel.appendLog(`[Deployment] update environment variables of deployment (${this.name}).`);
        this._remote = this.client.deployments.beginUpdateAndWait(this.app.service.resourceGroup, this.app.service.name, this.app.name, this.name, {
            properties: { deploymentSettings: { environmentVariables } }
        });
        ext.outputChannel.appendLog(`[Deployment] environment variables of deployment (${this.name}) is updated.`);
    }

    public async getJvmOptions(): Promise<string> {
        const enterpriseOptionsStr: string | undefined = (await this.properties)?.deploymentSettings?.environmentVariables?.JAVA_OPTS;
        const oldOptionsStr: string | undefined = (<JarUploadedUserSourceInfo>(await this.properties)?.source)?.jvmOptions;
        return enterpriseOptionsStr ?? oldOptionsStr?.trim() ?? '';
    }

    public async updateJvmOptions(jvmOptions: string): Promise<void> {
        ext.outputChannel.appendLog(`[Deployment] update JVM options of deployment (${this.name}).`);
        if (await this.app.service.isEnterpriseTier()) {
            const environmentVariables: { [p: string]: string } = (await this.properties)?.deploymentSettings?.environmentVariables ?? {};
            environmentVariables.JAVA_OPTS = jvmOptions;
            this._remote = this.client.deployments.beginUpdateAndWait(this.app.service.resourceGroup, this.app.service.name, this.app.name, this.name, {
                properties: { deploymentSettings: { environmentVariables } }
            });
        } else {
            this._remote = this.client.deployments.beginUpdateAndWait(this.app.service.resourceGroup, this.app.service.name, this.app.name, this.name, {
                properties: {
                    source: {
                        type: 'Jar',
                        jvmOptions
                    }
                }
            });
        }
        ext.outputChannel.appendLog(`[Deployment] JVM options of deployment (${this.name}) is updated.`);
    }

    public async getScaleSettings(): Promise<IScaleSettings> {
        const settings: DeploymentSettings | undefined = (await this.properties)?.deploymentSettings;
        const resourceRequests: ResourceRequests | undefined = settings?.resourceRequests;
        const cpu: number = resourceRequests?.cpu ? (resourceRequests?.cpu?.endsWith('m') ?
            parseInt(resourceRequests?.cpu) / 1000 :
            parseInt(resourceRequests?.cpu)) : 1;
        const memory: number = resourceRequests?.memory ? (resourceRequests?.memory?.endsWith('Mi') ?
            parseInt(resourceRequests?.memory) / 1024 :
            parseInt(resourceRequests?.memory)) : 1;
        const capacity: number = await this.app.service.isConsumptionTier() ?
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            (await this.properties)?.deploymentSettings?.scale?.maxReplicas as number ?? 0 :
            (await this.properties)?.instances?.length ?? 0
        return { cpu, memory, capacity };
    }

    public async getDebuggingConfig(): Promise<RemoteDebugging | undefined> {
        if (await this.app.service.isConsumptionTier()) {
            return undefined;
        }
        return this.client.deployments.getRemoteDebuggingConfig(this.app.service.resourceGroup, this.app.service.name, this.app.name, this.name);
    }

    public async enableDebugging(port: number = 5005): Promise<RemoteDebugging> {
        ext.outputChannel.appendLog(`[Deployment] enable remote debugging of deployment (${this.name}).`);
        return this.client.deployments.beginEnableRemoteDebuggingAndWait(this.app.service.resourceGroup, this.app.service.name, this.app.name, this.name, {
            remoteDebuggingPayload: { port }
        });
    }

    public async disableDebugging(): Promise<void> {
        ext.outputChannel.appendLog(`[Deployment] disable remote debugging of deployment (${this.name}).`);
        await this.client.deployments.beginDisableRemoteDebuggingAndWait(this.app.service.resourceGroup, this.app.service.name, this.app.name, this.name);
    }
}
