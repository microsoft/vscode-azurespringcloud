/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';
import { ext } from "../extensionVariables";
import { AppSettingTreeItem, IOptions } from "./AppSettingTreeItem";
import { AppTreeItem } from "./AppTreeItem";

export abstract class AppSettingsTreeItem extends AzExtParentTreeItem {
    public readonly childTypeLabel: string = 'App Setting';
    public parent: AppTreeItem;

    protected constructor(parent: AppTreeItem) {
        super(parent);
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public toAppSettingItem(key: string, value: string, options?: IOptions): AppSettingTreeItem {
        return new AppSettingTreeItem(this, key.trim(), value.trim(), options);
    }

    public async toggleVisibility(context: IActionContext): Promise<void> {
        const settings: AppSettingTreeItem[] = <AppSettingTreeItem[]>await ext.tree.getChildren(this);
        const hidden: boolean = settings.every(s => s.hidden);
        for (const s of settings) {
            if (s.toggleVisibility !== undefined) {
                await s.toggleVisibility(context, !hidden);
            }
        }
    }

    public async refreshImpl(): Promise<void> {
        await this.parent.app.refresh();
    }

    public abstract updateSettingValue(node: AppSettingTreeItem, context: IActionContext): Promise<string>;

    // tslint:disable-next-line:no-any
    public abstract updateSettingsValue(context: IActionContext): Promise<any>;

    public abstract deleteSettingItem(node: AppSettingTreeItem, context: IActionContext): Promise<void>;
}
