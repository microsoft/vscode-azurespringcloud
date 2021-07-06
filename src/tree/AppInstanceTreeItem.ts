/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DeploymentInstance } from "@azure/arm-appplatform/src/models/index";
import { AzureTreeItem, TreeItemIconPath } from "vscode-azureextensionui";
import { getThemedIconPath } from "../utils";
import { AppInstancesTreeItem } from "./AppInstancesTreeItem";

export class AppInstanceTreeItem extends AzureTreeItem {
    public static contextValue: RegExp = /^azureSpringCloud\.app\.instance\.status-.+$/;
    public readonly parent: AppInstancesTreeItem;
    public readonly data: DeploymentInstance;

    public constructor(parent: AppInstancesTreeItem, instance: DeploymentInstance) {
        super(parent);
        this.data = instance;
    }

    public get id(): string {
        return this.data.name!;
    }

    public get label(): string {
        return this.data.name!;
    }

    public get description(): string {
        return this.data.status!;
    }

    public get iconPath(): TreeItemIconPath {
        return getThemedIconPath('app-instance');
    }

    public get contextValue(): string {
        return `azureSpringCloud.app.instance.status-${this.data.status}`;
    }
}
