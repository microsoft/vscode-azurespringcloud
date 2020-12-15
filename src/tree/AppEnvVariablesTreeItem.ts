import { AzExtTreeItem, IActionContext, ICreateChildImplContext, TreeItemIconPath } from "vscode-azureextensionui";
import { ext } from "../extensionVariables";
import { IDeployment } from "../model";
import { DeploymentService } from "../service/DeploymentService";
import * as utils from "../utils";
import { TreeUtils } from "../utils/TreeUtils";
import { AppSettingsTreeItem } from "./AppSettingsTreeItem";
import { AppSettingTreeItem, IOptions } from "./AppSettingTreeItem";
import { AppTreeItem } from "./AppTreeItem";

export class AppEnvVariablesTreeItem extends AppSettingsTreeItem {
    public static contextValue: string = 'azureSpringCloud.app.envVariables';
    //refer: https://dev.azure.com/msazure/AzureDMSS/_git/AzureDMSS-PortalExtension?path=%2Fsrc%2FSpringCloudPortalExt%2FClient%2FApplicationConfiguration%2FApplicationConfigurationBlade.ts&version=GBdev&line=304&lineEnd=304&lineStartColumn=61&lineEndColumn=80&lineStyle=plain&_a=contents
    private static readonly _options: IOptions = {
        hidden: true,
        contextValue: 'azureSpringCloud.app.envVariable',
    };
    public readonly contextValue: string = AppEnvVariablesTreeItem.contextValue;
    public readonly iconPath: TreeItemIconPath = TreeUtils.getThemedIconPath('app-envvars');
    public readonly id: string = AppEnvVariablesTreeItem.contextValue;
    public readonly label: string = 'Environment Variables';

    public constructor(parent: AppTreeItem, deployment: IDeployment) {
        super(parent, deployment);
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
            validateInput: DeploymentService.validateKey
        });
        const newVal: string = await ext.ui.showInputBox({
            prompt: `Enter value for "${newKey}"`,
            validateInput: DeploymentService.validateVal
        });
        context.showCreatingTreeItem(newKey);
        await this.updateSettingsValue(context, { ...this.variables, [newKey]: newVal.trim() });
        return this.toAppSettingItem(newKey, newVal, Object.assign({}, AppEnvVariablesTreeItem._options));
    }

    public async updateSettingValue(node: AppSettingTreeItem, context: IActionContext): Promise<string> {
        const newVal: string = await ext.ui.showInputBox({
            prompt: `Enter value for "${node.key}"`,
            value: node.value,
            validateInput: DeploymentService.validateVal
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
        const updating: string = utils.localize('updatingEnvVar', 'Updating environment variables of "{0}"...', this.deployment.app.name);
        const updated: string = utils.localize('updatedEnvVar', 'Successfully updated environment variables of {0}.', this.deployment.app.name);
        await utils.runInBackground(updating, updated, () => this.deployment.updateEnvironmentVariables(newVars ?? {}));
        this.refresh();
    }
}
