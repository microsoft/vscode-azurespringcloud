// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzExtTreeItem, TreeItemIconPath } from "@microsoft/vscode-azext-utils";
import { EnhancedInstance } from "../service/EnhancedInstance";
import { getThemedIconPath } from "../utils";
import { AppInstancesTreeItem } from "./AppInstancesTreeItem";

export class AppInstanceTreeItem extends AzExtTreeItem {
    public static contextValue: RegExp = /^azureSpringApps\.app\.instance\.status-.+$/;
    public readonly parent: AppInstancesTreeItem;
    public readonly instance: EnhancedInstance;

    public constructor(parent: AppInstancesTreeItem, instance: EnhancedInstance) {
        super(parent);
        this.instance = instance;
    }

    public get id(): string {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.instance.name!;
    }

    public get label(): string {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.instance.name!;
    }

    public get description(): string {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.instance.status!;
    }

    public get iconPath(): TreeItemIconPath {
        return getThemedIconPath('app-instance');
    }

    public get contextValue(): string {
        return `azureSpringApps.app.instance.status-${this.instance.status}`;
    }
}
