import { DeploymentResource } from "@azure/arm-appplatform/esm/models";
import { ProgressLocation, window } from "vscode";
import { AzExtTreeItem, IActionContext, ICreateChildImplContext } from "vscode-azureextensionui";
import { ext } from "../extensionVariables";
import { localize } from "../utils";
import { AppSettingsTreeItem } from "./AppSettingsTreeItem";
import { AppSettingTreeItem, IOptions } from "./AppSettingTreeItem";
import { AppTreeItem } from "./AppTreeItem";

export class AppEnvVariablesTreeItem extends AppSettingsTreeItem {
    public static contextValue: string = 'azureSpringCloud.app.envVariables';
    //refer: https://dev.azure.com/msazure/AzureDMSS/_git/AzureDMSS-PortalExtension?path=%2Fsrc%2FSpringCloudPortalExt%2FClient%2FApplicationConfiguration%2FApplicationConfigurationBlade.ts&version=GBdev&line=304&lineEnd=304&lineStartColumn=61&lineEndColumn=80&lineStyle=plain&_a=contents
    private static readonly VALID_ENV_VAR_KEY: RegExp = /^[a-zA-Z_][\w.-]*$/;
    private static readonly _options: IOptions = {
        hidden: true,
        contextValue: 'azureSpringCloud.app.envVariable',
    };
    public readonly contextValue: string = AppEnvVariablesTreeItem.contextValue;
    public readonly id: string = AppEnvVariablesTreeItem.contextValue;
    public readonly label: string = 'Environment Variables';

    public constructor(parent: AppTreeItem, deployment: DeploymentResource) {
        super(parent, deployment);
    }

    private static validateKey(v: string): string | undefined {
        if (!v.trim()) {
            return localize("emptyEnvVarKey", `The key can not be empty.`);
        } else if (!AppEnvVariablesTreeItem.VALID_ENV_VAR_KEY.test(v)) {
            return localize("invalidEnvVarKey", `
                        Keys must start with a letter or an underscore(_).
                        Keys may only contain letters, numbers, periods(.), and underscores(_).
                    `);
        } else if (v.trim().length > 4000) {
            return localize("maxLength", `The maximum length is {0} characters.`, 4000);
        }
        return undefined;
    }

    private static validateVal(v: string): string | undefined {
        if (!v.trim()) {
            return localize("emptyEnvVarVal", `The value can not be empty.`);
        } else if (v.trim().length > 4000) {
            return localize("maxLength", `The maximum length is {0} characters.`, 4000);
        }
        return undefined;
    }

    public get variables(): { [p: string]: string } {
        return this.deployment.properties?.deploymentSettings?.environmentVariables ?? {};
    }

    public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        return Object.entries(this.variables).map(e => this.toAppSettingItem(e[0], e[1] + '', Object.assign({}, AppEnvVariablesTreeItem._options)));
    }

    public async createChildImpl(context: ICreateChildImplContext): Promise<AzExtTreeItem> {
        const newKey: string = await ext.ui.showInputBox({
            prompt: 'Enter new environment variable key',
            validateInput: AppEnvVariablesTreeItem.validateKey
        });
        const newVal: string = await ext.ui.showInputBox({
            prompt: `Enter value for "${newKey}"`,
            validateInput: AppEnvVariablesTreeItem.validateVal
        });
        context.showCreatingTreeItem(newKey);
        await this.updateSettingsValue(context, { ...this.variables, [newKey]: newVal.trim() });
        return this.toAppSettingItem(newKey, newVal, Object.assign({}, AppEnvVariablesTreeItem._options));
    }

    public async updateSettingValue(node: AppSettingTreeItem, context: IActionContext): Promise<string> {
        const newVal: string = await ext.ui.showInputBox({
            prompt: `Enter value for "${node.key}"`,
            value: node.value,
            validateInput: AppEnvVariablesTreeItem.validateVal
        });
        await this.updateSettingsValue(context, { ...this.variables, [node.key.trim()]: newVal.trim() });
        return newVal;
    }

    public async deleteSettingItem(node: AppSettingTreeItem, context: IActionContext): Promise<void> {
        const tempVars: { [p: string]: string } = { ...this.variables };
        delete tempVars[node.key.trim()];
        await this.updateSettingsValue(context, tempVars);
    }

    public async updateSettingsValue(_context: IActionContext, newVars?: { [p: string]: string }): Promise<void> {
        const updating: string = localize('updatingEnvVar', 'Updating environment variables of Spring Cloud app {0}...', this.parent.name);
        const updated: string = localize('updatedEnvVar', 'Successfully updated environment variables of Spring Cloud app {0}.', this.parent.name);

        await window.withProgress({ location: ProgressLocation.Notification, title: updating }, async (): Promise<void> => {
            ext.outputChannel.appendLog(updating);
            await this.client.deployments.update(this.parent.resourceGroup, this.parent.serviceName, this.parent.name, this.deployment.name!, {
                properties: {
                    deploymentSettings: {
                        environmentVariables: newVars
                    }
                }
            });
            window.showInformationMessage(updated);
            ext.outputChannel.appendLog(updated);
        });

        this.refresh();
    }
}
