import { AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { AppSettingsTreeItem } from "./AppSettingsTreeItem";
import { SpringCloudAppTreeItem } from "./SpringCloudAppTreeItem";

export class AppJvmOptionsTreeItem extends AppSettingsTreeItem {
  public static contextValue: string = 'azureSpringCloud.app.jvmOptions';
  public readonly contextValue: string = AppJvmOptionsTreeItem.contextValue;
  public readonly id: string = AppJvmOptionsTreeItem.contextValue;
  public readonly label: string = 'JVM Options';

  public constructor(parent: SpringCloudAppTreeItem) {
    super(parent);
  }

  public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
    const deploymentName = this.app.data.properties?.activeDeploymentName!;
    const deployment = await this.app.client.deployments.get(this.app.resourceGroup, this.app.serviceName, this.app.name, deploymentName);
    const optionsStr = deployment.properties?.deploymentSettings?.jvmOptions;
    const options = optionsStr?.trim() ? optionsStr.split(/\s+/) : [];
    return options.map(option => this.toAppSettingItem('', option.trim()));
  }
}
