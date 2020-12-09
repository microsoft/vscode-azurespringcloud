import { AppResource, TestKeys } from "@azure/arm-appplatform/esm/models";
import { DeploymentInstance } from "@azure/arm-appplatform/src/models/index";
import { AzureTreeItem, TreeItemIconPath } from "vscode-azureextensionui";
import { startStreamingLogs, stopStreamingLogs } from "../service/streamlog/streamingLog";
import { localize } from "../utils";
import { TreeUtils } from "../utils/TreeUtils";
import { AppInstancesTreeItem } from "./AppInstancesTreeItem";

export class AppInstanceTreeItem extends AzureTreeItem {
    public static contextValue: string = 'azureSpringCloud.app.instance';
    public contextValue: string = AppInstanceTreeItem.contextValue;
    public readonly parent: AppInstancesTreeItem;
    private readonly instance: DeploymentInstance;

    public constructor(parent: AppInstancesTreeItem, instance: DeploymentInstance) {
        super(parent);
        this.instance = instance;
    }

    public get data(): AppResource {
        return this.instance;
    }

    public get id(): string {
        return this.instance.name!;
    }

    public get label(): string {
        return this.instance.name!;
    }

    public get description(): string {
        return this.instance.status!;
    }

    public get iconPath(): TreeItemIconPath {
        return TreeUtils.getIconPath('azure-springcloud-app-instance');
    }

    public async startStreamingLogs(): Promise<void> {
        if (this.description !== 'Running') {
            throw new Error(localize('instanceNotRunning', 'Selected instance is not running.'));
        }
        const app: string = this.parent.parent.name;
        const testKey: TestKeys = await this.parent.parent.getTestKeys();
        await startStreamingLogs(app, testKey, this.instance);
    }

    public async stopStreamingLogs(): Promise<void> {
        const app: string = this.parent.parent.name;
        await stopStreamingLogs(app, this.instance);
    }
}
