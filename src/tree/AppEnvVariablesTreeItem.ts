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
    const deployment = await this.app.getActiveDeployment(true);
    const vars = deployment.properties?.deploymentSettings?.environmentVariables || {};
    return Object.entries(vars).map(e => this.toAppSettingItem(e[0], e[1] + '', {
      hidden: true,
      type: 'azureSpringCloud.app.envVariable',
      typeLabel: 'environment variable'
    }));
  }

  public async updateSettingValue(key: string, newVal: string, _context: IActionContext): Promise<string> {
    const deployment = await this.app.getActiveDeployment();
    const envVars: { [propertyName: string]: string; } = deployment.properties?.deploymentSettings?.environmentVariables || {};
    envVars[key] = newVal;
    await this.app.client.deployments.update(this.app.resourceGroup, this.app.serviceName, this.app.name, deployment.name!, {
      properties: {
        deploymentSettings: {
          environmentVariables: envVars
        }
      }
    });
    this.app.refresh();
    return newVal;
  }

  public async deleteSettingItem(_key: string, _context: IActionContext) {
    //TODO
  }
}
