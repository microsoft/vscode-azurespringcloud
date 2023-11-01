// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CommandCallback, DialogResponses, IActionContext, IParsedError, openReadOnlyJson, openUrl, parseError, registerCommandWithTreeNodeUnwrapping, registerErrorHandler, registerReportIssueCommand } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { MessageItem, OpenDialogOptions, TextEditor, Uri, WorkspaceFolder, window, workspace } from "vscode";
import { instrumentOperation } from 'vscode-extension-telemetry-wrapper';
import { ext } from "./extensionVariables";
import { EnhancedApp } from "./model/EnhancedApp";
import { EnhancedDeployment } from "./model/EnhancedDeployment";
import { EnhancedService } from "./model/EnhancedService";
import { AppEnvVariablesItem } from "./tree/AppEnvVariablesItem";
import { AppInstanceItem } from "./tree/AppInstanceItem";
import { AppItem } from "./tree/AppItem";
import { AppJvmOptionsItem } from "./tree/AppJvmOptionsItem";
import { AppSettingItem } from "./tree/AppSettingItem";
import { AppSettingsItem } from "./tree/AppSettingsItem";
import { pickApp, pickAppInstance, pickApps } from "./tree/ItemPicker";
import ServiceItem from "./tree/ServiceItem";
import { ResourceItemBase } from "./tree/SpringAppsBranchDataProvider";
import * as utils from "./utils";
import { showError } from './utils';
import { createApp } from './workflows/createapp/createApp';
import { deployArtifact } from './workflows/deploy/deployArtifact';
import { DebugController } from "./workflows/remotedebugging/DebugController";

export function registerCommands(): void {
    registerCommandWithTelemetryWrapper('azureSpringApps.common.refresh', refreshNode);
    registerCommandWithTelemetryWrapper('azureSpringApps.common.toggleVisibility', toggleVisibility);
    registerCommandWithTelemetryWrapper('azureSpringApps.apps.createInPortal', createServiceInPortal);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.create', createSpringApp);
    registerCommandWithTelemetryWrapper('azureSpringApps.apps.delete', deleteService);
    registerCommandWithTelemetryWrapper('azureSpringApps.apps.openLiveView', openAppsLiveView);
    registerCommandWithTelemetryWrapper('azureSpringApps.apps.openAppAccelerator', openAppAccelerator);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.openPublicEndpoint', openPublicEndpoint);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.openTestEndpoint', openTestEndpoint);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.assignEndpoint', assignEndpoint);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.unassignEndpoint', unassignEndpoint);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.start', startApp);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.stop', stopApp);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.restart', restartApp);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.delete', deleteApp);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.deploy', deploy);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.scale', scale);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.openLiveView', openAppLiveView);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.enableRemoteDebugging', enableRemoteDebugging);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.disableRemoteDebugging', disableRemoteDebugging);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.instance.startRemoteDebugging', startRemoteDebugging);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.instance.startStreamingLog', startStreamingLogs);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.instance.stopStreamingLog', stopStreamingLogs);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.settings.add', addSetting);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.settings.edit', editSettings);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.setting.edit', editSetting);
    registerCommandWithTelemetryWrapper('azureSpringApps.app.setting.delete', deleteSetting);
    // Suppress "Report an Issue" button for all errors in favor of the command
    registerErrorHandler(c => c.errorHandling.suppressReportIssue = true);
    registerReportIssueCommand('springApps.reportIssue');
    registerCommandWithTelemetryWrapper('azureSpringApps.file.deploy', deployFromFile);
}

function registerCommandWithTelemetryWrapper(commandId: string, callback: CommandCallback): void {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    const callbackWithTroubleshooting: CommandCallback = (context: IActionContext, ...args: []) => instrumentOperation(commandId, async () => {
        try {
            await callback(context, ...args);
        } catch (error) {
            const e: IParsedError = parseError(error);
            if (!e.isUserCancelledError) {
                // tslint:disable-next-line: no-unsafe-any
                showError(commandId, error);
            }
            throw error;
        }
    })();
    registerCommandWithTreeNodeUnwrapping(commandId, callbackWithTroubleshooting);
}

