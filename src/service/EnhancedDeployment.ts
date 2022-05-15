/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppPlatformManagementClient, DeploymentResource, DeploymentResourceProperties, DeploymentSettings, JarUploadedUserSourceInfo, ResourceRequests, Sku } from "@azure/arm-appplatform";
import { IScaleSettings } from "../model";
import { localize } from "../utils";
import { EnhancedApp } from "./EnhancedApp";

export class EnhancedDeployment {
    private static readonly VALID_ENV_VAR_KEY: RegExp = /^[a-zA-Z_][\w.-]*$/;
    private static readonly DEFAULT_DEPLOYMENT_NAME: string = 'default';

    public readonly name: string;
    public readonly id: string;
    public readonly app: EnhancedApp;
    private _remote: DeploymentResource;

    public constructor(app: EnhancedApp, resource: DeploymentResource) {
        this.name = resource.name!;
        this.id = resource.id!;
        this.app = app;
        this.setRemote(resource);
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

    public get properties(): DeploymentResourceProperties | undefined {
        return this._remote.properties;
    }

    private get client(): AppPlatformManagementClient {
        return this.app.client;
    }

    public async refresh(): Promise<EnhancedDeployment> {
        const resource: DeploymentResource = await this.client.deployments.get(this.app.service.resourceGroup, this.app.service.name, this.app.name, this.name);
        this.setRemote(resource);
        return this;
    }

    public async updateArtifactPath(relativePathOrBuildId: string): Promise<void> {
        let properties: DeploymentResourceProperties | undefined;
        if (this.app.service.isEnterpriseTier()) {
            properties = {
                source: { type: 'BuildResult', buildResultId: relativePathOrBuildId }
            };
        } else {
            properties = {
                source: { type: 'Jar', relativePath: relativePathOrBuildId }
            };
        }
        await this.client.deployments.beginUpdateAndWait(this.app.service.resourceGroup, this.app.service.name, this.app.name,
                                                         this.name || EnhancedDeployment.DEFAULT_DEPLOYMENT_NAME, { properties });
        this.refresh();
    }

    public async updateScaleSettings(settings: IScaleSettings): Promise<void> {
        const rawMem: number = settings.memory ?? 1;
        const rawCpu: number = settings.cpu ?? 1;
        const sku: Sku | undefined = this.app.service.sku;
        const cpu: string = rawCpu < 1 ? `${rawCpu * 1000}m` : `${Math.floor(rawCpu)}`;
        const memory: string = rawMem < 1 ? `${rawMem * 1024}Mi` : `${Math.floor(rawMem)}Gi`;
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
        await this.client.deployments.beginUpdateAndWait(this.app.service.resourceGroup, this.app.service.name, this.app.name, this.name, resource);
        this.refresh();
    }

    public async updateEnvironmentVariables(environmentVariables: { [p: string]: string }): Promise<void> {
        await this.client.deployments.beginUpdateAndWait(this.app.service.resourceGroup, this.app.service.name, this.app.name, this.name, {
            properties: { deploymentSettings: { environmentVariables } }
        });
        this.refresh();
    }

    public getJvmOptions(): string {
        const enterpriseOptionsStr: string | undefined = this.properties?.deploymentSettings?.environmentVariables?.JAVA_OPTS;
        const oldOptionsStr: string | undefined = (<JarUploadedUserSourceInfo>this.properties?.source)?.jvmOptions;
        return enterpriseOptionsStr ?? oldOptionsStr?.trim() ?? '';
    }

    public async updateJvmOptions(jvmOptions: string): Promise<void> {
        if (this.app.service.isEnterpriseTier()) {
            const environmentVariables: { [p: string]: string } = this.properties?.deploymentSettings?.environmentVariables ?? {};
            environmentVariables.JAVA_OPTS = jvmOptions;
            await this.client.deployments.beginUpdateAndWait(this.app.service.resourceGroup, this.app.service.name, this.app.name, this.name, {
                properties: { deploymentSettings: { environmentVariables } }
            });
        } else {
            await this.client.deployments.beginUpdateAndWait(this.app.service.resourceGroup, this.app.service.name, this.app.name, this.name, {
                //@ts-ignore
                properties: {
                    source: {
                        type: 'Jar',
                        jvmOptions
                    }
                }
            });
        }
        this.refresh();
    }

    public getScaleSettings(): IScaleSettings {
        const settings: DeploymentSettings | undefined = this.properties?.deploymentSettings;
        const resourceRequests: ResourceRequests | undefined = settings?.resourceRequests;
        const cpu: number = resourceRequests?.cpu ? (resourceRequests?.cpu?.endsWith('m') ?
            parseInt(resourceRequests?.cpu) / 1000 :
            parseInt(resourceRequests?.cpu)) : 1;
        const memory: number = resourceRequests?.memory ? (resourceRequests?.memory?.endsWith('Mi') ?
            parseInt(resourceRequests?.memory) / 1024 :
            parseInt(resourceRequests?.memory)) : 1;
        return { cpu, memory, capacity: this.properties?.instances?.length ?? 0 };
    }

    private setRemote(resource: DeploymentResource): void {
        this._remote = resource;
    }
}
