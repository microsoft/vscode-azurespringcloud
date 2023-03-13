/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DialogResponses, IActionContext, openReadOnlyJson, openUrl } from "@microsoft/vscode-azext-utils";
import { MessageItem, OpenDialogOptions, TextEditor, Uri, window, workspace, WorkspaceFolder } from "vscode";
import { ext } from "../extensionVariables";
import { EnhancedApp } from "../service/EnhancedApp";
import { EnhancedDeployment } from "../service/EnhancedDeployment";
import { DebugController } from "../service/remotedebugging/DebugController";
import { AppEnvVariablesItem } from "../tree/AppEnvVariablesItem";
import { AppInstanceItem } from "../tree/AppInstanceItem";
import { AppItem } from "../tree/AppItem";
import { AppJvmOptionsItem } from "../tree/AppJvmOptionsItem";
import { AppSettingItem } from "../tree/AppSettingItem";
import { AppSettingsItem } from "../tree/AppSettingsItem";
import { ResourceItemBase } from "../tree/SpringAppsBranchDataProvider";
import * as utils from "../utils";
import { pickApp, pickAppInstance } from "../utils/pickContainerApp";

export namespace AppCommands {

    export async function openPublicEndpoint(context: IActionContext, n?: AppItem): Promise<void> {
        const item: AppItem = await getAppItem(context, n);
        const app: EnhancedApp = item.app;
        let endpoint: string | undefined = await app.getPublicEndpoint();
        if (!endpoint || endpoint.toLowerCase() === 'none') {
            await context.ui.showWarningMessage(`App "${app.name}" is not publicly accessible. Do you want to assign it a public endpoint?`, { modal: true }, DialogResponses.yes);
            await assignEndpoint(context, item);
            endpoint = await app.getPublicEndpoint();
        }
        if (endpoint) {
            await openUrl(endpoint);
        }
    }

    export async function openTestEndpoint(context: IActionContext, n?: AppItem): Promise<void> {
        const item: AppItem = await getAppItem(context, n);
        const app: EnhancedApp = item.app;
        const endpoint: string | undefined = await app.getTestEndpoint();
        if (endpoint) {
            await openUrl(endpoint);
        }
    }

    export async function assignEndpoint(context: IActionContext, n?: AppItem): Promise<void> {
        const item: AppItem = await getAppItem(context, n);
        const app: EnhancedApp = item.app;
        const doing: string = `Assigning public endpoint to "${app.name}".`;
        const done: string = `Successfully assigned public endpoint to "${app.name}".`;
        await utils.runInBackground(doing, done, () => app.setPublic(true));
    }

    export async function unassignEndpoint(context: IActionContext, n?: AppItem): Promise<void> {
        const item: AppItem = await getAppItem(context, n);
        const app: EnhancedApp = item.app;
        const doing: string = `Unassigning public endpoint to "${app.name}".`;
        const done: string = `Successfully unassigned public endpoint to "${app.name}".`;
        await utils.runInBackground(doing, done, () => app.setPublic(false));
    }

    export async function startApp(context: IActionContext, n?: AppItem): Promise<void> {
        const item: AppItem = await getAppItem(context, n);
        await item.start();
    }

    export async function stopApp(context: IActionContext, n?: AppItem): Promise<void> {
        const item: AppItem = await getAppItem(context, n);
        await item.stop();
    }

    export async function restartApp(context: IActionContext, n?: AppItem): Promise<void> {
        const item: AppItem = await getAppItem(context, n);
        await item.restart();
    }

    export async function deleteApp(context: IActionContext, n?: AppItem): Promise<void> {
        const item: AppItem = await getAppItem(context, n);
        const app: EnhancedApp = item.app;
        await context.ui.showWarningMessage(`Are you sure to delete "${app.name}"?`, { modal: true }, DialogResponses.deleteResponse);
        const deleting: string = utils.localize('deletingSpringCLoudApp', 'Deleting Spring app "{0}"...', app.name);
        const deleted: string = utils.localize('deletedSpringCLoudApp', 'Successfully deleted Spring app "{0}".', app.name);
        await utils.runInBackground(deleting, deleted, () => item.remove());
    }