async function refreshNode(_context: IActionContext, node: ResourceItemBase): Promise<void> {
    await node.refresh();
}

export async function createServiceInPortal(_context: IActionContext): Promise<void> {
    await openUrl('https://portal.azure.com/#create/Microsoft.AppPlatform');
}

export async function createSpringApp(context: IActionContext, n?: ServiceItem): Promise<void> {
    const item: ServiceItem = await getAppsItem(context, n);
    await createApp(context, item);
}

export async function deleteService(context: IActionContext, n?: ServiceItem): Promise<void> {
    const item: ServiceItem = await getAppsItem(context, n);
    const service: EnhancedService = item.service;
    await context.ui.showWarningMessage(`Are you sure to delete "${item.service.name}"?`, { modal: true }, DialogResponses.deleteResponse);
    const deleting: string = utils.localize('deletingSpringCLoudService', 'Deleting Azure Spring Apps "{0}"...', service.name);
    const deleted: string = utils.localize('deletedSpringCloudService', 'Successfully deleted Azure Spring Apps "{0}".', service.name);
    await utils.runInBackground(deleting, deleted, () => item.remove(context));
}

export async function openAppsLiveView(context: IActionContext, n?: ServiceItem): Promise<void> {
    const item: ServiceItem = await getAppsItem(context, n);
    const service: EnhancedService = item.service;
    if (!(await service.isDevToolsPublic()) || !(await service.isLiveViewEnabled())) {
        const response = await context.ui.showWarningMessage(`Application Live View of Spring Apps "${service.name}" is not enabled or publicly accessible.`, { modal: true }, DialogResponses.learnMore);
        if (response === DialogResponses.learnMore) {
            return openUrl("https://learn.microsoft.com/en-us/azure/spring-apps/how-to-use-application-live-view?tabs=Portal");
        }
        return;
    }
    const endpoint: string | undefined = await service.getLiveViewUrl();
    if (endpoint && endpoint.toLowerCase() !== 'none') {
        await openUrl(endpoint);
    }
}

export async function openAppLiveView(context: IActionContext, n?: AppItem): Promise<void> {
    const item: AppItem = await getAppItem(context, n);
    const app: EnhancedApp = item.app;
    if (!(await app.service.isDevToolsPublic()) || !(await app.service.isLiveViewEnabled())) {
        const response = await context.ui.showWarningMessage(`Application Live View of Spring Apps "${app.service.name}" is not enabled or publicly accessible.`, { modal: true }, DialogResponses.learnMore);
        if (response === DialogResponses.learnMore) {
            return openUrl("https://learn.microsoft.com/en-us/azure/spring-apps/how-to-use-application-live-view?tabs=Portal");
        }
        return;
    }
    const endpoint: string | undefined = await app.getLiveViewUrl();
    if (endpoint && endpoint.toLowerCase() !== 'none') {
        await openUrl(endpoint);
    }
}

