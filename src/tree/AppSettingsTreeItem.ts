import { AzureParentTreeItem, DialogResponses, IActionContext, TreeItemIconPath } from "vscode-azureextensionui";
import { treeUtils } from "../utils/treeUtils";
import { SpringCloudAppTreeItem } from "./SpringCloudAppTreeItem";
import { ext } from "../extensionVariables";
import { AppSettingTreeItem, Options } from "./AppSettingTreeItem";
import getThemedIconPath = treeUtils.getThemedIconPath;

export abstract class AppSettingsTreeItem extends AzureParentTreeItem {
  public readonly childTypeLabel: string = 'App Setting';

  protected constructor(parent: SpringCloudAppTreeItem) {
    super(parent);
  }

  public get app(): SpringCloudAppTreeItem {
    return <SpringCloudAppTreeItem>this.parent;
  }

  public get iconPath(): TreeItemIconPath {
    return getThemedIconPath('settings');
  }

  public hasMoreChildrenImpl(): boolean {
    return false;
  }

  public toAppSettingItem(key: string, value: string, options?: Options): AppSettingTreeItem {
    return new AppSettingTreeItem(this, key, value, options);
  }

  public async editItem(key: string, value: string, _context: IActionContext): Promise<string> {
    return await ext.ui.showInputBox({prompt: `Enter setting value for "${key}"`, value});
  }

  public async deleteItem(_key: string, _context: IActionContext) {
    await ext.ui.showWarningMessage(`Are you sure you want to delete setting "${_key}"?`, {modal: true}, DialogResponses.deleteResponse);
  }
}
