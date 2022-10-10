// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { openInPortal } from "@microsoft/vscode-azext-azureutils";
import { AzExtTreeItem, DialogResponses, IActionContext, openReadOnlyJson, openUrl } from "@microsoft/vscode-azext-utils";
import { ext } from "../extensionVariables";
import { EnhancedService } from "../service/EnhancedService";
import { ServiceTreeItem } from "../tree/ServiceTreeItem";
import { SubscriptionTreeItem } from "../tree/SubscriptionTreeItem";
import * as utils from "../utils";

export namespace ServiceCommands {

    export async function createServiceInPortal(_context: IActionContext, _node?: SubscriptionTreeItem): Promise<void> {
        await openUrl('https://portal.azure.com/#create/Microsoft.AppPlatform');
    }

    export async function createApp(context: IActionContext, n?: AzExtTreeItem): Promise<void> {
        const node: ServiceTreeItem = await getNode(n, context);
        try {
            await node.createChild(context);
        } catch (e) {
            node.refresh(context);
            throw e;
        }
    }

    export async function deleteService(context: IActionContext, n?: AzExtTreeItem): Promise<ServiceTreeItem> {
        const node: ServiceTreeItem = await getNode(n, context);
        const service: EnhancedService = node.service;
        await context.ui.showWarningMessage(`Are you sure to delete "${node.service.name}"?`, { modal: true }, DialogResponses.deleteResponse);
        const deleting: string = utils.localize('deletingSpringCLoudService', 'Deleting Azure Spring Apps "{0}"...', service.name);
        const deleted: string = utils.localize('deletedSpringCloudService', 'Successfully deleted Azure Spring Apps "{0}".', service.name);
        await utils.runInBackground(deleting, deleted, () => node!.deleteTreeItem(context));
        return node;
    }

    export async function openPortal(context: IActionContext, n?: AzExtTreeItem): Promise<ServiceTreeItem> {
        const node: ServiceTreeItem = await getNode(n, context);
        await openInPortal(node, node.fullId);
        return node;
    }

    export async function viewProperties(context: IActionContext, n?: AzExtTreeItem): Promise<ServiceTreeItem> {
        const node: ServiceTreeItem = await getNode(n, context);
        await openReadOnlyJson(node, node.service.properties ?? {});
        return node;
    }

    async function getNode(node: AzExtTreeItem | undefined, context: IActionContext): Promise<ServiceTreeItem> {
        if (node && node instanceof ServiceTreeItem) {
            return node;
        }
        return await ext.tree.showTreeItemPicker<ServiceTreeItem>(ServiceTreeItem.contextValue, context, node);
    }
}
