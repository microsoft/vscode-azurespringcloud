// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DialogResponses, IActionContext, openUrl } from "@microsoft/vscode-azext-utils";
import { EnhancedService } from "../service/EnhancedService";
import AppsItem from "../tree/AppsItem";
import * as utils from "../utils";
import { pickApps } from "../utils/pickContainerApp";

export namespace ServiceCommands {

    export async function createServiceInPortal(_context: IActionContext): Promise<void> {
        await openUrl('https://portal.azure.com/#create/Microsoft.AppPlatform');
    }

    export async function createApp(context: IActionContext, n?: AppsItem): Promise<void> {
        const item: AppsItem = await getAppsItem(context, n);
        await item.createChild(context);
    }

    export async function deleteService(context: IActionContext, n?: AppsItem): Promise<void> {
        const item: AppsItem = await getAppsItem(context, n);
        const service: EnhancedService = item.service;
        await context.ui.showWarningMessage(`Are you sure to delete "${item.service.name}"?`, { modal: true }, DialogResponses.deleteResponse);
        const deleting: string = utils.localize('deletingSpringCLoudService', 'Deleting Azure Spring Apps "{0}"...', service.name);
        const deleted: string = utils.localize('deletedSpringCloudService', 'Successfully deleted Azure Spring Apps "{0}".', service.name);
        await utils.runInBackground(deleting, deleted, () => item.remove(context));
    }

    async function getAppsItem(context: IActionContext, origin?: AppsItem): Promise<AppsItem> {
        const item: AppsItem = origin ?? await pickApps(context);
        return item as AppsItem;
    }
}
