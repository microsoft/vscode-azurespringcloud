/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppPlatformManagementClient, AppResource, ServiceResource } from "@azure/arm-appplatform";
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
        await this.client.apps.beginCreateOrUpdateAndWait(target.resourceGroup, target.name, name, {
            properties: {
                public: false
            }
        });
        const app: AppResource = await this.client.apps.get(target.resourceGroup, target.name, name);
        return IApp.fromResource(app, target);
    }

    public async getApps(service?: IService): Promise<IApp[]> {
        const target: IService = this.getTarget(service);
        const apps: AppResource[] = [];
        const pagedApps: AsyncIterable<AppResource> = this.client.apps.list(target.resourceGroup, target.name);
        for await (const app of pagedApps) {
            apps.push(app);
        }
        return apps.map(app => IApp.fromResource(app, target));
    }

    public async reload(service?: IService): Promise<IService> {
        const target: IService = this.getTarget(service);
        const resource: ServiceResource = await this.client.services.get(target.resourceGroup, target.name);
        return IService.fromResource(resource);
    }

    public async remove(service?: IService): Promise<void> {
        const target: IService = this.getTarget(service);
        await this.client.services.beginDeleteAndWait(target.resourceGroup, target.name);
    }

    public isEnterpriseTier(service?: IService): boolean {
        const target: IService = this.getTarget(service);
        return target.sku?.name === 'Enterprise';
    }

    private getTarget(service?: IService): IService {
        // @ts-ignore
        return service ?? this.target;
    }
}
