import { AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { AppSettingsTreeItem } from "./AppSettingsTreeItem";
import { SpringCloudAppTreeItem } from "./SpringCloudAppTreeItem";

export class AppScalingSettingsTreeItem extends AppSettingsTreeItem {
  public static contextValue: string = 'azureSpringCloud.app.scalingSettings';
  public readonly contextValue: string = AppScalingSettingsTreeItem.contextValue;
  public readonly id: string = AppScalingSettingsTreeItem.contextValue;
  public readonly label: string = 'Scaling Settings';

  public constructor(parent: SpringCloudAppTreeItem) {
    super(parent);
  }

  public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
    const deploymentName = this.app.data.properties?.activeDeploymentName!;
    const deployment = await this.app.client.deployments.get(this.app.resourceGroup, this.app.serviceName, this.app.name, deploymentName);
    const settings = deployment.properties?.deploymentSettings;
    const vals = {
      'vCPU': settings?.cpu ?? 0,
      'Memory/GB': settings?.memoryInGB ?? 0,
      'Instance Count': deployment.properties?.instances?.length ?? 0
    };
    return Object.entries(vals).map(e => this.toAppSettingItem(e[0], e[1] + ''));
  }
}
