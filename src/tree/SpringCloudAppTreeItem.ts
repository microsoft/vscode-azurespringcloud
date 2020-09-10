/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppResource } from '@azure/arm-appplatform/esm/models';
import { AzureParentTreeItem, AzureTreeItem } from "vscode-azureextensionui";
import { nonNullProp } from "../utils/nonNull";

export class SpringCloudAppTreeItem extends AzureTreeItem {
  public static contextValue: string = 'azureSpringCloud';
  public readonly contextValue: string = SpringCloudAppTreeItem.contextValue;
  public data: AppResource;
  public readonly cTime: number = Date.now();
  public mTime: number = Date.now();

  constructor(parent: AzureParentTreeItem, resource: AppResource) {
    super(parent);
    this.data = resource;
  }

  public get name(): string {
    return nonNullProp(this.data, 'name');
  }

  public get id(): string {
    return nonNullProp(this.data, 'id');
  }

  public get label(): string {
    return this.name;
  }

  public async refreshImpl(): Promise<void> {
    this.mTime = Date.now();
  }
}
