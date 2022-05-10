/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { openInPortal } from "@microsoft/vscode-azext-azureutils";
import { DialogResponses, IActionContext, openReadOnlyJson } from "@microsoft/vscode-azext-utils";
import { ext } from "../extensionVariables";
import { ServiceTreeItem } from "../tree/ServiceTreeItem";
import { SubscriptionTreeItem } from "../tree/SubscriptionTreeItem";
import { openUrl } from "../utils";

export namespace ServiceCommands {

    export async function createServiceInPortal(_context: IActionContext, _node?: SubscriptionTreeItem): Promise<void> {
        await openUrl('https://portal.azure.com/#create/Microsoft.AppPlatform');
    }

    export async function createApp(context: IActionContext, node?: ServiceTreeItem): Promise<void> {
        node = await getNode(node, context);
        try {
            await node.createChild(context);
        } catch (e) {
            node.refresh(context);
            throw e;
        }
    }

    export async function deleteService(context: IActionContext, node?: ServiceTreeItem): Promise<ServiceTreeItem> {
        node = await getNode(node, context);
        await context.ui.showWarningMessage(`Are you sure to delete Spring Apps "${node.data.name}"?`, { modal: true }, DialogResponses.deleteResponse);
        await node.deleteTreeItem(context);
        return node;
    }

    export async function openPortal(context: IActionContext, node?: ServiceTreeItem): Promise<ServiceTreeItem> {
        node = await getNode(node, context);
        await openInPortal(node, node.fullId);
        return node;
    }

    export async function viewProperties(context: IActionContext, node?: ServiceTreeItem): Promise<ServiceTreeItem> {
        node = await getNode(node, context);
        await openReadOnlyJson(node, node.data);
        return node;
    }

    async function getNode(node: ServiceTreeItem | undefined, context: IActionContext): Promise<ServiceTreeItem> {
        return node ?? await ext.tree.showTreeItemPicker<ServiceTreeItem>(ServiceTreeItem.contextValue, context);
    }
}
