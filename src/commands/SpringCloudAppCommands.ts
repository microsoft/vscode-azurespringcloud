import * as ui from "vscode-azureextensionui";
import { DialogResponses, IActionContext, openReadOnlyJson } from "vscode-azureextensionui";
import { ext } from "../extensionVariables";
import { SpringCloudAppTreeItem } from "../tree/SpringCloudAppTreeItem";
import { localize } from "../utils/localize";
import { openUrl } from "../utils/openUrl";
import { AppSettingTreeItem } from "../tree/AppSettingTreeItem";
import { AppSettingsTreeItem } from "../tree/AppSettingsTreeItem";

export class SpringCloudAppCommands {
  public static async openAppInPortal(context: ui.IActionContext, node?: SpringCloudAppTreeItem): Promise<void> {
    node = await SpringCloudAppCommands.getNode(node, context);
    await ui.openInPortal(node.root, node.fullId);
  }

  public static async openPublicEndpoint(context: ui.IActionContext, node?: SpringCloudAppTreeItem): Promise<void> {
    node = await SpringCloudAppCommands.getNode(node, context);
    const endPoint = await node.getPublicEndpoint();
    await openUrl(endPoint!);
  }

  public static async openTestEndpoint(context: ui.IActionContext, node?: SpringCloudAppTreeItem): Promise<void> {
    node = await SpringCloudAppCommands.getNode(node, context);
    const endpoint = await node.getTestEndpoint();
    await openUrl(endpoint!);
  }

  public static async startApp(context: ui.IActionContext, node?: SpringCloudAppTreeItem): Promise<SpringCloudAppTreeItem> {
    node = await SpringCloudAppCommands.getNode(node, context);
    await node.runWithTemporaryDescription(localize('starting', 'Starting...'), async () => {
      return node!.start();
    });
    return node;
  }

  public static async stopApp(context: ui.IActionContext, node?: SpringCloudAppTreeItem): Promise<SpringCloudAppTreeItem> {
    node = await SpringCloudAppCommands.getNode(node, context);
    await ext.ui.showWarningMessage(`Are you sure to stop Spring Cloud Service "${node.name}"?`, {modal: true}, DialogResponses.yes);
    await node.runWithTemporaryDescription(localize('stopping', 'Stopping...'), async () => {
      return node!.stop();
    });
    return node;
  }

  public static async restartApp(context: ui.IActionContext, node?: SpringCloudAppTreeItem): Promise<SpringCloudAppTreeItem> {
    node = await SpringCloudAppCommands.getNode(node, context);
    await node.runWithTemporaryDescription(localize('restart', 'Restarting...'), async () => {
      return node!.restart();
    });
    return node;
  }

  public static async deleteApp(context: ui.IActionContext, node?: SpringCloudAppTreeItem): Promise<SpringCloudAppTreeItem> {
    node = await SpringCloudAppCommands.getNode(node, context);
    await ext.ui.showWarningMessage(`Are you sure to delete Spring Cloud App "${node.name}"?`, {modal: true}, DialogResponses.deleteResponse);
    await node.runWithTemporaryDescription(localize('deleting', 'Deleting...'), async () => {
      return node!.deleteTreeItem(context);
    });
    return node;
  }

  public static async viewAppProperties(context: IActionContext, node?: SpringCloudAppTreeItem): Promise<void> {
    node = await SpringCloudAppCommands.getNode(node, context);
    await openReadOnlyJson(node, node.data);
  }

  public static async toggleSettingsVisibility(context: IActionContext, node: AppSettingsTreeItem) {
    await node.toggleVisibility(context);
  }

  public static async toggleVisibility(context: IActionContext, node: AppSettingTreeItem) {
    await node.toggleVisibility(context);
  }

  public static async refreshSettings(_context: IActionContext, node: AppSettingsTreeItem) {
    await node.refresh();
  }

  public static async addSetting(_context: IActionContext, _node: AppSettingsTreeItem) {
  }

  public static async editSetting(context: IActionContext, node: AppSettingTreeItem): Promise<AppSettingTreeItem> {
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

  public static async deleteSetting(context: IActionContext, node: AppSettingTreeItem): Promise<AppSettingTreeItem> {
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

  private static async getNode(node: SpringCloudAppTreeItem | undefined, context: IActionContext): Promise<SpringCloudAppTreeItem> {
    return node ?? await ext.tree.showTreeItemPicker<SpringCloudAppTreeItem>(SpringCloudAppTreeItem.contextValue, context);
  }
}
