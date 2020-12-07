import { DeploymentResource } from "@azure/arm-appplatform/esm/models";
import { AzExtTreeItem, IActionContext, ICreateChildImplContext } from "vscode-azureextensionui";
import { ext } from "../extensionVariables";
import { AppSettingsTreeItem } from "./AppSettingsTreeItem";
import { IOptions } from "./AppSettingTreeItem";
import { AppTreeItem } from "./AppTreeItem";

export class AppEnvVariablesTreeItem extends AppSettingsTreeItem {
    public static contextValue: string = 'azureSpringCloud.app.envVariables';
    private static readonly ENV_VAR_NAME_PATTERN: RegExp = /^[a-zA-Z_]+[a-zA-Z0-9_]*$/; //TODO: @wangmi confirm
    private static readonly _options: IOptions = {
        hidden: true,
        settingType: 'azureSpringCloud.app.envVariable',
        typeLabel: 'environment variable'
    };
    public readonly contextValue: string = AppEnvVariablesTreeItem.contextValue;
    public readonly id: string = AppEnvVariablesTreeItem.contextValue;
    public readonly label: string = 'Environment Variables';
    private variables: { [p: string]: string };

    public constructor(parent: AppTreeItem, deployment: DeploymentResource) {
        super(parent, deployment);
    }

    public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        this.variables = this.deployment.properties?.deploymentSettings?.environmentVariables || {};
        return Object.entries(this.variables).map(e => this.toAppSettingItem(e[0], e[1] + '', Object.assign({}, AppEnvVariablesTreeItem._options)));
    }

    public async createChildImpl(context: ICreateChildImplContext): Promise<AzExtTreeItem> {
        const newKey: string = await ext.ui.showInputBox({
            prompt: 'Enter new environment variable name',
            validateInput: (v: string): string | undefined => {
                if (!AppEnvVariablesTreeItem.ENV_VAR_NAME_PATTERN.test(v)) {
                    return `Environment variable name must match: ${AppEnvVariablesTreeItem.ENV_VAR_NAME_PATTERN}`;
                }
                return undefined;
            }
        });
        const newVal: string = await ext.ui.showInputBox({
            prompt: `Enter value for "${newKey}"`
        });
        context.showCreatingTreeItem(newKey);
        await this.updateSettingValue(newKey, newVal, context);
        return this.toAppSettingItem(newKey, newVal, Object.assign({}, AppEnvVariablesTreeItem._options));
    }

    public async updateSettingsValue(_context: IActionContext): Promise<void> {
        return Promise.resolve(undefined);
    }

    public async updateSettingValue(key: string, newVal: string | undefined, _context: IActionContext): Promise<string> {
        if (newVal === undefined) {
            delete this.variables[key.trim()];
        } else {
            this.variables[key.trim()] = newVal.trim();
        }
        await this.client.deployments.update(this.parent.resourceGroup, this.parent.serviceName, this.parent.name, this.deployment.name!, {
            properties: {
                deploymentSettings: {
                    environmentVariables: this.variables
                }
            }
        });
        this.parent.refresh();
        return newVal ?? key;
    }

    public async deleteSettingItem(key: string, context: IActionContext): Promise<void> {
        await this.updateSettingValue(key, undefined, context);
    }
}
