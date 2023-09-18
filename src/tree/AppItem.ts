// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { RemoteDebugging } from '@azure/arm-appplatform';
import { IActionContext } from '@microsoft/vscode-azext-utils';
import { ViewPropertiesModel } from '@microsoft/vscode-azureresources-api';
import { TreeItem, TreeItemCollapsibleState, Uri } from "vscode";
import { ext } from '../extensionVariables';
import { EnhancedApp } from "../model/EnhancedApp";
import { EnhancedDeployment } from "../model/EnhancedDeployment";
import * as utils from "../utils";
import { AppEnvVariablesItem } from "./AppEnvVariablesItem";
import { AppInstancesItem } from "./AppInstancesItem";
import { AppJvmOptionsItem } from "./AppJvmOptionsItem";
import { AppScaleSettingsItem } from "./AppScaleSettingsItem";
import ServiceItem from './ServiceItem';
import { ResourceItemBase } from './SpringAppsBranchDataProvider';

export class AppItem implements ResourceItemBase {
    public static contextValue: RegExp = /^azureSpringApps\.app;status-.+;debugging-.+;public-.+;/i;
    public static readonly ACCESS_PUBLIC_ENDPOINT: string = 'Access public endpoint';
    public static readonly ACCESS_TEST_ENDPOINT: string = 'Access test endpoint';
    private _children: Promise<ResourceItemBase[] | undefined>;
    private _scaleSettingsItem: AppScaleSettingsItem;
    private deleted: boolean;
    private _stateProperties: {} | undefined = undefined;

    constructor(public readonly parent: ServiceItem, public readonly app: EnhancedApp) {
        this._children = this.loadChildren();
    }

    public get id(): string {
        return this.azureResourceId;
    }

    public get azureResourceId(): string {
        return utils.nonNullProp(this.app, 'id');
    }

    public get viewProperties(): ViewPropertiesModel {
        return {
            label: this.app.name,
            getData: async () => {
                const r = await this.app.remote;
                return r.properties ?? {};
            }
        };
    }

    public get portalUrl(): Uri {
        return utils.createPortalUrl(this.app.service.subscription, this.app.id);
    }

    public async getChildren(): Promise<ResourceItemBase[]> {
        return await this._children ?? [];
    }

    public async getTreeItem(): Promise<TreeItem> {
        if (this._stateProperties === undefined) {
            void this.refresh();
            this._stateProperties = {
                iconPath: utils.getThemedIconPath(`app-status-loading`),
                contextValue: `azureSpringApps.app;status-loading;debugging-disabled;public-false;tier-other;`,
                description: 'loading'
            }
        }
        return {
            id: this.id,
            label: this.app.name,
            collapsibleState: TreeItemCollapsibleState.Collapsed,
            ...this._stateProperties ?? {}
        }
    }

    public async scaleInstances(context: IActionContext): Promise<void> {
        await this._scaleSettingsItem?.updateSettingsValue(context);
    }

    public async refresh(): Promise<void> {
        if (!this.deleted) {
            this._stateProperties = undefined;
            await ext.state.runWithTemporaryDescription(this.app.id, utils.localize('loading', 'Loading...'), async () => {
                await this.app.refresh();
                this._children = this.loadChildren();

                const appProperties = (await this.app.properties);
                const deployment: EnhancedDeployment | undefined = await this.app.activeDeployment;
                const runtimeVersion = deployment?.runtimeVersion;
                const config: RemoteDebugging | undefined = await deployment?.getDebuggingConfig();
                const status = await this.app.getStatus();
                const state: string | undefined = appProperties?.provisioningState;
                const description = state?.toLowerCase() === 'succeeded' ? (await runtimeVersion)?.split(/[\s\_]/).join(" ") : state;
                const debugging: string = config?.enabled === undefined ? 'unknown' : config?.enabled ? 'enabled' : 'disabled'
                const tier: string = await this.app.service.isEnterpriseTier() ? 'enterprise' : await this.app.service.isConsumptionTier() ? 'consumption' : 'other';
                const contextValue = `azureSpringApps.app;status-${status};debugging-${debugging};public-${appProperties?.public};tier-${tier};`;
                this._stateProperties = {
                    iconPath: utils.getThemedIconPath(`app-status-${status}`),
                    description,
                    contextValue,
                }

                ext.state.notifyChildrenChanged(this.id);
            });
        }
    }

    async start(): Promise<void> {
        const description = utils.localize('start', 'Starting...');
        await ext.state.runWithTemporaryDescription(this.id, description, async () => {
            await this.app.start();
            await this.refresh();
        });
    }

    async stop(): Promise<void> {
        const description = utils.localize('stop', 'Stopping...');
        await ext.state.runWithTemporaryDescription(this.id, description, async () => {
            await this.app.stop();
            await this.refresh();
        });
    }

    async restart(): Promise<void> {
        const description = utils.localize('restart', 'Restarting...');
        await ext.state.runWithTemporaryDescription(this.id, description, async () => {
            await this.app.restart();
            await this.refresh();
        });
    }

    public async remove(): Promise<void> {
        const description = utils.localize('deleting', 'Deleting...');
        await ext.state.runWithTemporaryDescription(this.id, description, async () => {
            await this.app.remove();
            this.deleted = true;
            void this.parent.refresh();
        });
    }

    private async loadChildren(): Promise<ResourceItemBase[]> {
        const activeDeployment: EnhancedDeployment | undefined = await this.app.activeDeployment;
        if (!activeDeployment) {
            return [];
        }
        this._scaleSettingsItem = new AppScaleSettingsItem(this);
        return [new AppInstancesItem(this), new AppEnvVariablesItem(this), this._scaleSettingsItem, new AppJvmOptionsItem(this)];
    }
}
