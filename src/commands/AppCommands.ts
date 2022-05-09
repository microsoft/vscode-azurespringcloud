/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { OpenDialogOptions, TextEditor, Uri, window, workspace, WorkspaceFolder } from "vscode";
import { DialogResponses, IActionContext, openInPortal, openReadOnlyJson } from "vscode-azureextensionui";
import { ext } from "../extensionVariables";
import { AppInstanceTreeItem } from "../tree/AppInstanceTreeItem";
import { AppSettingsTreeItem } from "../tree/AppSettingsTreeItem";
import { AppSettingTreeItem } from "../tree/AppSettingTreeItem";
import { AppTreeItem } from "../tree/AppTreeItem";
import { localize, openUrl } from "../utils";

export namespace AppCommands {

    export async function openPublicEndpoint(context: IActionContext, node?: AppTreeItem): Promise<void> {
        node = await getNode(node, context);
        const endPoint: string | undefined = await node.app.getPublicEndpoint();
        if (!endPoint || endPoint.toLowerCase() === 'none') {
            await ext.ui.showWarningMessage(`App [${node.app.name}] is not publicly accessible. Do you want to set it public and assign it a public endpoint?`, { modal: true }, DialogResponses.yes);
            await toggleEndpoint(context, node);
        }
        await openUrl(endPoint!);
    }

    export async function openTestEndpoint(context: IActionContext, node?: AppTreeItem): Promise<void> {
        node = await getNode(node, context);
        const endpoint: string | undefined = await node.app.getTestEndpoint();
        await openUrl(endpoint!);
    }

    export async function toggleEndpoint(context: IActionContext, node?: AppTreeItem): Promise<void> {
        node = await getNode(node, context);
        await node.toggleEndpoint(context);
    }

    export async function startApp(context: IActionContext, node?: AppTreeItem): Promise<AppTreeItem> {
        node = await getNode(node, context);
        await node.runWithTemporaryDescription(localize('starting', 'Starting...'), async () => {
            await node!.app.start();
            node!.refresh();
        });
        return node;
    }

    export async function stopApp(context: IActionContext, node?: AppTreeItem): Promise<AppTreeItem> {
        node = await getNode(node, context);
        await ext.ui.showWarningMessage(`Are you sure to stop "${node.app.name}"?`, { modal: true }, DialogResponses.yes);
        await node.runWithTemporaryDescription(localize('stopping', 'Stopping...'), async () => {
            await node!.app.stop();
            node!.refresh();
        });
        return node;
    }

    export async function restartApp(context: IActionContext, node?: AppTreeItem): Promise<AppTreeItem> {
        node = await getNode(node, context);
        await node.runWithTemporaryDescription(localize('restart', 'Restarting...'), async () => {
            await node!.app.restart();
            node!.refresh();
        });
        return node;
    }

    export async function deleteApp(context: IActionContext, node?: AppTreeItem): Promise<void> {
        node = await getNode(node, context);
        await ext.ui.showWarningMessage(`Are you sure to delete Spring App "${node.app.name}"?`, { modal: true }, DialogResponses.deleteResponse);
        await node.deleteTreeItem(context);
    }

    export async function deploy(context: IActionContext, node?: AppTreeItem): Promise<AppTreeItem> {
        node = await getNode(node, context);
        const defaultUri: Uri | undefined = await getTargetOrWorkspacePath();
        const options: OpenDialogOptions = {
            defaultUri,
            canSelectMany: false,
            openLabel: 'Select',
            filters: {
                'Jar files': ['jar']
            }
        };
        const fileUri: Uri[] | undefined = await window.showOpenDialog(options);
        if (fileUri && fileUri[0] !== undefined) {
            const artifactPath: string = fileUri[0].fsPath;
            await node.runWithTemporaryDescription(localize('deploying', 'Deploying...'), async () => node!.deployArtifact(context, artifactPath));
        }
        return node;
    }

