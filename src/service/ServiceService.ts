import { AppPlatformManagementClient } from "@azure/arm-appplatform";
import { AppResource, ServiceResource } from "@azure/arm-appplatform/esm/models";
import * as Models from "@azure/arm-appplatform/src/models/index";
import { EnhancedApp, EnhancedDeployment, IApp, IDeployment, IService } from "../model";
import { AppService } from "./AppService";
import { DeploymentService } from "./DeploymentService";

export class ServiceService {
    private readonly client: AppPlatformManagementClient;
    private readonly target: IService | undefined;

    public constructor(client: AppPlatformManagementClient, service?: IService) {
        this.client = client;
        this.target = service;
    }

    public enhanceApp(app: IApp): EnhancedApp {
        const appService: AppService = new AppService(this.client, app);
        return Object.assign(appService, app);
    }

    public enhanceDeployment(deployment: IDeployment): EnhancedDeployment {
        const deploymentService: DeploymentService = new DeploymentService(this.client, deployment);
        return Object.assign(deploymentService, deployment);
    }

    public async createApp(name: string, service?: IService): Promise<IApp> {
        const target: IService = this.getTarget(service);
        const app: AppResource = await this.client.apps.createOrUpdate(target.resourceGroup, target.name, name, {
            properties: {
                publicProperty: false
            }
        });
        return IApp.fromResource(app, target);
    }

    public async getApps(nextLink?: string, service?: IService): Promise<{ nextLink?: string; apps: IApp[] }> {
        const target: IService = this.getTarget(service);
        const response: Models.AppsListNextResponse = nextLink ? await this.client.apps.listNext(nextLink) : await this.client.apps.list(target.resourceGroup, target.name);
        return {
            nextLink: response.nextLink,
            apps: response.map(app => IApp.fromResource(app, target))
        };
    }

    public async reload(service?: IService): Promise<IService> {
        const target: IService = this.getTarget(service);
        const resource: ServiceResource = await this.client.services.get(target.resourceGroup, target.name);
        return IService.fromResource(resource);
    }

    public async remove(service?: IService): Promise<void> {
        const target: IService = this.getTarget(service);
        await this.client.services.deleteMethod(target.resourceGroup, target.name);
    }

    private getTarget(service?: IService): IService {
        // @ts-ignore
        return service ?? this.target;
    }
}
