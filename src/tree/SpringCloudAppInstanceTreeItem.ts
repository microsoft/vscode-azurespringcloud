import { AzureTreeItem, TreeItemIconPath } from "vscode-azureextensionui";
import { treeUtils } from "../utils/treeUtils";
import { SpringCloudAppInstancesTreeItem } from "./SpringCloudAppInstancesTreeItem";
import { DeploymentInstance } from "@azure/arm-appplatform/src/models/index";

export class SpringCloudAppInstanceTreeItem extends AzureTreeItem {
  public static contextValue: string = 'azureSpringCloud.app.instance';
  public contextValue: string = SpringCloudAppInstanceTreeItem.contextValue;
  public readonly parent: SpringCloudAppInstancesTreeItem;
  private instance: DeploymentInstance;

  public constructor(parent: SpringCloudAppInstancesTreeItem, instance: DeploymentInstance) {
    super(parent);
    this.instance = instance;
  }

  public get id(): string {
    return this.instance.name!;
  }

  public get label(): string {
    return this.instance.name!;
  }

  public get description(): string {
    return this.instance.status!;
  }

  public get iconPath(): TreeItemIconPath {
    return treeUtils.getIconPath('azure-springcloud-app-instance');
  }
}
