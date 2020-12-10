import { DeploymentResource } from "@azure/arm-appplatform/esm/models";
import { window } from "vscode";
import { AzExtTreeItem, AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep, IActionContext, ICreateChildImplContext } from "vscode-azureextensionui";
import { IJvmOptionsUpdateWizardContext } from "../commands/steps/settings/jvmoptions/IJvmOptionsUpdateWizardContext";
import { InputJvmOptionsStep } from "../commands/steps/settings/jvmoptions/InputJvmOptionsStep";
import { UpdateJvmOptionsStep } from "../commands/steps/settings/jvmoptions/UpdateJvmOptionsStep";
import { ext } from "../extensionVariables";
import { localize } from "../utils";
import { AppSettingsTreeItem } from "./AppSettingsTreeItem";
import { AppSettingTreeItem, IOptions } from "./AppSettingTreeItem";
import { AppTreeItem } from "./AppTreeItem";

export class AppJvmOptionsTreeItem extends AppSettingsTreeItem {
    public static contextValue: string = 'azureSpringCloud.app.jvmOptions';
    private static readonly _options: IOptions = {
        contextValue: 'azureSpringCloud.app.jvmOption',
    };
    private static readonly JVM_OPTION_PATTERN: RegExp = /^-[a-zA-Z_]+\S*$/;
    public readonly contextValue: string = AppJvmOptionsTreeItem.contextValue;
    public readonly id: string = AppJvmOptionsTreeItem.contextValue;
    public readonly label: string = 'JVM Options';

    public constructor(parent: AppTreeItem, deployment: DeploymentResource) {
        super(parent, deployment);
    }

    public get options(): string[] {
        const optionsStr: string | undefined = this.deployment.properties?.deploymentSettings?.jvmOptions?.trim();
        if (optionsStr) {
            return ` ${optionsStr}`.split(/\s+-/).filter(s => s.trim()).map(s => `-${s}`);
        }
        return [];
    }

    public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        return this.options.map(option => this.toAppSettingItem('', option.trim(), Object.assign({}, AppJvmOptionsTreeItem._options)));
    }

    public async createChildImpl(context: ICreateChildImplContext): Promise<AzExtTreeItem> {
        const newVal: string = await ext.ui.showInputBox({
            prompt: 'Enter new JVM option:',
            validateInput: this.validateJvmOption
        });
        context.showCreatingTreeItem(newVal);
        await this.updateSettingsValue(context, [...this.options, newVal]);
        return this.toAppSettingItem('', newVal, Object.assign({}, AppJvmOptionsTreeItem._options));
    }

    public async updateSettingValue(node: AppSettingTreeItem | undefined, context: IActionContext | ICreateChildImplContext): Promise<string> {
        const newVal: string = await ext.ui.showInputBox({
            prompt: 'Update JVM option:',
            value: node?.value ?? '',
            validateInput: this.validateJvmOption
        });
        await this.updateSettingsValue(context, [...this.options, newVal]);
        return newVal;
    }

    public async deleteSettingItem(node: AppSettingTreeItem, context: IActionContext): Promise<void> {
        const tempOptions: string[] = [...this.options];
        const index: number = tempOptions.indexOf(node.value);
        tempOptions.splice(index, 1);
        await this.updateSettingsValue(context, tempOptions);
    }

    public async updateSettingsValue(context: IActionContext, newJvmOptions?: string[]): Promise<void> {
        const updating: string = localize('updatingJvmOptions', 'Updating JVM options of Spring Cloud app "{0}"', this.parent.name);
        const updated: string = localize('updatedJvmOptions', 'Successfully updated JVM options of Spring Cloud app "{0}".', this.parent.name);

        const wizardContext: IJvmOptionsUpdateWizardContext = Object.assign(context, this.root, {
            app: this.parent.app,
            deployment: this.deployment,
            newJvmOptions: newJvmOptions?.join(' ')
        });

        const promptSteps: AzureWizardPromptStep<IJvmOptionsUpdateWizardContext>[] = [];
        const executeSteps: AzureWizardExecuteStep<IJvmOptionsUpdateWizardContext>[] = [];
        promptSteps.push(new InputJvmOptionsStep());
        executeSteps.push(new UpdateJvmOptionsStep());
        const wizard: AzureWizard<IJvmOptionsUpdateWizardContext> = new AzureWizard(wizardContext, { promptSteps, executeSteps, title: updating });
        await wizard.prompt();
        await wizard.execute();
        window.showInformationMessage(updated);
        this.refresh();
    }

    public async validateJvmOption(v: string): Promise<string | undefined> {
        if (!v.trim()) {
            return `Enter a value.`;
        } else if (!AppJvmOptionsTreeItem.JVM_OPTION_PATTERN.test(v)) {
            return `Invalid JVM option.`;
        } else if (this.options.includes(v)) {
            return `${v} is already set`;
        }
        return undefined;
    }
}
