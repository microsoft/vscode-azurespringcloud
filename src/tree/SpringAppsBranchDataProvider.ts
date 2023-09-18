/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { AppPlatformManagementClient } from '@azure/arm-appplatform';
import { createAzureClient } from '@microsoft/vscode-azext-azureutils';
import { callWithTelemetryAndErrorHandling, createSubscriptionContext, IActionContext } from '@microsoft/vscode-azext-utils';
import { AzureResource, AzureResourceBranchDataProvider, AzureResourceModel, AzureSubscription } from '@microsoft/vscode-azureresources-api';
import * as vscode from 'vscode';
import { ext } from '../extensionVariables';
import { EnhancedService } from '../model/EnhancedService';
import ServiceItem from './ServiceItem';

export interface ResourceItemBase extends AzureResourceModel {
    getChildren?(): vscode.ProviderResult<ResourceItemBase[]>;
    getTreeItem(): vscode.TreeItem | Thenable<vscode.TreeItem>;
    refresh(): Promise<void>;
}

export interface SpringAppItem extends ResourceItemBase {
    subscription: AzureSubscription;
    springApp: EnhancedService;
}

export class SpringAppsBranchDataProvider extends vscode.Disposable implements AzureResourceBranchDataProvider<ResourceItemBase> {
    private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<ResourceItemBase | undefined>();

    constructor() {
        super(
            () => {
                this.onDidChangeTreeDataEmitter.dispose();
            });
    }

    get onDidChangeTreeData(): vscode.Event<ResourceItemBase | undefined> {
        return this.onDidChangeTreeDataEmitter.event;
    }

    async getChildren(element: ResourceItemBase): Promise<ResourceItemBase[] | null | undefined> {
        return (await element.getChildren?.())?.map((child) => {
            if (child.id) {
                return ext.state.wrapItemInStateHandling(child as ResourceItemBase & { id: string }, () => this.refresh(child))
            }
            return child;
        });
    }

    async getResourceItem(element: AzureResource): Promise<ResourceItemBase> {
        const resourceItem = await callWithTelemetryAndErrorHandling(
            'getResourceItem',
            async (context: IActionContext) => {
                context.errorHandling.rethrow = true;
                const subContext = createSubscriptionContext(element.subscription);
                const client: AppPlatformManagementClient = createAzureClient([context, subContext], AppPlatformManagementClient);
                const service: EnhancedService = new EnhancedService(client, element.subscription, element);
                return new ServiceItem(service);
            });

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return ext.state.wrapItemInStateHandling(resourceItem!, () => this.refresh(resourceItem));
    }

    async getTreeItem(element: ResourceItemBase): Promise<vscode.TreeItem> {
        return element.getTreeItem();
    }

    refresh(element?: ResourceItemBase): void {
        this.onDidChangeTreeDataEmitter.fire(element);
    }
}

export const branchDataProvider = new SpringAppsBranchDataProvider();
