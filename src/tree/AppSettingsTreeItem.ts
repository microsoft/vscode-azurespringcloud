import { AzureParentTreeItem, IActionContext, TreeItemIconPath } from "vscode-azureextensionui";
import { TreeUtils } from "../utils/treeUtils";
import { SpringCloudAppTreeItem } from "./SpringCloudAppTreeItem";
import { AppSettingTreeItem, Options } from "./AppSettingTreeItem";
import { ext } from "../extensionVariables";
import getThemedIconPath = TreeUtils.getThemedIconPath;

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
    return new AppSettingTreeItem(this, key.trim(), value.trim(), options);
  }

  public async toggleVisibility(context: IActionContext): Promise<void> {
    const settings: AppSettingTreeItem[] = <AppSettingTreeItem[]>await ext.tree.getChildren(this);
    const hidden = settings.every(s => s.hidden);
    settings.forEach(s => s.toggleVisibility && s.toggleVisibility(context, !hidden));
  }

  public abstract updateSettingValue(id: string, value: string, _context: IActionContext): Promise<string>;

  public abstract async deleteSettingItem(_key: string, _context: IActionContext);
}
