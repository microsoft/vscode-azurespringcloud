/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppPlatformManagementClient, AppResource, ClusterResourceProperties, ServiceResource, Sku } from "@azure/arm-appplatform";
import { nonNullProp } from "@microsoft/vscode-azext-utils";
import { SpringCloudResourceId } from "../model";
import { EnhancedApp } from "./EnhancedApp";

export class EnhancedService {
    public readonly client: AppPlatformManagementClient;

    public readonly name: string;
    public readonly id: string;
    private _remote: ServiceResource;
    private _resourceGroup: string;

    public constructor(client: AppPlatformManagementClient, resource: ServiceResource) {
        this.client = client;
        this.name = resource.name!;
        this.id = resource.id!;
        this.setRemote(resource);
    }

    public get resourceGroup(): string {
        return this._resourceGroup;
    }

    public get sku(): Sku | undefined {
        return this._remote.sku;
    }

    public get properties(): ClusterResourceProperties | undefined {
        return this._remote.properties;
    }

    public get location(): string | undefined {
        return this._remote.location;
    }

    public async createApp(name: string): Promise<EnhancedApp> {
        await this.client.apps.beginCreateOrUpdateAndWait(this.resourceGroup, this.name, name, {
            properties: {
                public: false
            }
        });
        const app: AppResource = await this.client.apps.get(this.resourceGroup, this.name, name);
        this.refresh();
        return new EnhancedApp(this, app);
    }

    public async getApps(): Promise<EnhancedApp[]> {
        const apps: AppResource[] = [];
        const pagedApps: AsyncIterable<AppResource> = this.client.apps.list(this.resourceGroup, this.name);
        for await (const app of pagedApps) {
            apps.push(app);
        }
        return apps.map(app => new EnhancedApp(this, app));
    }

    public async refresh(): Promise<EnhancedService> {
        const remote: ServiceResource = await this.client.services.get(this.resourceGroup, this.name);
        this.setRemote(remote);
        return this;
    }

    public async remove(): Promise<void> {
        await this.client.services.beginDeleteAndWait(this.resourceGroup, this.name);
    }

    public isEnterpriseTier(): boolean {
        return this.sku?.tier === 'Enterprise';
    }

    private setRemote(resource: ServiceResource): void {
        this._remote = resource;
        const resourceId: SpringCloudResourceId = new SpringCloudResourceId(nonNullProp(resource, 'id'));
        this._resourceGroup = resourceId.resourceGroup;
    }
}
