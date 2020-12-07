import * as ui from "vscode-azureextensionui";
import { DialogResponses, IActionContext } from "vscode-azureextensionui";
import { ext } from "../extensionVariables";
import { ServiceTreeItem } from "../tree/ServiceTreeItem";
import { localize, openUrl } from "../utils";
import { SubscriptionTreeItem } from "../tree/SubscriptionTreeItem";

export namespace SpringCloudServiceCommands {

  export async function createServiceInPortal(_context: ui.IActionContext, _node?: SubscriptionTreeItem): Promise<void> {
    await openUrl('https://portal.azure.com/#create/Microsoft.AppPlatform')
  }

  export async function createApp(context: ui.IActionContext, node?: ServiceTreeItem): Promise<void> {
    node = await getNode(node, context);
    await node.createChild(context);
  }

  export async function deleteService(context: ui.IActionContext, node?: ServiceTreeItem): Promise<ServiceTreeItem> {
    node = await getNode(node, context);
    await ext.ui.showWarningMessage(`Are you sure to delete Spring Cloud Service "${node.name}"?`, {modal: true}, DialogResponses.deleteResponse);
    await node.runWithTemporaryDescription(localize('deleting', 'Deleting...'), async () => {
      return node!.deleteTreeItem(context);
    });
    return node;
  }

  async function getNode(node: ServiceTreeItem | undefined, context: IActionContext) {
    return node ?? await ext.tree.showTreeItemPicker<ServiceTreeItem>(ServiceTreeItem.contextValue, context);
  }
}
