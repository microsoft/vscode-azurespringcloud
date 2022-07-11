// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzExtParentTreeItem, AzExtTreeItem, IActionContext, TreeItemIconPath } from '@microsoft/vscode-azext-utils';
import { getThemedIconPath } from "../utils";
import { AppSettingsTreeItem } from "./AppSettingsTreeItem";

export interface IOptions {
    hidden?: boolean;
    deletable?: boolean;
    label?: string;
    readonly?: boolean;
    contextValue?: string;
}

export class AppSettingTreeItem extends AzExtTreeItem {
    public static contextValue: string = 'azureSpringApps.app.setting';
    public readonly parent: AppSettingsTreeItem;
    public readonly key: string;
    public readonly _value: string;

    private readonly _options: IOptions;

    public constructor(parent: AzExtParentTreeItem, key: string, value: string, options: IOptions = { deletable: true }) {
        super(parent);
        this.key = key;
        this._value = value;
        this._options = options;
    }

    public get contextValue(): string {
        return this._options.contextValue || AppSettingTreeItem.contextValue;
    }

    public get id(): string {
        return this.key || this._value;
    }

    public get label(): string {
        if (this._options.label) {
            return this._options.hidden ? `${this._options.label}=***` : `${this._options.label}=${this._value}`;
        } else if (this.key) {
            return this._options.hidden ? `${this.key}=***` : `${this.key}=${this._value}`;
        } else {
            return this._options.hidden ? '***' : this._value;
        }
    }

    public get hidden(): boolean {
        return this._options.hidden ?? false;
    }

    public get description(): string {
        return this._options.hidden ? `Click to view.` : ``;
    }

    public get deletable(): boolean {
        return this._options.deletable ?? true;
    }

    public get iconPath(): TreeItemIconPath {
        return getThemedIconPath('constant');
    }

    public get commandId(): string | undefined {
        if (this._options.hidden === undefined) {
            return undefined;
        }
        return 'azureSpringApps.common.toggleVisibility';
    }

    public get value(): string {
        return this._value;
    }

    public async updateValue(context: IActionContext): Promise<void> {
        await this.parent.updateSettingValue(this, context);
    }

    public async deleteTreeItemImpl(context: IActionContext): Promise<void> {
        if (this.deletable) {
            await this.parent.deleteSettingItem(this, context);
        }
    }

    public async toggleVisibility(context: IActionContext, hidden?: boolean): Promise<void> {
        this._options.hidden = hidden ?? !this._options.hidden;
        await this.refresh(context);
    }
}
