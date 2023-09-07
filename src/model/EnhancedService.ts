// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AppPlatformManagementClient, AppResource, ClusterResourceProperties, DevToolPortalResource, ServiceResource, Sku } from "@azure/arm-appplatform";
import { AzureSubscription } from '@microsoft/vscode-azureresources-api';
import { ext } from "../extensionVariables";
import { EnhancedApp } from "./EnhancedApp";

export class EnhancedService {
    public readonly client: AppPlatformManagementClient;

    public readonly id: string;
    public readonly name: string;
    public readonly subscription: AzureSubscription;
    public readonly resourceGroup: string;
    private _remote: Promise<ServiceResource>;
    private _devToolsPortal: Promise<DevToolPortalResource | undefined>;

    public constructor(client: AppPlatformManagementClient, subscription: AzureSubscription, resource: ServiceResource) {
        this.client = client;
        this.subscription = subscription;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.name = resource.name!;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.id = resource.id!;
        this.resourceGroup = this.id.split('/')[4];
        this._remote = Promise.resolve(resource);
        this._devToolsPortal = this.initDevTools();
    }

    public get sku(): Promise<Sku | undefined> {
        return this._remote.then(r => r.sku);
    }

    public get properties(): Promise<ClusterResourceProperties | undefined> {
        return this._remote.then(r => r.properties)
    }

    public get location(): Promise<string | undefined> {
        return this._remote.then(r => r.location);
    }

    public get remote(): Promise<ServiceResource> {
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

    private async initDevTools(): Promise<DevToolPortalResource | undefined> {
        if (await this.isEnterpriseTier()) {
            const portal = await this.client.devToolPortals.get(this.resourceGroup, this.name, 'default');
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

    public async getAppAcceleratorConfig(): Promise<{ authClientId?: string, authIssuerUrl?: string, guiUrl: string } | undefined> {
        const devToolsPortal: DevToolPortalResource | undefined = await this._devToolsPortal;
        if (devToolsPortal && await this.isAppAcceleratorEnabled()) {
            const ssoProperties = devToolsPortal?.properties?.ssoProperties;
            const url = ssoProperties?.metadataUrl;
            return {
                authClientId: ssoProperties?.clientId,
                authIssuerUrl: url?.substring(0, url.indexOf("/.well-known")),
                guiUrl: `https://${devToolsPortal.properties?.url}`
            };
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

    public async isAppAcceleratorEnabled(): Promise<boolean> {
        const devToolsPortal: DevToolPortalResource | undefined = await this._devToolsPortal;
        return devToolsPortal?.properties?.features?.applicationAccelerator?.state?.toLowerCase() === "enabled";
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
        this._remote = this.client.services.get(this.resourceGroup, this.name);
        this._devToolsPortal = this.initDevTools();
        return Promise.all([this._remote, this._devToolsPortal]).then(() => this);
    }

    public async remove(): Promise<void> {
        ext.outputChannel.appendLog(`[Apps] deleting apps (${this.name}).`);
        await this.client.services.beginDeleteAndWait(this.resourceGroup, this.name);
        ext.outputChannel.appendLog(`[Apps] apps (${this.name}) is deleted.`);
    }

    public async isEnterpriseTier(): Promise<boolean> {
        return this.sku?.then(s => s?.tier === 'Enterprise')
    }

    public async isConsumptionTier(): Promise<boolean> {
        return this.sku?.then(s => s?.tier === 'StandardGen2')
    }
}
