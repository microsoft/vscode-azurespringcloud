import { DeploymentResource } from "@azure/arm-appplatform/esm/models";
import { window } from "vscode";
import { AzExtTreeItem, AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep, IActionContext, ICreateChildImplContext } from "vscode-azureextensionui";
import { IJvmOptionsUpdateWizardContext } from "../commands/steps/settings/jvmoptions/IJvmOptionsUpdateWizardContext";
import { InputJvmOptionsStep } from "../commands/steps/settings/jvmoptions/InputJvmOptionsStep";
import { UpdateJvmOptionsStep } from "../commands/steps/settings/jvmoptions/UpdateJvmOptionsStep";
import { ext } from "../extensionVariables";
import { localize } from "../utils";
import { AppSettingsTreeItem } from "./AppSettingsTreeItem";
import { IOptions } from "./AppSettingTreeItem";
import { AppTreeItem } from "./AppTreeItem";

export class AppJvmOptionsTreeItem extends AppSettingsTreeItem {
    public static contextValue: string = 'azureSpringCloud.app.jvmOptions';
    private static readonly _options: IOptions = {
        hidden: false,
        settingType: 'azureSpringCloud.app.jvmOption',
        typeLabel: "JVM option"
    };
    private static readonly JVM_OPTION_PATTERN: RegExp = /^-[a-zA-Z_]+\S*$/; //TODO: @wangmi confirm
    public readonly contextValue: string = AppJvmOptionsTreeItem.contextValue;
    public readonly id: string = AppJvmOptionsTreeItem.contextValue;
    public readonly label: string = 'JVM Options';
    private options: string[];

    public constructor(parent: AppTreeItem, deployment: DeploymentResource) {
        super(parent, deployment);
    }

    public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        const optionsStr: string | undefined = this.deployment.properties?.deploymentSettings?.jvmOptions?.trim();
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
        return this.toAppSettingItem('', newVal, Object.assign({}, AppJvmOptionsTreeItem._options));
    }

    public async updateSettingsValue(context: IActionContext, newJvmOptions?: string): Promise<void> {
        const wizardContext: IJvmOptionsUpdateWizardContext = Object.assign(context, this.root, {
            app: this.parent.app,
            deployment: this.deployment,
            newJvmOptions
        });

        const promptSteps: AzureWizardPromptStep<IJvmOptionsUpdateWizardContext>[] = [];
        const executeSteps: AzureWizardExecuteStep<IJvmOptionsUpdateWizardContext>[] = [];
        promptSteps.push(new InputJvmOptionsStep());
        executeSteps.push(new UpdateJvmOptionsStep());
        const title: string = localize('updatingJvmOptions', 'Updating JVM options of Spring Cloud app "{0}"', this.parent.name);
        const wizard: AzureWizard<IJvmOptionsUpdateWizardContext> = new AzureWizard(wizardContext, {promptSteps, executeSteps, title});
        await wizard.prompt();
        await wizard.execute();
        const createSucceeded: string = localize('updatedJvmOptions', 'Successfully updated JVM options of Spring Cloud app "{0}".', this.parent.name);
        window.showInformationMessage(createSucceeded);
        this.refresh();
    }

    public async updateSettingValue(oldVal: string | undefined, newVal: string, _context: IActionContext): Promise<string> {
        if (oldVal === undefined) {
            this.options.push(newVal);
        } else if (oldVal !== newVal.trim()) {
            const index: number = this.options.indexOf(oldVal);
            this.options.splice(index, 1, newVal);
        }
        await this.updateSettingsValue(_context, this.options.join(' '));
        return newVal;
    }

    public async deleteSettingItem(oldVal: string, context: IActionContext): Promise<void> {
        await this.updateSettingValue(oldVal, '', context);
    }
}
