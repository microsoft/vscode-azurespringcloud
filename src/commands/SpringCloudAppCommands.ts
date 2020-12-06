import * as ui from "vscode-azureextensionui";
import { DialogResponses, IActionContext, openReadOnlyJson } from "vscode-azureextensionui";
import { ext } from "../extensionVariables";
import { SpringCloudAppTreeItem } from "../tree/SpringCloudAppTreeItem";
import { localize, openUrl } from "../utils";
import { AppSettingTreeItem } from "../tree/AppSettingTreeItem";
import { AppSettingsTreeItem } from "../tree/AppSettingsTreeItem";

export namespace SpringCloudAppCommands {
  export async function openPublicEndpoint(context: ui.IActionContext, node?: SpringCloudAppTreeItem): Promise<void> {
    node = await getNode(node, context);
    const endPoint = await node.getPublicEndpoint();
    await openUrl(endPoint!);
  }

  export async function openTestEndpoint(context: ui.IActionContext, node?: SpringCloudAppTreeItem): Promise<void> {
    node = await getNode(node, context);
    const endpoint = await node.getTestEndpoint();
    await openUrl(endpoint!);
  }

  export async function startApp(context: ui.IActionContext, node?: SpringCloudAppTreeItem): Promise<SpringCloudAppTreeItem> {
    node = await getNode(node, context);
    await node.runWithTemporaryDescription(localize('starting', 'Starting...'), async () => {
      return node!.start();
    });
    return node;
  }

  export async function stopApp(context: ui.IActionContext, node?: SpringCloudAppTreeItem): Promise<SpringCloudAppTreeItem> {
    node = await getNode(node, context);
    await ext.ui.showWarningMessage(`Are you sure to stop Spring Cloud Service "${node.name}"?`, {modal: true}, DialogResponses.yes);
    await node.runWithTemporaryDescription(localize('stopping', 'Stopping...'), async () => {
      return node!.stop();
    });
    return node;
  }

  export async function restartApp(context: ui.IActionContext, node?: SpringCloudAppTreeItem): Promise<SpringCloudAppTreeItem> {
    node = await getNode(node, context);
    await node.runWithTemporaryDescription(localize('restart', 'Restarting...'), async () => {
      return node!.restart();
    });
    return node;
  }

  export async function deleteApp(context: ui.IActionContext, node?: SpringCloudAppTreeItem): Promise<SpringCloudAppTreeItem> {
    node = await getNode(node, context);
    await ext.ui.showWarningMessage(`Are you sure to delete Spring Cloud App "${node.name}"?`, {modal: true}, DialogResponses.deleteResponse);
    await node.runWithTemporaryDescription(localize('deleting', 'Deleting...'), async () => {
      return node!.deleteTreeItem(context);
    });
    return node;
  }

  export async function viewAppProperties(context: IActionContext, node?: SpringCloudAppTreeItem): Promise<void> {
    node = await getNode(node, context);
    await openReadOnlyJson(node, node.app);
  }

  export async function toggleVisibility(context: IActionContext, node: AppSettingTreeItem | AppSettingsTreeItem) {
    await node.toggleVisibility(context);
  }

  export async function addSetting(context: IActionContext, node: AppSettingsTreeItem) {
    await node.createChild(context);
  }

  export async function editSetting(context: IActionContext, node: AppSettingTreeItem): Promise<AppSettingTreeItem> {
    const prompt = node.key ? `Enter value for "${node.key}"` : `Update ${node.typeLabel}`;
    const newVal: string = await ext.ui.showInputBox({prompt, value: node.value});
    if (newVal?.trim()) {
      await node.runWithTemporaryDescription(localize('editing', 'Editing...'), async () => {
        await node.updateValue(newVal, context);
      });
      return node;
    } else {
      return SpringCloudAppCommands.deleteSetting(context, node);
    }
  }

  export async function deleteSetting(context: IActionContext, node: AppSettingTreeItem): Promise<AppSettingTreeItem> {
    if (node.deletable) {
      await ext.ui.showWarningMessage(`Are you sure to delete ${node.typeLabel} "${node.id}"?`, {modal: true}, DialogResponses.deleteResponse);
      await node.runWithTemporaryDescription(localize('deleting', 'Deleting...'), async () => {
        await node.deleteTreeItem(context);
      });
    } else {
      await ext.ui.showWarningMessage(`This ${node.typeLabel} item is not deletable!`, DialogResponses.cancel);
    }
    return node;
  }

  async function getNode(node: SpringCloudAppTreeItem | undefined, context: IActionContext): Promise<SpringCloudAppTreeItem> {
    return node ?? await ext.tree.showTreeItemPicker<SpringCloudAppTreeItem>(SpringCloudAppTreeItem.contextValue, context);
  }
}
