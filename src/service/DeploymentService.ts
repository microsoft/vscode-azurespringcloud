import { AppPlatformManagementClient } from "@azure/arm-appplatform";
import { DeploymentResource, DeploymentSettings, Sku } from "@azure/arm-appplatform/esm/models";
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

    public static toResource(settings: IScaleSettings, sku: Sku): DeploymentResource {
        const resource: DeploymentResource = { properties: { deploymentSettings: { cpu: settings.cpu, memoryInGB: settings.memory } } };
        if (settings.capacity !== undefined) {
            resource.sku = { ...sku, capacity: settings.capacity };
        }
        return resource;
    }

    public async reload(deployment?: IDeployment): Promise<IDeployment> {
        const target: IDeployment = this.getTarget(deployment);
        const resource: DeploymentResource = await this.client.deployments.get(target.app.service.resourceGroup, target.app.service.name, target.app.name, target.name);
        return IDeployment.fromResource(resource, target.app);
    }

    public async updateArtifactPath(path: string, deployment?: IDeployment): Promise<void> {
        const target: IDeployment = this.getTarget(deployment);
        await this.client.deployments.update(target.app.service.resourceGroup, target.app.service.name, target.app.name, target.name || DeploymentService.DEFAULT_DEPLOYMENT_NAME, {
            properties: {
                source: {
                    type: 'Jar',
                    relativePath: path
                },
            }
        });
    }

    public async updateScaleSettings(scaleSettings: IScaleSettings, deployment?: IDeployment): Promise<void> {
        const target: IDeployment = this.getTarget(deployment);
        const resource: DeploymentResource = DeploymentService.toResource(scaleSettings, target.sku!);
        await this.client.deployments.update(target.app.service.resourceGroup, target.app.service.name, target.app.name, target.name, resource);
    }

    public async updateEnvironmentVariables(environmentVariables: { [p: string]: string }, deployment?: IDeployment): Promise<void> {
        const target: IDeployment = this.getTarget(deployment);
        await this.client.deployments.update(target.app.service.resourceGroup, target.app.service.name, target.app.name, target.name, {
            properties: { deploymentSettings: { environmentVariables } }
        });
    }

    public async updateJvmOptions(jvmOptions: string, deployment?: IDeployment): Promise<void> {
        const target: IDeployment = this.getTarget(deployment);
        await this.client.deployments.update(target.app.service.resourceGroup, target.app.service.name, target.app.name, target.name, {
            properties: { deploymentSettings: { jvmOptions } }
        });
    }

    public getScaleSettings(deployment?: IDeployment): IScaleSettings {
        const target: IDeployment = this.getTarget(deployment);
        const settings: DeploymentSettings | undefined = target.properties?.deploymentSettings;
        return {
            cpu: settings?.cpu ?? 0,
            memory: settings?.memoryInGB ?? 0,
            capacity: target.sku?.capacity ?? 0
        };
    }

    private getTarget(deployment: IDeployment | undefined): IDeployment {
        // @ts-ignore
        return deployment ?? this.target;
    }
}
