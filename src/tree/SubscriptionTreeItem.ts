// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AppPlatformManagementClient, ServiceResource } from '@azure/arm-appplatform';
import { createAzureClient, SubscriptionTreeItemBase } from '@microsoft/vscode-azext-azureutils';
import { AzExtTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';
import { EnhancedService } from '../service/EnhancedService';
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
        const pagedServices: AsyncIterable<ServiceResource> = client.services.listBySubscription();
        for await (const service of pagedServices) {
            services.push(service);
        }
        return await this.createTreeItemsWithErrorHandling(
            services,
            'invalidSpringCloudService',
            service => new ServiceTreeItem(this, new EnhancedService(client, service)),
            service => service.name
        );
    }
}
