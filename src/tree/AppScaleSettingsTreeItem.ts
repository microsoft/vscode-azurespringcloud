import { AzExtTreeItem, IActionContext } from "vscode-azureextensionui";
import { AppSettingsTreeItem } from "./AppSettingsTreeItem";
import { AppTreeItem } from "./AppTreeItem";
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

  public constructor(parent: AppTreeItem, deployment: DeploymentResource) {
    super(parent, deployment);
  }

  public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
    const settings = this.deployment.properties?.deploymentSettings;
    const vals = {
      'vCPU': settings?.cpu ?? 0,
      'Memory/GB': settings?.memoryInGB ?? 0,
      'Capacity': this.deployment.sku?.capacity ?? 0
    };
    return Object.entries(vals).map(e => this.toAppSettingItem(e[0], e[1] + '', Object.assign({}, AppScaleSettingsTreeItem._options)));
  }

  public async updateSettingValue(key: string, newVal: string, _context: IActionContext): Promise<string> {
    const resource = AppScaleSettingsTreeItem.toResource(key, newVal, this.deployment);
    await this.client.deployments.update(this.parent.resourceGroup, this.parent.serviceName, this.parent.name, this.deployment.name!, resource)
    this.parent.refresh();
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
