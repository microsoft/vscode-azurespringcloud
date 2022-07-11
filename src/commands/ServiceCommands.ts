// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { openInPortal } from "@microsoft/vscode-azext-azureutils";
import { DialogResponses, IActionContext, openReadOnlyJson } from "@microsoft/vscode-azext-utils";
import { ext } from "../extensionVariables";
import { EnhancedService } from "../service/EnhancedService";
import { ServiceTreeItem } from "../tree/ServiceTreeItem";
import { SubscriptionTreeItem } from "../tree/SubscriptionTreeItem";
import * as utils from "../utils";

export namespace ServiceCommands {

    export async function createServiceInPortal(_context: IActionContext, _node?: SubscriptionTreeItem): Promise<void> {
        await utils.openUrl('https://portal.azure.com/#create/Microsoft.AppPlatform');
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
        const service: EnhancedService = node.service;
        await context.ui.showWarningMessage(`Are you sure to delete "${node.service.name}"?`, { modal: true }, DialogResponses.deleteResponse);
        const deleting: string = utils.localize('deletingSpringCLoudService', 'Deleting Azure Spring Apps "{0}"...', service.name);
        const deleted: string = utils.localize('deletedSpringCloudService', 'Successfully deleted Azure Spring Apps "{0}".', service.name);
        await utils.runInBackground(deleting, deleted, () => node!.deleteTreeItem(context));
        return node;
    }

    export async function openPortal(context: IActionContext, node?: ServiceTreeItem): Promise<ServiceTreeItem> {
        node = await getNode(node, context);
        await openInPortal(node, node.fullId);
        return node;
    }

    export async function viewProperties(context: IActionContext, node?: ServiceTreeItem): Promise<ServiceTreeItem> {
        node = await getNode(node, context);
        await openReadOnlyJson(node, node.service.properties ?? {});
        return node;
    }

    async function getNode(node: ServiceTreeItem | undefined, context: IActionContext): Promise<ServiceTreeItem> {
        return node ?? await ext.tree.showTreeItemPicker<ServiceTreeItem>(ServiceTreeItem.contextValue, context);
    }
}
