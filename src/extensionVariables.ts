// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IAzExtOutputChannel, IExperimentationServiceAdapter } from "@microsoft/vscode-azext-utils";
import { AzureResourcesExtensionApi } from "@microsoft/vscode-azureresources-api";
import { ExtensionContext } from "vscode";
import { SpringAppsBranchDataProvider } from "./tree/SpringAppsBranchDataProvider";
import { TreeItemStateStore } from "./tree/TreeItemState";

/**
 * Namespace for common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */
// tslint:disable-next-line: export-name
export namespace ext {
    export let context: ExtensionContext;
    export let outputChannel: IAzExtOutputChannel;
    export let ignoreBundle: boolean | undefined;
    export const prefix: string = 'springApps';

    export let experimentationService: IExperimentationServiceAdapter;
    export let rgApiV2: AzureResourcesExtensionApi;

    export let state: TreeItemStateStore;
    export let branchDataProvider: SpringAppsBranchDataProvider;
}
