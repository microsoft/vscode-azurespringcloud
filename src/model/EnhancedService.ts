// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AppPlatformManagementClient, AppResource, ClusterResourceProperties, ServiceResource, Sku } from "@azure/arm-appplatform";
import { AzureSubscription } from '@microsoft/vscode-azureresources-api';
import { ext } from "../extensionVariables";
import { EnhancedApp } from "./EnhancedApp";

export class EnhancedService {
    public readonly client: AppPlatformManagementClient;

    public readonly name: string;
    public readonly id: string;
    public readonly subscription: AzureSubscription;
    private _remote: ServiceResource;
    private _resourceGroup: string;

    public constructor(client: AppPlatformManagementClient, subscription: AzureSubscription, resource: ServiceResource) {
        this.client = client;
        this.subscription = subscription;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.name = resource.name!;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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

    public get remote(): ServiceResource {
        return this._remote;
    }

    public async createApp(name: string): Promise<EnhancedApp> {
        ext.outputChannel.appendLog(`[App] creating app (${this.name}).`);
        const app: AppResource = await this.client.apps.beginCreateOrUpdateAndWait(this.resourceGroup, this.name, name, {
            properties: {
                public: false
            }
        });
        ext.outputChannel.appendLog(`[App] app (${this.name}) is created.`);
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
        ext.outputChannel.appendLog(`[Apps] deleting apps (${this.name}).`);
        await this.client.services.beginDeleteAndWait(this.resourceGroup, this.name);
        ext.outputChannel.appendLog(`[Apps] apps (${this.name}) is deleted.`);
    }

    public isEnterpriseTier(): boolean {
        return this.sku?.tier === 'Enterprise';
    }

    public isConsumptionTier(): boolean {
        return this.sku?.tier === 'StandardGen2';
    }

    private setRemote(resource: ServiceResource): void {
        this._remote = resource;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._resourceGroup = resource.id!.split('/')[4];
    }
}
