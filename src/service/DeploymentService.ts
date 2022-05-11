/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppPlatformManagementClient, DeploymentResource, DeploymentSettings, JarUploadedUserSourceInfo, ResourceRequests, Sku } from "@azure/arm-appplatform";
import { IDeployment, IScaleSettings } from "../model";
import { localize } from "../utils";

export class DeploymentService {
    private static readonly VALID_ENV_VAR_KEY: RegExp = /^[a-zA-Z_][\w.-]*$/;
    private static readonly DEFAULT_DEPLOYMENT_NAME: string = 'default';
    private readonly target: IDeployment | undefined;
    private readonly client: AppPlatformManagementClient;

    constructor(client: AppPlatformManagementClient, deployment?: IDeployment) {
        this.client = client;
        this.target = deployment;
    }

    public static validateKey(v: string): string | undefined {
        if (!v.trim()) {
            return localize("emptyEnvVarKey", `The key can not be empty.`);
        } else if (!DeploymentService.VALID_ENV_VAR_KEY.test(v)) {
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

    public async reload(deployment?: IDeployment): Promise<IDeployment> {
        const target: IDeployment = this.getTarget(deployment);
        const resource: DeploymentResource = await this.client.deployments.get(target.app.service.resourceGroup, target.app.service.name, target.app.name, target.name);
        return IDeployment.fromResource(resource, target.app);
    }

    public async updateArtifactPath(path: string, deployment?: IDeployment): Promise<void> {
        const target: IDeployment = this.getTarget(deployment);
        await this.client.deployments.beginUpdateAndWait(target.app.service.resourceGroup, target.app.service.name, target.app.name, target.name || DeploymentService.DEFAULT_DEPLOYMENT_NAME, {
            properties: {
                source: {
                    type: 'Jar',
                    relativePath: path
                },
            }
        });
    }

    public async updateScaleSettings(settings: IScaleSettings, deployment?: IDeployment): Promise<void> {
        const target: IDeployment = this.getTarget(deployment);
        const rawMem: number = settings.memory ?? 1;
        const rawCpu: number = settings.cpu ?? 1;
        const sku: Sku | undefined = target.sku;
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
        await this.client.deployments.beginUpdateAndWait(target.app.service.resourceGroup, target.app.service.name, target.app.name, target.name, resource);
    }

    public async updateEnvironmentVariables(environmentVariables: { [p: string]: string }, deployment?: IDeployment): Promise<void> {
        const target: IDeployment = this.getTarget(deployment);
        await this.client.deployments.beginUpdateAndWait(target.app.service.resourceGroup, target.app.service.name, target.app.name, target.name, {
            properties: { deploymentSettings: { environmentVariables } }
        });
    }

    public getJvmOptions(deployment?: IDeployment): string {
        const target: IDeployment = this.getTarget(deployment);
        const enterpriseOptionsStr: string | undefined = target.properties?.deploymentSettings?.environmentVariables?.JAVA_OPTS;
        const oldOptionsStr: string | undefined = (<JarUploadedUserSourceInfo>target.properties?.source)?.jvmOptions;
        return enterpriseOptionsStr ?? oldOptionsStr?.trim() ?? '';
    }

    public async updateJvmOptions(jvmOptions: string, deployment?: IDeployment): Promise<void> {
        const target: IDeployment = this.getTarget(deployment);
        if (target?.sku?.name?.toLowerCase().startsWith('e')) {
            const environmentVariables: { [p: string]: string } = target.properties?.deploymentSettings?.environmentVariables ?? {};
            environmentVariables.JAVA_OPTS = jvmOptions;
            await this.client.deployments.beginUpdateAndWait(target.app.service.resourceGroup, target.app.service.name, target.app.name, target.name, {
                properties: { deploymentSettings: { environmentVariables } }
            });
        } else {
            await this.client.deployments.beginUpdateAndWait(target.app.service.resourceGroup, target.app.service.name, target.app.name, target.name, {
                //@ts-ignore
                properties: {
                    source: {
                        type: 'Jar',
                        jvmOptions
                    }
                }
            });
        }
    }

    public getScaleSettings(deployment?: IDeployment): IScaleSettings {
        const target: IDeployment = this.getTarget(deployment);
        const settings: DeploymentSettings | undefined = target.properties?.deploymentSettings;
        const resourceRequests: ResourceRequests | undefined = settings?.resourceRequests;
        const cpu: number = resourceRequests?.cpu ? (resourceRequests?.cpu?.endsWith('m') ?
            parseInt(resourceRequests?.cpu) / 1000 :
            parseInt(resourceRequests?.cpu)) : 1;
        const memory: number = resourceRequests?.memory ? (resourceRequests?.memory?.endsWith('Mi') ?
            parseInt(resourceRequests?.memory) / 1024 :
            parseInt(resourceRequests?.memory)) : 1;
        return { cpu, memory, capacity: target.sku?.capacity ?? 0 };
    }

    private getTarget(deployment: IDeployment | undefined): IDeployment {
        // @ts-ignore
        return deployment ?? this.target;
    }
}
