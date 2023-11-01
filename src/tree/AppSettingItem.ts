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

    public constructor(public readonly parent: AppSettingsItem,
        public readonly key: string,
        public readonly value: string,
        public readonly options: IOptions = { deletable: true }) {
    }

    public getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return {
            id: this.id,
            label: this.label,
            iconPath: getThemedIconPath('constant'),
            contextValue: this.contextValue,
            description: this.description,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: this.options.hidden === undefined ? undefined : {
                title: 'Toggle Visibility',
                command: 'azureSpringApps.common.toggleVisibility',
                arguments: [this]
            },
        };
    }

    public get contextValue(): string {
        return this.options.contextValue || AppSettingItem.contextValue;
    }

    public get id(): string {
        return `${this.parent.id}/${this.key || this.value}`;
    }

    public get label(): string {
        if (this.options.label) {
            return this.options.hidden ? `${this.options.label}=***` : `${this.options.label}=${this.value}`;
        } else if (this.key) {
            return this.options.hidden ? `${this.key}=***` : `${this.key}=${this.value}`;
        } else {
            return this.options.hidden ? '***' : this.value;
        }
    }

    public get hidden(): boolean {
        return this.options.hidden ?? false;
    }

    public get description(): string {
        return this.options.hidden ? `Click to view.` : ``;
    }

    public get deletable(): boolean {
        return this.options.deletable ?? true;
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
        this.options.hidden = hidden ?? !this.options.hidden;
        ext.state.notifyChildrenChanged(this.id);
    }

    refresh(): Promise<void> {
        return Promise.resolve(undefined);
    }
}
