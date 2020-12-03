import { AzExtTreeItem, IActionContext, ICreateChildImplContext } from "vscode-azureextensionui";
import { AppSettingsTreeItem } from "./AppSettingsTreeItem";
import { SpringCloudAppTreeItem } from "./SpringCloudAppTreeItem";
import { ext } from "../extensionVariables";
import { DeploymentResource } from "@azure/arm-appplatform/esm/models";

export class AppJvmOptionsTreeItem extends AppSettingsTreeItem {
  public static contextValue: string = 'azureSpringCloud.app.jvmOptions';
  private static readonly _options = {
    hidden: false,
    type: 'azureSpringCloud.app.jvmOption',
    typeLabel: "JVM option"
  };
  public readonly contextValue: string = AppJvmOptionsTreeItem.contextValue;
  public readonly id: string = AppJvmOptionsTreeItem.contextValue;
  public readonly label: string = 'JVM Options';
  private static readonly JVM_OPTION_PATTERN = /^-[a-zA-Z_]+\S*$/; //TODO: @wangmi confirm
  private options: string[];

  public constructor(parent: SpringCloudAppTreeItem) {
    super(parent);
  }

  public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
    const deployment = await this.app.getActiveDeployment(true);
    const optionsStr = deployment.properties?.deploymentSettings?.jvmOptions?.trim();
    this.options = optionsStr ? optionsStr?.split(/\s+/) : [];
    return this.options.map(option => this.toAppSettingItem('', option.trim(), Object.assign({}, AppJvmOptionsTreeItem._options)));
  }

  public async createChildImpl(context: ICreateChildImplContext): Promise<AzExtTreeItem> {
    const newVal: string = await ext.ui.showInputBox({
      prompt: 'Enter new JVM option',
      validateInput: (v: string): string | undefined => {
        if (!AppJvmOptionsTreeItem.JVM_OPTION_PATTERN.test(v)) {
          return `Invalid JVM option.`;
        } else if (this.options.includes(v)) {
          return `${v} is already set`;
        }
        return undefined;
      }
    });
    context.showCreatingTreeItem(newVal);
    await this.updateSettingValue(undefined, newVal, context);
    return this.toAppSettingItem('', newVal, Object.assign({}, AppJvmOptionsTreeItem._options))
  }

  public async updateSettingValue(oldVal: string | undefined, newVal: string, _context: IActionContext): Promise<string> {
    const deployment: DeploymentResource = await this.app.getActiveDeployment();
    if (oldVal === undefined) {
      this.options.push(newVal);
    } else if (oldVal !== newVal.trim()) {
      const index = this.options.indexOf(oldVal);
      this.options.splice(index, 1, newVal);
    }
    await this.app.client.deployments.update(this.app.resourceGroup, this.app.serviceName, this.app.name, deployment.name!, {
      properties: {
        deploymentSettings: {
          jvmOptions: this.options.join(' ')
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