    export async function scale(context: IActionContext, node?: AppTreeItem): Promise<AppTreeItem> {
        node = await getNode(node, context);
        await node.scaleInstances(context);
        return node;
    }

    export async function openPortal(context: IActionContext, node?: AppTreeItem): Promise<AppTreeItem> {
        node = await getNode(node, context);
        await openInPortal(node, node.fullId);
        return node;
    }

    export async function viewProperties(context: IActionContext, node?: AppTreeItem): Promise<AppTreeItem> {
        node = await getNode(node, context);
        await openReadOnlyJson(node, node.data);
        return node;
    }

    export async function startStreamingLogs(_context: IActionContext, node?: AppInstanceTreeItem): Promise<AppInstanceTreeItem> {
        node = await getInstanceNode(node, _context);
        await node.runWithTemporaryDescription(localize('startStreamingLog', 'Starting streaming log...'), async () => {
            const appTreeItem: AppTreeItem = node!.parent.parent;
            return appTreeItem.app.startStreamingLogs(node?.data!, appTreeItem.data);
        });
        return node;
    }

    export async function stopStreamingLogs(_context: IActionContext, node?: AppInstanceTreeItem): Promise<AppInstanceTreeItem> {
        node = await getInstanceNode(node, _context);
        await node.runWithTemporaryDescription(localize('stopStreamingLog', 'Stopping streaming log...'), async () => {
            const appTreeItem: AppTreeItem = node!.parent.parent;
            return appTreeItem.app.stopStreamingLogs(node?.data!, appTreeItem.data);
        });
        return node;
    }

    export async function viewInstanceProperties(context: IActionContext, node?: AppInstanceTreeItem): Promise<AppInstanceTreeItem> {
        node = await getInstanceNode(node, context);
        await openReadOnlyJson(node, node.data);
        return node;
    }

    export async function toggleVisibility(context: IActionContext, node: AppSettingTreeItem | AppSettingsTreeItem): Promise<void> {
        await node.toggleVisibility(context);
    }

    export async function addSetting(context: IActionContext, node: AppSettingsTreeItem): Promise<void> {
        await node.createChild(context);
    }

    export async function editSettings(context: IActionContext, node: AppSettingsTreeItem): Promise<void> {
        await node.runWithTemporaryDescription(localize('editing', 'Editing...'), async () => {
            await node.updateSettingsValue(context);
        });
    }

    export async function editSetting(context: IActionContext, node: AppSettingTreeItem): Promise<AppSettingTreeItem> {
        await node.runWithTemporaryDescription(localize('editing', 'Editing...'), async () => {
            await node.updateValue(context);
        });
        return node;
    }

    export async function deleteSetting(context: IActionContext, node: AppSettingTreeItem): Promise<AppSettingTreeItem> {
        await ext.ui.showWarningMessage(`Are you sure to delete "${node.key || node.value}"?`, { modal: true }, DialogResponses.deleteResponse);
        await node.deleteTreeItem(context);
        return node;
    }

    async function getNode(node: AppTreeItem | undefined, context: IActionContext): Promise<AppTreeItem> {
        return node ?? await ext.tree.showTreeItemPicker<AppTreeItem>(AppTreeItem.contextValue, context);
    }

    async function getInstanceNode(node: AppInstanceTreeItem | undefined, context: IActionContext): Promise<AppInstanceTreeItem> {
        return node ?? await ext.tree.showTreeItemPicker<AppInstanceTreeItem>(AppInstanceTreeItem.contextValue, context);
    }

    async function getTargetOrWorkspacePath(): Promise<Uri | undefined> {
        const editor: TextEditor | undefined = window.activeTextEditor;
        let root: WorkspaceFolder | undefined = workspace.workspaceFolders?.[0];
        if (editor && editor.document.uri.scheme === 'file') {
            root = workspace.getWorkspaceFolder(editor.document.uri) ?? root;
        }
        return root ? Uri.joinPath(root.uri, 'target') : undefined;
    }

}
