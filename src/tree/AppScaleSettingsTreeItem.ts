import { AzExtTreeItem, AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep, IActionContext } from "vscode-azureextensionui";
import { AppSettingsTreeItem } from "./AppSettingsTreeItem";
import { AppTreeItem } from "./AppTreeItem";
import { DeploymentResource } from "@azure/arm-appplatform/esm/models";
import { localize } from "../utils";
import { window } from "vscode";
import { IScaleSettingsUpdateWizardContext } from "../commands/steps/settings/scalesettings/IScaleSettingsUpdateWizardContext";
import { IScaleSettings } from "../commands/steps/settings/scalesettings/IScaleSettings";
import { UpdateScaleSettingsStep } from "../commands/steps/settings/scalesettings/UpdateScaleSettingsStep";
import { InputNumberStep } from "../commands/steps/settings/scalesettings/InputNumberStep";

export class AppScaleSettingsTreeItem extends AppSettingsTreeItem {
  public static contextValue: string = 'azureSpringCloud.app.scaleSettings';
  private static readonly _options = {
    hidden: false,
    type: 'azureSpringCloud.app.scaleSetting',
    typeLabel: "scale setting"
  };
  public readonly contextValue: string = AppScaleSettingsTreeItem.contextValue;
  public readonly id: string = AppScaleSettingsTreeItem.contextValue;
  public readonly label: string = 'Scale Settings';

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

  public async updateSettingsValue(context: IActionContext, newSettings?: IScaleSettings): Promise<void> {
    const deploymentSettings = this.deployment.properties?.deploymentSettings;
    const wizardContext: IScaleSettingsUpdateWizardContext = Object.assign(context, this.root, {
      app: this.parent.app,
      deployment: this.deployment,
      newSettings: Object.assign({
        cpu: deploymentSettings?.cpu,
        memory: deploymentSettings?.memoryInGB,
        capacity: this.deployment.sku?.capacity
      }, newSettings || {})
    });

    const promptSteps: AzureWizardPromptStep<IScaleSettingsUpdateWizardContext>[] = [];
    const executeSteps: AzureWizardExecuteStep<IScaleSettingsUpdateWizardContext>[] = [];
    if (!newSettings) {
      promptSteps.push(new InputNumberStep("Capacity", 'capacity'));
      promptSteps.push(new InputNumberStep("Memory[in GB]", 'memory'));
      promptSteps.push(new InputNumberStep("vCPU", 'cpu'));
    }
    executeSteps.push(new UpdateScaleSettingsStep());
    const title: string = localize('scaling', 'Scaling Spring Cloud app "{0}"', this.parent.name);
    const wizard: AzureWizard<IScaleSettingsUpdateWizardContext> = new AzureWizard(wizardContext, {promptSteps, executeSteps, title});
    await wizard.prompt();
    await wizard.execute();
    const createSucceeded: string = localize('scaled', 'Successfully scaled Spring Cloud app "{0}".', this.parent.name);
    window.showInformationMessage(createSucceeded);
    this.parent.refresh();
  }

  public async updateSettingValue(key: string, newVal: string, context: IActionContext): Promise<string> {
    const numVal = Number(newVal);
    if (isNaN(numVal)) {
      throw new Error('Only number is acceptable!');
    }
    const settings: IScaleSettings = {};
    if (key === 'vCPU') {
      settings.cpu = numVal;
    } else if (key === 'Memory/GB') {
      settings.memory = numVal;
    } else {
      settings.capacity = numVal;
    }
    await this.updateSettingsValue(context, settings);
    return newVal;
  }

  public async deleteSettingItem(_key: string, _context: IActionContext) {
    throw new Error("Scale settings can not be deleted.");
  }
}
