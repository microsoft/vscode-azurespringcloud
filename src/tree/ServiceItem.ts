/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { ViewPropertiesModel } from "@microsoft/vscode-azureresources-api";
import { TreeItem, TreeItemCollapsibleState, Uri } from "vscode";
import { ext } from "../extensionVariables";
import { EnhancedApp } from '../model/EnhancedApp';
import { EnhancedService } from '../model/EnhancedService';
import * as utils from "../utils";
import { AppItem } from "./AppItem";
import { ResourceItemBase } from "./SpringAppsBranchDataProvider";

export default class ServiceItem implements ResourceItemBase {
    private _deleted: boolean;
    private _children: Promise<AppItem[] | undefined>;
    private _stateProperties: {} | undefined = undefined;

    constructor(public readonly service: EnhancedService) {
        this.service = service;
        this._children = this.loadChildren();
    }

    async getChildren(): Promise<AppItem[]> {
        return await this._children ?? [];
    }

    async getTreeItem(): Promise<TreeItem> {
        if (this._stateProperties === undefined) {
            void this.refresh();
            this._stateProperties = {
                contextValue: `azureSpringApps.apps;tier-other;`,
            }
        }
        return {
            id: this.id,
            label: this.service.name,
            iconPath: utils.getThemedIconPath('azure-spring-apps'),
            collapsibleState: TreeItemCollapsibleState.Collapsed,
            ...this._stateProperties
        }
    }

    public get id(): string {
        return this.azureResourceId;
    }

    public get azureResourceId(): string {
        return utils.nonNullProp(this.service, 'id');
    }

    get viewProperties(): ViewPropertiesModel {
        return {
            label: this.service.name,
            getData: async () => {
                const r = await this.service.remote;
                return r.properties ?? {};
            }
        };
    }

    get portalUrl(): Uri {
        return utils.createPortalUrl(this.service.subscription, this.id);
    }

    public get deleted(): boolean {
        return this._deleted;
    }

    public async remove(_context: IActionContext): Promise<void> {
        const description = utils.localize('deleting', 'Deleting...');
        await ext.state.runWithTemporaryDescription(this.id, description, async () => {
            await this.service.remove();
            this._deleted = true;
            ext.branchDataProvider.refresh();
        });
    }

    public async refresh(): Promise<void> {
        if (!this._deleted) {
            this._stateProperties = undefined;
            await ext.state.runWithTemporaryDescription(this.id, utils.localize('loading', 'Loading...'), async () => {
                await this.service.refresh();
                this._children = this.loadChildren();

                const state: string | undefined = (await this.service.properties)?.provisioningState;
                const description = state?.toLowerCase() === 'succeeded' ? undefined : state;
                const tier: string = await this.service.isEnterpriseTier() ? 'enterprise' : await this.service.isConsumptionTier() ? 'consumption' : 'other';
                const contextValue = `azureSpringApps.apps;tier-${tier};`;
                this._stateProperties = { description, contextValue };

                ext.state.notifyChildrenChanged(this.id);
            });
        }
    }

    private async loadChildren(): Promise<AppItem[]> {
        const apps: EnhancedApp[] = await this.service.getApps();
        return apps.map(ca => new AppItem(this, ca));
    }
}
