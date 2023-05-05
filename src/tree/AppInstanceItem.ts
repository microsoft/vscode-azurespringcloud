// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ViewPropertiesModel } from "@microsoft/vscode-azureresources-api";
import { TreeItem } from "vscode";
import { EnhancedInstance } from "../model/EnhancedInstance";
import { getThemedIconPath } from "../utils";
import { AppInstancesItem } from "./AppInstancesItem";
import { ResourceItemBase } from "./SpringAppsBranchDataProvider";

export class AppInstanceItem implements ResourceItemBase {
    public static contextValue: RegExp = /^azureSpringApps\.app\.instance;status-.+;streaming-.+;/i;
    public readonly id: string = `${this.parent.id}/${this.instance.name}`;

    public constructor(public readonly parent: AppInstancesItem, public readonly instance: EnhancedInstance) {
    }

    get viewProperties(): ViewPropertiesModel {
        return {
            label: this.instance.name,
            data: this.instance.properties ?? {},
        };
    }

    async getChildren(): Promise<ResourceItemBase[]> {
        return [];
    }

    getTreeItem(): TreeItem {
        return {
            id: this.id,
            label: this.instance.name,
            description: this.instance.status,
            iconPath: getThemedIconPath('app-instance'),
            contextValue: `azureSpringApps.app.instance;status-${this.instance.status};streaming-${this.instance.streamingLogConnected};`
        }
    }

    refresh(): Promise<void> {
        return Promise.resolve(undefined);
    }
}
