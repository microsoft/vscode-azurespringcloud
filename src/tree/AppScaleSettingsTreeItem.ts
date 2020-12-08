import { DeploymentResource, DeploymentSettings } from "@azure/arm-appplatform/esm/models";
import { window } from "vscode";
import { AzExtTreeItem, AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep, IActionContext } from "vscode-azureextensionui";
import { InputNumberStep } from "../commands/steps/settings/scalesettings/InputNumberStep";
import { IScaleSettings } from "../commands/steps/settings/scalesettings/IScaleSettings";
import { IScaleSettingsUpdateWizardContext } from "../commands/steps/settings/scalesettings/IScaleSettingsUpdateWizardContext";
import { UpdateScaleSettingsStep } from "../commands/steps/settings/scalesettings/UpdateScaleSettingsStep";
import { localize } from "../utils";
import { AppSettingsTreeItem } from "./AppSettingsTreeItem";
import { AppSettingTreeItem, IOptions } from "./AppSettingTreeItem";
import { AppTreeItem } from "./AppTreeItem";

export class AppScaleSettingsTreeItem extends AppSettingsTreeItem {
    public static contextValue: string = 'azureSpringCloud.app.scaleSettings';
    private static readonly _options: IOptions = {
        hidden: false,
        contextValue: 'azureSpringCloud.app.scaleSetting',
    };
    public readonly contextValue: string = AppScaleSettingsTreeItem.contextValue;
    public readonly id: string = AppScaleSettingsTreeItem.contextValue;
    public readonly label: string = 'Scale Settings';

    public constructor(parent: AppTreeItem, deployment: DeploymentResource) {
        super(parent, deployment);
    }

    public get settings(): IScaleSettings {
        const settings: DeploymentSettings | undefined = this.deployment.properties?.deploymentSettings;
        return {
            cpu: settings?.cpu ?? 0,
            memory: settings?.memoryInGB ?? 0,
            capacity: this.deployment.sku?.capacity ?? 0
        };
    }

    public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        return Object.entries(this.settings).map(e => this.toAppSettingItem(e[0], `${e[1]}`, Object.assign({}, AppScaleSettingsTreeItem._options)));
    }

    public async updateSettingsValue(context: IActionContext, key?: string): Promise<string> {
        const scaling: string = localize('scaling', 'Scaling Spring Cloud app "{0}"', this.parent.name);
        const scaled: string = localize('scaled', 'Successfully scaled Spring Cloud app "{0}".', this.parent.name);

        const wizardContext: IScaleSettingsUpdateWizardContext = Object.assign(context, this.root, {
            app: this.parent.app,
            deployment: this.deployment,
            newSettings: { ...this.settings },
            oldSettings: this.settings
        });

        const steps: AzureWizardPromptStep<IScaleSettingsUpdateWizardContext>[] = [
            new InputNumberStep("Capacity", 'capacity', { max: 500, min: 1 }),
            new InputNumberStep("Memory/GB", 'memory', { max: 8, min: 1 }),
            new InputNumberStep("vCPU", 'cpu', { max: 4, min: 1 })
        ];
        const promptSteps: AzureWizardPromptStep<IScaleSettingsUpdateWizardContext>[] = [];
        const executeSteps: AzureWizardExecuteStep<IScaleSettingsUpdateWizardContext>[] = [];
        if (!key) {
            promptSteps.push(...steps);
        } else {
            promptSteps.push(steps[['capacity', 'memory', 'cpu'].indexOf(key)]);
        }
        executeSteps.push(new UpdateScaleSettingsStep());
        const wizard: AzureWizard<IScaleSettingsUpdateWizardContext> = new AzureWizard(wizardContext, { promptSteps, executeSteps, title: scaling });
        await wizard.prompt();
        await wizard.execute();
        window.showInformationMessage(scaled);
        this.parent.refresh();
        return `${wizardContext.newSettings[key ?? 'capacity']}`;
    }

    public async updateSettingValue(node: AppSettingTreeItem, context: IActionContext): Promise<string> {
        return this.updateSettingsValue(context, node.key);
    }

    public async deleteSettingItem(_node: AppSettingTreeItem, _context: IActionContext): Promise<void> {
        throw new Error("Scale settings can not be deleted.");
    }
}