/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { openInPortal } from "@microsoft/vscode-azext-azureutils";
import { DialogResponses, IActionContext, openReadOnlyJson } from "@microsoft/vscode-azext-utils";
import { OpenDialogOptions, TextEditor, Uri, window, workspace, WorkspaceFolder } from "vscode";
import { ext } from "../extensionVariables";
import { EnhancedApp } from "../model";
import { AppInstanceTreeItem } from "../tree/AppInstanceTreeItem";
import { AppSettingsTreeItem } from "../tree/AppSettingsTreeItem";
import { AppSettingTreeItem } from "../tree/AppSettingTreeItem";
import { AppTreeItem } from "../tree/AppTreeItem";
import { localize, openUrl } from "../utils";

export namespace AppCommands {

    export async function openPublicEndpoint(context: IActionContext, node?: AppTreeItem): Promise<void> {
        node = await getNode(node, context);
        let app: EnhancedApp = node.getApp(context);
        let endPoint: string | undefined = await app.getPublicEndpoint();
        if (!endPoint || endPoint.toLowerCase() === 'none') {
            await context.ui.showWarningMessage(`App [${app.name}] is not publicly accessible. Do you want to set it public and assign it a public endpoint?`, { modal: true }, DialogResponses.yes);
            await toggleEndpoint(context, node);
            app = await app.reload();
            endPoint = await app.getPublicEndpoint();
        }
        await openUrl(endPoint!);
    }

    export async function openTestEndpoint(context: IActionContext, node?: AppTreeItem): Promise<void> {
        node = await getNode(node, context);
        const app: EnhancedApp = node.getApp(context);
        const endpoint: string | undefined = await app.getTestEndpoint();
        await openUrl(endpoint!);
    }

    export async function toggleEndpoint(context: IActionContext, node?: AppTreeItem): Promise<void> {
        node = await getNode(node, context);
        await node.toggleEndpoint(context);
    }

    export async function startApp(context: IActionContext, node?: AppTreeItem): Promise<AppTreeItem> {
        node = await getNode(node, context);
        await node.runWithTemporaryDescription(context, localize('starting', 'Starting...'), async () => {
            await node!.getApp(context).start();
            node!.refresh(context);
        });
        return node;
    }

    export async function stopApp(context: IActionContext, node?: AppTreeItem): Promise<AppTreeItem> {
        node = await getNode(node, context);
        const app: EnhancedApp = node.getApp(context);
        await context.ui.showWarningMessage(`Are you sure to stop "${app.name}"?`, { modal: true }, DialogResponses.yes);
        await node.runWithTemporaryDescription(context, localize('stopping', 'Stopping...'), async () => {
            await app.stop();
            node!.refresh(context);
        });
        return node;
    }

    export async function restartApp(context: IActionContext, node?: AppTreeItem): Promise<AppTreeItem> {
        node = await getNode(node, context);
        await node.runWithTemporaryDescription(context, localize('restart', 'Restarting...'), async () => {
            await node!.getApp(context)?.restart();
            node!.refresh(context);
        });
        return node;
    }

    export async function deleteApp(context: IActionContext, node?: AppTreeItem): Promise<void> {
        node = await getNode(node, context);
        const app: EnhancedApp = node.getApp(context);
        await context.ui.showWarningMessage(`Are you sure to delete Spring App "${app.name}"?`, { modal: true }, DialogResponses.deleteResponse);
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
            await node.runWithTemporaryDescription(context, localize('deploying', 'Deploying...'), async () => node!.deployArtifact(context, artifactPath));
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

    export async function startStreamingLogs(context: IActionContext, node?: AppInstanceTreeItem): Promise<AppInstanceTreeItem> {
        node = await getInstanceNode(node, context);
        await node.runWithTemporaryDescription(context, localize('startStreamingLog', 'Starting streaming log...'), async () => {
            const appTreeItem: AppTreeItem = node!.parent.parent;
            return appTreeItem.getApp(context).startStreamingLogs(context, node?.data!, appTreeItem.data);
        });
        return node;
    }

    export async function stopStreamingLogs(context: IActionContext, node?: AppInstanceTreeItem): Promise<AppInstanceTreeItem> {
        node = await getInstanceNode(node, context);
        await node.runWithTemporaryDescription(context, localize('stopStreamingLog', 'Stopping streaming log...'), async () => {
            const appTreeItem: AppTreeItem = node!.parent.parent;
            return appTreeItem.getApp(context).stopStreamingLogs(node?.data!, appTreeItem.data);
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
        await node.runWithTemporaryDescription(context, localize('editing', 'Editing...'), async () => {
            await node.updateSettingsValue(context);
        });
    }

    export async function editSetting(context: IActionContext, node: AppSettingTreeItem): Promise<AppSettingTreeItem> {
        await node.runWithTemporaryDescription(context, localize('editing', 'Editing...'), async () => {
            await node.updateValue(context);
        });
        return node;
    }

    export async function deleteSetting(context: IActionContext, node: AppSettingTreeItem): Promise<AppSettingTreeItem> {
        await context.ui.showWarningMessage(`Are you sure to delete "${node.key || node.value}"?`, { modal: true }, DialogResponses.deleteResponse);
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
