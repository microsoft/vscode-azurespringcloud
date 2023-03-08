// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureAccountTreeItemBase } from "@microsoft/vscode-azext-azureutils";
import { AzExtTreeDataProvider, IAzExtOutputChannel, IExperimentationServiceAdapter } from "@microsoft/vscode-azext-utils";
import { AzureHostExtensionApi } from "@microsoft/vscode-azext-utils/hostapi";
import { DiagnosticCollection, Disposable, ExtensionContext, TreeView } from "vscode";

/**
 * Namespace for common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */
// tslint:disable-next-line: export-name
export namespace ext {
    export let context: ExtensionContext;
    export let outputChannel: IAzExtOutputChannel;
    export let ignoreBundle: boolean | undefined;
    export const prefix: string = 'azureSpringApps';

    export let tree: AzExtTreeDataProvider;
    export let treeView: TreeView<unknown>;
    export let azureAccountTreeItem: AzureAccountTreeItemBase;
    export let diagnosticWatcher: Disposable | undefined;
    export let diagnosticCollection: DiagnosticCollection;
    export let experimentationService: IExperimentationServiceAdapter;

    export let rgApi: AzureHostExtensionApi;
}
