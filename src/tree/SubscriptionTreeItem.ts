/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppPlatformManagementClient } from '@azure/arm-appplatform';
import { ServicesListBySubscriptionNextResponse } from "@azure/arm-appplatform/esm/models";
import { AzExtTreeItem, createAzureClient, SubscriptionTreeItemBase } from 'vscode-azureextensionui';
import { localize } from '../utils';
import { ServiceTreeItem } from './ServiceTreeItem';

export class SubscriptionTreeItem extends SubscriptionTreeItemBase {
    public readonly childTypeLabel: string = localize('springCloud', 'Spring Cloud');

    private _nextLink: string | undefined;

    public hasMoreChildrenImpl(): boolean {
        return !!this._nextLink;
    }

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const client: AppPlatformManagementClient = createAzureClient(this.root, AppPlatformManagementClient);
        const services: ServicesListBySubscriptionNextResponse = this._nextLink ? await client.services.listBySubscriptionNext(this._nextLink) : await client.services.listBySubscription();
        this._nextLink = services.nextLink;
        return await this.createTreeItemsWithErrorHandling(
            services,
            'invalidSpringCloudService',
            service => new ServiceTreeItem(this, service),
            service => service.name
        );
    }
}