export async function openAppAccelerator(context: IActionContext, n?: ServiceItem): Promise<void> {
    const item: ServiceItem = await getAppsItem(context, n);
    const service: EnhancedService = item.service;
    if (!(await service.isDevToolsPublic()) || !(await service.isAppAcceleratorEnabled())) {
        const response = await context.ui.showWarningMessage(`Application Accelerator of Spring Apps "${service.name}"  is not enabled or publicly accessible.`, { modal: true }, DialogResponses.learnMore);
        if (response === DialogResponses.learnMore) {
            return openUrl("https://learn.microsoft.com/en-us/azure/spring-apps/how-to-use-accelerator?tabs=Portal");
        }
        return;
    }
    let acceleratorExt = vscode.extensions.getExtension("vmware.tanzu-app-accelerator");
    if (!acceleratorExt) {
        await context.ui.showWarningMessage(`This feature depends on extension "Tanzu App Accelerator" provided by VMWare, do you want to install it?`, { modal: true }, DialogResponses.yes)
        const installing = 'Installing extension "Tanzu App Accelerator".';
        const installed = 'Extension "Tanzu App Accelerator" is successfully installed.';
        await utils.runInBackground(installing, installed, async () => {
            // install directly
            await vscode.commands.executeCommand('workbench.extensions.installExtension', 'vmware.tanzu-app-accelerator');
            // void vscode.commands.executeCommand('workbench.extensions.action.installExtensions', 'vmware.tanzu-app-accelerator');
            acceleratorExt = vscode.extensions.getExtension("vmware.tanzu-app-accelerator");
            let rounds: number = 0;
            while (!acceleratorExt && rounds++ < 15) {
                await utils.wait(1000);
                acceleratorExt = vscode.extensions.getExtension("vmware.tanzu-app-accelerator");
            }
            if (!acceleratorExt) {
                throw new Error('"Tanzu App Accelerator" is not ready, try later please.')
            }
        });
    }
    const config = await service.getAppAcceleratorConfig();
    if (config) {
        await vscode.workspace.getConfiguration('tanzu-app-accelerator').update('tanzuApplicationPlatformGuiUrl', config.guiUrl, vscode.ConfigurationTarget.Global);
        config.authClientId && await vscode.workspace.getConfiguration('tanzu-app-accelerator').update('authClientId', config.authClientId, vscode.ConfigurationTarget.Global);
        config.authIssuerUrl && await vscode.workspace.getConfiguration('tanzu-app-accelerator').update('authIssuerUrl', config.authIssuerUrl, vscode.ConfigurationTarget.Global);
        await vscode.commands.executeCommand('tanzu-app-accelerator.AcceleratorList.focus');
        await vscode.commands.executeCommand('tanzu-app-accelerator.refreshAccelerators');
    }
}

export async function openPublicEndpoint(context: IActionContext, n?: AppItem): Promise<void> {
    const item: AppItem = await getAppItem(context, n);
    const app: EnhancedApp = item.app;
    if (!(await app.properties)?.public) {
        await context.ui.showWarningMessage(`App "${app.name}" is not publicly accessible. Do you want to assign it a public endpoint?`, { modal: true }, DialogResponses.yes);
        await assignEndpoint(context, item);
    }
    const endpoint: string | undefined = await app.getPublicEndpoint();
    if (endpoint && endpoint.toLowerCase() !== 'none') {
        await openUrl(endpoint);
    }
}

export async function openTestEndpoint(context: IActionContext, n?: AppItem): Promise<void> {
    const item: AppItem = await getAppItem(context, n);
    const app: EnhancedApp = item.app;
    if (await app.service.isConsumptionTier()) {
        void window.showErrorMessage(`Test endpoint is not supported for Azure Spring apps of consumption plan for now.`);
        return;
    }
    const endpoint: string | undefined = await app.getTestEndpoint();
    if (endpoint && endpoint.toLowerCase() !== 'none') {
        await openUrl(endpoint);
    }
}

export async function assignEndpoint(context: IActionContext, n?: AppItem): Promise<void> {
    const item: AppItem = await getAppItem(context, n);
    const app: EnhancedApp = item.app;
    const doing: string = `Assigning public endpoint to "${app.name}".`;
    const done: string = `Successfully assigned public endpoint to "${app.name}".`;
    await ext.state.runWithTemporaryDescription(item.id, 'Updating...', () => {
        return utils.runInBackground(doing, done, () => app.setPublic(true));
    });
}

export async function unassignEndpoint(context: IActionContext, n?: AppItem): Promise<void> {
    const item: AppItem = await getAppItem(context, n);
    const app: EnhancedApp = item.app;
    const doing: string = `Unassigning public endpoint to "${app.name}".`;
    const done: string = `Successfully unassigned public endpoint to "${app.name}".`;
    await ext.state.runWithTemporaryDescription(item.id, 'Updating...', () => {
        return utils.runInBackground(doing, done, () => app.setPublic(false));
    });
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
        await deployArtifact(context, item, artifactPath);
    }
}