    export async function deploy(context: IActionContext, n?: AppItem): Promise<void> {
        const item: AppItem = await getAppItem(context, n);
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
            await item.deployArtifact(context, artifactPath);
        }
    }

    export async function scale(context: IActionContext, n?: AppItem): Promise<void> {
        const item: AppItem = await getAppItem(context, n);
        await item.scaleInstances(context);
    }

    export async function enableRemoteDebugging(context: IActionContext, n?: AppItem, confirmation?: string): Promise<AppItem> {
        const item: AppItem = await getAppItem(context, n);
        let result: MessageItem | undefined;
        if (confirmation) {
            const actionResponse: MessageItem = { title: 'Enable' };
            result = await context.ui.showWarningMessage(confirmation, { modal: true }, actionResponse, DialogResponses.learnMore);
            if (result === DialogResponses.learnMore) {
                void openUrl('https://aka.ms/asa-remotedebug');
                return item;
            }
        }
        await ext.state.runWithTemporaryDescription(item.id, 'Updating...', async () => {
            const doing: string = `Enabling remote debugging for app "${item.app.name}".`;
            await utils.runInBackground(doing, null, async () => {
                const deployment: EnhancedDeployment | undefined = await item.app.getActiveDeployment();
                if (!deployment) {
                    void window.showWarningMessage(`Failed to enable remote debugging for app "${item.app.name}", because it has no active deployment.`);
                    return;
                }
                await deployment.enableDebugging();
                await item.app.refresh();
                ext.state.notifyChildrenChanged(item.id);
                void (async () => {
                    const msg: string = `Successfully enabled remote debugging for app "${item.app.name}".`;
                    const action: string | undefined = await window.showInformationMessage(msg, 'Start Debugging', 'Learn More');
                    if (action === 'Learn More') {
                        void openUrl('https://aka.ms/asa-remotedebug');
                    } else if (action) {
                        void AppCommands.startRemoteDebugging(context, item);
                    }
                })();
            });
        });
        return item;
    }

    export async function disableRemoteDebugging(context: IActionContext, n?: AppItem): Promise<AppItem> {
        const item: AppItem = await getAppItem(context, n);
        const doing: string = `Disabling remote debugging for app "${item.app.name}".`;
        const done: string = `Successfully disabled remote debugging for app "${item.app.name}".`;
        await ext.state.runWithTemporaryDescription(item.id, 'Updating...', async () => {
            await utils.runInBackground(doing, done, async () => {
                const deployment: EnhancedDeployment | undefined = await item.app.getActiveDeployment();
                if (!deployment) {
                    void window.showWarningMessage(`Disable Remote Debugging: App "${item.app.name}" has no active deployment.`);
                    return;
                }
                await deployment.disableDebugging();
                await item.app.refresh();
                ext.state.notifyChildrenChanged(item.id);
            });
        });
        return item;
    }

    export async function startRemoteDebugging(context: IActionContext, n?: ResourceItemBase): Promise<void> {
        const item: AppInstanceItem = await getInstanceItem(context, n);
        const description = utils.localize('startRemoteDebugging', 'Attaching debugger...');
        await ext.state.runWithTemporaryDescription(item.id, description, () => DebugController.attachDebugger(context, item));
    }

    export async function startStreamingLogs(context: IActionContext, n?: AppInstanceItem): Promise<void> {
        const item: AppInstanceItem = await getInstanceItem(context, n);
        const doing: string = `Starting log streaming for instance "${item.instance.name}".`;
        const done: string = `Successfully started log streaming for instance "${item.instance.name}".`;
        await utils.runInBackground(doing, done, async () => {
            const app: EnhancedApp = item.parent.parent.app;
            return app.startStreamingLogs(context, item.instance);
        });
    }

    export async function stopStreamingLogs(context: IActionContext, n?: AppInstanceItem): Promise<void> {
        const item: AppInstanceItem = await getInstanceItem(context, n);
        const doing: string = `Stopping log streaming for instance "${item.instance.name}".`;
        const done: string = `Successfully stopped log streaming for instance "${item.instance.name}".`;
        await utils.runInBackground(doing, done, async () => {
            const app: EnhancedApp = item.parent.parent.app;
            return app.stopStreamingLogs(item.instance);
        });
    }

    export async function viewInstanceProperties(context: IActionContext, n?: AppInstanceItem): Promise<void> {
        const item: AppInstanceItem = await getInstanceItem(context, n);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { deployment, ...instance } = item.instance;
        const fullId: string = item.instance.id;
        await openReadOnlyJson({ label: item.instance.name, fullId }, instance);
    }

    export async function toggleVisibility(context: IActionContext, item: AppSettingItem | AppSettingsItem): Promise<void> {
        await item.toggleVisibility(context);
    }

    export async function addSetting(context: IActionContext, item: AppEnvVariablesItem | AppJvmOptionsItem): Promise<void> {
        await item.createChild(context);
    }

    export async function editSettings(context: IActionContext, item: AppSettingsItem): Promise<void> {
        const description = utils.localize('editing', 'Editing...');
        await ext.state.runWithTemporaryDescription(item.id, description, () => item.updateSettingsValue(context));
    }

    export async function editSetting(context: IActionContext, item: AppSettingItem): Promise<void> {
        const description = utils.localize('editing', 'Editing...');
        await ext.state.runWithTemporaryDescription(item.id, description, () => item.updateValue(context));
    }

    export async function deleteSetting(context: IActionContext, item: AppSettingItem): Promise<void> {
        await context.ui.showWarningMessage(`Are you sure to delete "${item.key || item.value}"?`, { modal: true }, DialogResponses.deleteResponse);
        await item.remove(context);
    }

    async function getAppItem(context: IActionContext, item?: ResourceItemBase): Promise<AppItem> {
        item ??= await pickApp(context);
        return item as AppItem;
    }

    async function getInstanceItem(context: IActionContext, item?: ResourceItemBase): Promise<AppInstanceItem> {
        item ??= await pickAppInstance(context);
        return item as AppInstanceItem;
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
