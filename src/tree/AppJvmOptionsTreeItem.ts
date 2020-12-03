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
    const deployment = await this.app.getActiveDeployment(true);
    const optionsStr = deployment.properties?.deploymentSettings?.jvmOptions;
    const options = optionsStr?.trim() ? optionsStr.split(/\s+/) : [];
    return options.map(option => this.toAppSettingItem('', option.trim(), {
      hidden: false,
      type: 'azureSpringCloud.app.jvmOption',
      typeLabel: "JVM option"
    }));
  }

  public async updateSettingValue(oldVal: string, newVal: string, _context: IActionContext): Promise<string> {
    const deployment = await this.app.getActiveDeployment();
    const oldOptions = deployment.properties?.deploymentSettings?.jvmOptions;
    const newOptions = oldOptions?.replace(oldVal, newVal);
    await this.app.client.deployments.update(this.app.resourceGroup, this.app.serviceName, this.app.name, deployment.name!, {
      properties: {
        deploymentSettings: {
          jvmOptions: newOptions
        }
      }
    });
    this.app.refresh();
    return newVal;
  }

  public async deleteSettingItem(oldVal: string, context: IActionContext) {
    return this.updateSettingValue(oldVal, '', context);
  }
}
