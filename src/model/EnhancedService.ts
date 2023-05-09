// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AppPlatformManagementClient, AppResource, ClusterResourceProperties, DevToolPortalResource, ServiceResource, Sku } from "@azure/arm-appplatform";
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
    private _devToolsPortal: Promise<DevToolPortalResource | undefined>;

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

    public async loadDevTools(): Promise<DevToolPortalResource | undefined> {
        for await (const portal of this.client.devToolPortals.list(this.resourceGroup, this.name)) {
            if (portal.properties?.public) {
                return portal;
            }
        }
        return undefined;
    }

    public async getLiveViewUrl(): Promise<string | undefined> {
        const devToolsPortal: DevToolPortalResource | undefined = await this._devToolsPortal;
        if (devToolsPortal && await this.isLiveViewEnabled()) {
            return `https://${devToolsPortal.properties?.url}/${devToolsPortal.properties?.features?.applicationLiveView?.route}`
        }
        return undefined;
    }

    public async enableLiveView(): Promise<void> {
        this._devToolsPortal = this.client.devToolPortals.beginCreateOrUpdateAndWait(this.resourceGroup, this.name, 'default', {
            properties: {
                features: {
                    applicationLiveView: {
                        state: "Enabled"
                    }
                },
                public: true
            }
        });
        await this._devToolsPortal;
    }

    public async isLiveViewEnabled(): Promise<boolean> {
        const devToolsPortal: DevToolPortalResource | undefined = await this._devToolsPortal;
        return devToolsPortal?.properties?.features?.applicationLiveView?.state?.toLowerCase() === "enabled";
    }

    public async isDevToolsPublic(): Promise<boolean> {
        const devToolsPortal: DevToolPortalResource | undefined = await this._devToolsPortal;
        return devToolsPortal?.properties?.public ?? false;
    }

    public async isDevToolsRunning(): Promise<boolean> {
        const devToolsPortal: DevToolPortalResource | undefined = await this._devToolsPortal;
        return (devToolsPortal?.properties?.instances?.length ?? 0) > 0 &&
            devToolsPortal?.properties?.instances?.[0].status?.toLowerCase() === 'running';
    }

    public async refresh(): Promise<EnhancedService> {
        const remote: ServiceResource = await this.client.services.get(this.resourceGroup, this.name);
        this.setRemote(remote);
        this._devToolsPortal = this.loadDevTools();
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
