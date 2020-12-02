import { AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { AppSettingsTreeItem } from "./AppSettingsTreeItem";
import { SpringCloudAppTreeItem } from "./SpringCloudAppTreeItem";

export class AppEnvVariablesTreeItem extends AppSettingsTreeItem {
  public static contextValue: string = 'azureSpringCloud.app.envVariables';
  public readonly contextValue: string = AppEnvVariablesTreeItem.contextValue;
  public readonly id: string = AppEnvVariablesTreeItem.contextValue;
  public readonly label: string = 'Environment Variables';

  public constructor(parent: SpringCloudAppTreeItem) {
    super(parent);
  }

  public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
    const deploymentName = this.app.data.properties?.activeDeploymentName!;
    const deployment = await this.app.client.deployments.get(this.app.resourceGroup, this.app.serviceName, this.app.name, deploymentName);
    const vars = deployment.properties?.deploymentSettings?.environmentVariables || {};
    return Object.entries(vars).map(e => this.toAppSettingItem(e[0], e[1] + '', {hideValue: true}));
  }
}
