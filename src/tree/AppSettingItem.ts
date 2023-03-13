// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from "vscode";
import { ext } from "../extensionVariables";
import { getThemedIconPath } from "../utils";
import { AppSettingsItem } from './AppSettingsItem';
import { ResourceItemBase } from "./SpringAppsBranchDataProvider";

export interface IOptions {
    hidden?: boolean;
    deletable?: boolean;
    label?: string;
    readonly?: boolean;
    contextValue?: string;
}

export class AppSettingItem implements ResourceItemBase {
    public static contextValue: string = 'azureSpringApps.app.setting';
    public readonly key: string;
    public readonly _value: string;

    private readonly _options: IOptions;

    public constructor(public readonly parent: AppSettingsItem, key: string, value: string, options: IOptions = { deletable: true }) {
        this.key = key;
        this._value = value;
        this._options = options;
    }

    getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return {
            id: this.id,
            label: this.label,
            iconPath: getThemedIconPath('constant'),
            contextValue: this.contextValue,
            description: this.description,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: this._options.hidden === undefined ? undefined : {
                title: 'Toggle Visibility',
                command: 'azureSpringApps.common.toggleVisibility',
                arguments: [this]
            },
        };
    }

    public get contextValue(): string {
        return this._options.contextValue || AppSettingItem.contextValue;
    }

    public get id(): string {
        return `${this.parent.id}/${this.key}`;
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

    public get value(): string {
        return this._value;
    }

    public async updateValue(context: IActionContext): Promise<void> {
        await this.parent.updateSettingValue(this, context);
    }

    public async remove(context: IActionContext): Promise<void> {
        if (this.deletable) {
            await this.parent.deleteSettingItem(this, context);
        }
    }

    public async toggleVisibility(_context: IActionContext, hidden?: boolean): Promise<void> {
        this._options.hidden = hidden ?? !this._options.hidden;
        ext.state.notifyChildrenChanged(this.id);
    }

    refresh(): Promise<void> {
        return Promise.resolve(undefined);
    }
}
