// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzExtTreeDataProvider, AzExtTreeItem, IAzExtOutputChannel, IExperimentationServiceAdapter } from "@microsoft/vscode-azext-utils";
import { DiagnosticCollection, Disposable, ExtensionContext, TreeView } from "vscode";
import { AzureAccountTreeItem } from "./tree/AzureAccountTreeItem";

/**
 * Namespace for common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */
// tslint:disable-next-line: export-name
export namespace ext {
    export let context: ExtensionContext;
    export let outputChannel: IAzExtOutputChannel;
    export let ignoreBundle: boolean | undefined;
    export let prefix: string = 'azureSpringApps';

    export let tree: AzExtTreeDataProvider;
    export let treeView: TreeView<AzExtTreeItem>;
    export let azureAccountTreeItem: AzureAccountTreeItem;
    export let diagnosticWatcher: Disposable | undefined;
    export let diagnosticCollection: DiagnosticCollection;
    export let experimentationService: IExperimentationServiceAdapter;
}
