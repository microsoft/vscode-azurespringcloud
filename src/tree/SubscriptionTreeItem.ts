/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppPlatformManagementClient, ServiceResource } from '@azure/arm-appplatform';
import { createAzureClient, SubscriptionTreeItemBase } from '@microsoft/vscode-azext-azureutils';
import { AzExtTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';
import { localize } from '../utils';
import { ServiceTreeItem } from './ServiceTreeItem';

export class SubscriptionTreeItem extends SubscriptionTreeItemBase {
    public readonly childTypeLabel: string = localize('springCloud.service', 'Spring Apps');

    private _nextLink: string | undefined;

    public hasMoreChildrenImpl(): boolean {
        return !!this._nextLink;
    }

    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const client: AppPlatformManagementClient = createAzureClient([context, this], AppPlatformManagementClient);
        const services: ServiceResource[] = [];
        for await (let service of client.services.listBySubscription()) {
            services.push(service);
        }
        return await this.createTreeItemsWithErrorHandling(
            services,
            'invalidSpringCloudService',
            service => new ServiceTreeItem(this, service),
            service => service.name
        );
    }
}
