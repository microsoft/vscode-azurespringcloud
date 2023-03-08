/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { AppPlatformManagementClient, ServiceResource } from '@azure/arm-appplatform';
import { createAzureClient, getResourceGroupFromId } from '@microsoft/vscode-azext-azureutils';
import { callWithTelemetryAndErrorHandling, IActionContext, ISubscriptionContext, nonNullProp } from "@microsoft/vscode-azext-utils";
import { AppResource, AppResourceResolver } from "@microsoft/vscode-azext-utils/hostapi";
import { EnhancedService } from './service/EnhancedService';
import ResolvedService from './tree/ServiceTreeItem';

export class SpringAppsResolver implements AppResourceResolver {

    // possibly pass down the full tree item, but for now try to get away with just the AppResource
    public async resolveResource(subContext: ISubscriptionContext, resource: AppResource): Promise<ResolvedService | null> {
        return await callWithTelemetryAndErrorHandling('resolveResource', async (context: IActionContext) => {
            try {
                const client: AppPlatformManagementClient = createAzureClient([context, subContext], AppPlatformManagementClient);
                const service: ServiceResource = await client.services.get(getResourceGroupFromId(nonNullProp(resource, 'id')), nonNullProp(resource, 'name'));
                const enhanced: EnhancedService = new EnhancedService(client, subContext, service);
                return new ResolvedService(subContext, enhanced);
            } catch (e) {
                console.error({ ...context, ...subContext });
                throw e;
            }
        }) ?? null;
    }

    public matchesResource(resource: AppResource): boolean {
        return resource.type.toLowerCase() === 'microsoft.appplatform/spring';
    }
}
