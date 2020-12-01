import * as ui from "vscode-azureextensionui";
import { DialogResponses, IActionContext, openReadOnlyJson } from "vscode-azureextensionui";
import { ext } from "../extensionVariables";
import { SpringCloudServiceTreeItem } from "../tree/SpringCloudServiceTreeItem";
import { localize } from "../utils/localize";

export class SpringCloudServiceCommands {
  public static async openServiceInPortal(context: ui.IActionContext, node?: SpringCloudServiceTreeItem): Promise<void> {
    node = await SpringCloudServiceCommands.getNode(node, context);
    await ui.openInPortal(node.root, node.fullId);
  }

  public static async createApp(context: ui.IActionContext, node?: SpringCloudServiceTreeItem): Promise<void> {
    node = await SpringCloudServiceCommands.getNode(node, context);
  }

  public static async deleteService(context: ui.IActionContext, node?: SpringCloudServiceTreeItem): Promise<SpringCloudServiceTreeItem> {
    node = await SpringCloudServiceCommands.getNode(node, context);
    await ext.ui.showWarningMessage(`Are you sure to delete Spring Cloud Service "${node.name}"?`, {modal: true}, DialogResponses.deleteResponse);
    await node.runWithTemporaryDescription(localize('deleting', 'Deleting...'), async () => {
      return node!.deleteTreeItem(context);
    });
    return node;
  }

  public static async viewServiceProperties(context: IActionContext, node?: SpringCloudServiceTreeItem): Promise<void> {
    node = await SpringCloudServiceCommands.getNode(node, context);
    await openReadOnlyJson(node, node.data);
  }

  private static async getNode(node: SpringCloudServiceTreeItem | undefined, context: IActionContext) {
    return node ?? await ext.tree.showTreeItemPicker<SpringCloudServiceTreeItem>(SpringCloudServiceTreeItem.contextValue, context);
  }
}
