import { AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { AppSettingsTreeItem } from "./AppSettingsTreeItem";
import { SpringCloudAppTreeItem } from "./SpringCloudAppTreeItem";
import { DeploymentResource } from "@azure/arm-appplatform/esm/models";

export class AppScaleSettingsTreeItem extends AppSettingsTreeItem {
  public static contextValue: string = 'azureSpringCloud.app.scaleSettings';
  private static readonly _options = {
    hidden: false,
    type: 'azureSpringCloud.app.scaleSetting',
    typeLabel: "scale setting"
  };
  public readonly contextValue: string = AppScaleSettingsTreeItem.contextValue;
  public readonly id: string = AppScaleSettingsTreeItem.contextValue;
  public readonly label: string = 'Scaling Settings';

  public constructor(parent: SpringCloudAppTreeItem) {
    super(parent);
  }

  public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
    const deployment = await this.app.getActiveDeployment(true);
    const settings = deployment.properties?.deploymentSettings;
    const vals = {
      'vCPU': settings?.cpu ?? 0,
      'Memory/GB': settings?.memoryInGB ?? 0,
      'Capacity': deployment.sku?.capacity ?? 0
    };
    return Object.entries(vals).map(e => this.toAppSettingItem(e[0], e[1] + '', Object.assign({}, AppScaleSettingsTreeItem._options)));
  }

  public async updateSettingValue(key: string, newVal: string, _context: IActionContext): Promise<string> {
    const deployment = await this.app.getActiveDeployment();
    const resource = AppScaleSettingsTreeItem.toResource(key, newVal, deployment);
    await this.app.client.deployments.update(this.app.resourceGroup, this.app.serviceName, this.app.name, deployment.name!, resource)
    this.app.refresh();
    return newVal;
  }

  public async deleteSettingItem(_key: string, _context: IActionContext) {
    throw new Error("Scale settings can not be deleted.");
  }

  private static toResource(key: string, newVal: string, deployment: DeploymentResource): DeploymentResource {
    const numVal = Number(newVal);
    if (isNaN(numVal)) {
      throw new Error('Only number is acceptable!');
    }
    if (key === 'vCPU') {
      return {properties: {deploymentSettings: {cpu: numVal}}};
    } else if (key === 'memoryInGB') {
      return {properties: {deploymentSettings: {memoryInGB: numVal}}};
    } else {
      deployment.sku!.capacity = numVal;
      return {sku: deployment.sku};
    }
  }
}