export async function deployFromFile(context: IActionContext, defaultUri?: Uri, _arg2?: Uri[]): Promise<void> {
    let jarFile: Uri | undefined = undefined;
    defaultUri = defaultUri ?? await getTargetOrWorkspacePath();
    if (!defaultUri || !defaultUri.fsPath.endsWith(".jar")) {
        const options: OpenDialogOptions = {
            defaultUri,
            canSelectMany: false,
            openLabel: 'Select',
            filters: {
                'Jar files': ['jar']
            }
        };
        const fileUri: Uri[] | undefined = await window.showOpenDialog(options);
        jarFile = fileUri ? fileUri[0] : undefined;
    } else {
        jarFile = defaultUri;
    }

    if (jarFile) {
        const item: AppItem = await getAppItem(context, undefined);
        const artifactPath: string = jarFile.fsPath;
        await deployArtifact(context, item, artifactPath);
    }
}

export async function scale(context: IActionContext, n?: AppItem): Promise<void> {
    const item: AppItem = await getAppItem(context, n);
    await ext.state.runWithTemporaryDescription(item.id, 'Updating...', () => {
        return item.scaleInstances(context);
    });
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
            const deployment: EnhancedDeployment | undefined = await item.app.activeDeployment;
            if (!deployment) {
                void window.showWarningMessage(`Failed to enable remote debugging for app "${item.app.name}", because it has no active deployment.`);
                return;
            }
            await deployment.enableDebugging();
            await item.refresh();
            ext.state.notifyChildrenChanged(item.id);
            void (async () => {
                const msg: string = `Successfully enabled remote debugging for app "${item.app.name}".`;
                const action: string | undefined = await window.showInformationMessage(msg, 'Start Debugging', 'Learn More');
                if (action === 'Learn More') {
                    void openUrl('https://aka.ms/asa-remotedebug');
                } else if (action) {
                    void startRemoteDebugging(context, item);
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
            const deployment: EnhancedDeployment | undefined = await item.app.activeDeployment;
            if (!deployment) {
                void window.showWarningMessage(`Disable Remote Debugging: App "${item.app.name}" has no active deployment.`);
                return;
            }
            await deployment.disableDebugging();
            await item.refresh();
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
        await item.instance.startStreamingLogs(context);
        ext.state.notifyChildrenChanged(item.id);
    });
}

export async function stopStreamingLogs(context: IActionContext, n?: AppInstanceItem): Promise<void> {
    const item: AppInstanceItem = await getInstanceItem(context, n);
    const doing: string = `Stopping log streaming for instance "${item.instance.name}".`;
    const done: string = `Successfully stopped log streaming for instance "${item.instance.name}".`;
    await utils.runInBackground(doing, done, async () => {
        await item.instance.stopStreamingLogs();
        ext.state.notifyChildrenChanged(item.id);
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
    const description = utils.localize('deleting', 'Deleting...');
    await ext.state.runWithTemporaryDescription(item.id, description, () => item.remove(context));
}

async function getAppsItem(context: IActionContext, item?: ResourceItemBase): Promise<ServiceItem> {
    if (item instanceof ServiceItem) {
        return item;
    }
    return await pickApps(context, item);
}

async function getAppItem(context: IActionContext, item?: ResourceItemBase): Promise<AppItem> {
    if (item instanceof AppItem) {
        return item;
    }
    return await pickApp(context, item);
}

async function getInstanceItem(context: IActionContext, item?: ResourceItemBase): Promise<AppInstanceItem> {
    if (item instanceof AppInstanceItem) {
        return item;
    }
    return await pickAppInstance(context, item);
}

async function getTargetOrWorkspacePath(): Promise<Uri | undefined> {
    const editor: TextEditor | undefined = window.activeTextEditor;
    let root: WorkspaceFolder | undefined = workspace.workspaceFolders?.[0];
    if (editor && editor.document.uri.scheme === 'file') {
        root = workspace.getWorkspaceFolder(editor.document.uri) ?? root;
    }
    return root ? Uri.joinPath(root.uri, 'target') : undefined;
}
