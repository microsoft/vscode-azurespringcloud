import { AzureParentTreeItem, IActionContext, TreeItemIconPath } from "vscode-azureextensionui";
import { TreeUtils } from "../utils/treeUtils";
import { AppTreeItem } from "./AppTreeItem";
import { AppSettingTreeItem, Options } from "./AppSettingTreeItem";
import { ext } from "../extensionVariables";
import { DeploymentResource } from "@azure/arm-appplatform/esm/models";
import { AppPlatformManagementClient } from "@azure/arm-appplatform";
import getThemedIconPath = TreeUtils.getThemedIconPath;

export abstract class AppSettingsTreeItem extends AzureParentTreeItem {
  public readonly childTypeLabel: string = 'App Setting';
  public parent: AppTreeItem;
  protected deployment: DeploymentResource;

  protected constructor(parent: AppTreeItem, deployment: DeploymentResource) {
    super(parent);
    this.deployment = deployment;
  }

  public get iconPath(): TreeItemIconPath {
    return getThemedIconPath('settings');
  }

  public get client(): AppPlatformManagementClient {
    return this.parent.client;
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

  public async refreshImpl(): Promise<void> {
    this.deployment = await this.parent.getActiveDeployment(true);
    return super.refreshImpl?.();
  }

  public abstract updateSettingValue(id: string, value: string, _context: IActionContext): Promise<string>;

  public abstract async deleteSettingItem(_key: string, _context: IActionContext);
}
