// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from "vscode";
import { ext } from "../extensionVariables";
import { AppItem } from './AppItem';
import { AppSettingItem, IOptions } from "./AppSettingItem";
import { ResourceItemBase } from './SpringAppsBranchDataProvider';

export abstract class AppSettingsItem implements ResourceItemBase {
    protected constructor(public readonly parent: AppItem) {
    }

    public toAppSettingItem(key: string, value: string, options?: IOptions): AppSettingItem {
        return new AppSettingItem(this, key.trim(), value.trim(), options);
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
        await this.parent.app.refresh();
        ext.state.notifyChildrenChanged(this.id);
    }

    public abstract updateSettingValue(node: AppSettingItem, context: IActionContext): Promise<string>;

    public abstract updateSettingsValue(context: IActionContext): Promise<unknown>;

    public abstract deleteSettingItem(node: AppSettingItem, context: IActionContext): Promise<void>;

    readonly abstract id: string;

    abstract getChildren(): Promise<AppSettingItem[]>;

    abstract getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem>;
}
