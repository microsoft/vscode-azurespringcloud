import { DeploymentInstance } from "@azure/arm-appplatform/src/models/index";
import { AzureTreeItem, TreeItemIconPath } from "vscode-azureextensionui";
import { TreeUtils } from "../utils/TreeUtils";
import { AppInstancesTreeItem } from "./AppInstancesTreeItem";

export class AppInstanceTreeItem extends AzureTreeItem {
    public static contextValue: string = 'azureSpringCloud.app.instance';
    public contextValue: string = AppInstanceTreeItem.contextValue;
    public readonly parent: AppInstancesTreeItem;
    public readonly data: DeploymentInstance;

    public constructor(parent: AppInstancesTreeItem, instance: DeploymentInstance) {
        super(parent);
        this.data = instance;
    }

    public get id(): string {
        return this.data.name!;
    }

    public get label(): string {
        return this.data.name!;
    }

    public get description(): string {
        return this.data.status!;
    }

    public get iconPath(): TreeItemIconPath {
        return TreeUtils.getThemedIconPath('app-instance');
    }
}
