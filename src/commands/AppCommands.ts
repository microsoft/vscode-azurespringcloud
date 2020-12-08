import { OpenDialogOptions, Uri, window } from "vscode";
import { DialogResponses, IActionContext } from "vscode-azureextensionui";
import { ext } from "../extensionVariables";
import { AppInstanceTreeItem } from "../tree/AppInstanceTreeItem";
import { AppSettingsTreeItem } from "../tree/AppSettingsTreeItem";
import { AppSettingTreeItem } from "../tree/AppSettingTreeItem";
import { AppTreeItem } from "../tree/AppTreeItem";
import { localize, openUrl } from "../utils";

export namespace AppCommands {

    export async function openPublicEndpoint(context: IActionContext, node?: AppTreeItem): Promise<void> {
        node = await getNode(node, context);
        const endPoint: string | undefined = await node.getPublicEndpoint();
        if (!endPoint || endPoint.toLowerCase() === 'none') {
            window.showWarningMessage(localize('noPublicEndpoint', "App[{0}] has not been assigned public endpoint.", node.name));
            await ext.ui.showWarningMessage(`App[${node.name}] has not been assigned public endpoint. Do you want to set it public?`, { modal: true }, DialogResponses.yes);
            await toggleEndpoint(context, node);
        }
        await openUrl(endPoint!);
    }

    export async function openTestEndpoint(context: IActionContext, node?: AppTreeItem): Promise<void> {
        node = await getNode(node, context);
        const endpoint: string | undefined = await node.getTestEndpoint();
        await openUrl(endpoint!);
    }

    export async function toggleEndpoint(context: IActionContext, node?: AppTreeItem): Promise<void> {
        node = await getNode(node, context);
        await node.toggleEndpoint(context);
    }

    export async function startApp(context: IActionContext, node?: AppTreeItem): Promise<AppTreeItem> {
        node = await getNode(node, context);
        await node.runWithTemporaryDescription(localize('starting', 'Starting...'), async () => {
            return node!.start();
        });
        return node;
    }

    export async function stopApp(context: IActionContext, node?: AppTreeItem): Promise<AppTreeItem> {
        node = await getNode(node, context);
        await ext.ui.showWarningMessage(`Are you sure to stop Spring Cloud Service "${node.name}"?`, { modal: true }, DialogResponses.yes);
        await node.runWithTemporaryDescription(localize('stopping', 'Stopping...'), async () => {
            return node!.stop();
        });
        return node;
    }

    export async function restartApp(context: IActionContext, node?: AppTreeItem): Promise<AppTreeItem> {
        node = await getNode(node, context);
        await node.runWithTemporaryDescription(localize('restart', 'Restarting...'), async () => {
            return node!.restart();
        });
        return node;
    }

    export async function deleteApp(context: IActionContext, node?: AppTreeItem): Promise<void> {
        node = await getNode(node, context);
        await ext.ui.showWarningMessage(`Are you sure to delete Spring Cloud App "${node.name}"?`, { modal: true }, DialogResponses.deleteResponse);
        await node.deleteTreeItem(context);
    }

    export async function deploy(context: IActionContext, node?: AppTreeItem): Promise<AppTreeItem> {
        node = await getNode(node, context);
        const options: OpenDialogOptions = {
            canSelectMany: false,
            openLabel: 'Select',
            filters: {
                'Jar files': ['jar']
            }
        };
        const fileUri: Uri[] | undefined = await window.showOpenDialog(options);
        if (fileUri && fileUri[0] !== undefined) {
            const artifactUrl: string = fileUri[0].fsPath;
            await node.runWithTemporaryDescription(localize('deploying', 'Deploying...'), async () => node!.deployArtifact(context, artifactUrl));
        }
        return node;
    }

    export async function scale(context: IActionContext, node?: AppTreeItem): Promise<AppTreeItem> {
        node = await getNode(node, context);
        await node.scaleInstances(context);
        return node;
    }

    export async function startStreamingLogs(_context: IActionContext, node?: AppInstanceTreeItem): Promise<AppInstanceTreeItem> {
        node = await getInstanceNode(node, _context);
        await node.runWithTemporaryDescription(localize('restart', 'Restarting...'), async () => {
            return node!.startStreamingLogs();
        });
        return node;
    }

    export async function stopStreamingLogs(_context: IActionContext, node?: AppInstanceTreeItem): Promise<AppInstanceTreeItem> {
        node = await getInstanceNode(node, _context);
        await node.runWithTemporaryDescription(localize('restart', 'Restarting...'), async () => {
            return node!.stopStreamingLogs();
        });
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
        await node.runWithTemporaryDescription(localize('deleting', 'Deleting...'), async () => {
            await node.deleteTreeItem(context);
        });
        return node;
    }

    async function getNode(node: AppTreeItem | undefined, context: IActionContext): Promise<AppTreeItem> {
        return node ?? await ext.tree.showTreeItemPicker<AppTreeItem>(AppTreeItem.contextValue, context);
    }

    async function getInstanceNode(node: AppInstanceTreeItem | undefined, context: IActionContext): Promise<AppInstanceTreeItem> {
        return node ?? await ext.tree.showTreeItemPicker<AppInstanceTreeItem>(AppInstanceTreeItem.contextValue, context);
    }
}
