// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from "vscode";
import { ext } from "../extensionVariables";
import { AppItem } from './AppItem';
import { AppSettingItem } from "./AppSettingItem";
import { ResourceItemBase } from './SpringAppsBranchDataProvider';

export abstract class AppSettingsItem implements ResourceItemBase {
    private _children: Promise<AppSettingItem[] | undefined>;

    protected constructor(public readonly parent: AppItem) {
        this._children = this.loadChildren();
    }

    public async toggleVisibility(context: IActionContext): Promise<void> {
        const settings: AppSettingItem[] = <AppSettingItem[]>await this.getChildren();
        const hidden: boolean = settings.every(s => s.hidden);
        for (const s of settings) {
            if (s.toggleVisibility !== undefined) {
                await s.toggleVisibility(context, !hidden);
            }
        }
        ext.state.notifyChildrenChanged(this.id);
    }

    public async refresh(): Promise<void> {
        this._children = this.loadChildren();
        ext.state.notifyChildrenChanged(this.id);
    }

    public async getChildren(): Promise<AppSettingItem[]> {
        return await this._children ?? [];
    }

    public abstract getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem>;

    protected abstract loadChildren(): Promise<AppSettingItem[] | undefined>;

    public abstract updateSettingValue(node: AppSettingItem, context: IActionContext): Promise<string>;

    public abstract updateSettingsValue(context: IActionContext): Promise<unknown>;

    public abstract deleteSettingItem(node: AppSettingItem, context: IActionContext): Promise<void>;

    readonly abstract id: string;
}
