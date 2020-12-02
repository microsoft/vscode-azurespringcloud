import { AzureParentTreeItem, AzureTreeItem, IActionContext, TreeItemIconPath } from "vscode-azureextensionui";
import { AppSettingsTreeItem } from "./AppSettingsTreeItem";
import { treeUtils } from "../utils/treeUtils";
import { ext } from "../extensionVariables";
import getThemedIconPath = treeUtils.getThemedIconPath;

export interface Options {
  hideValue?: boolean;
  deletable?: boolean;
  readonly?: boolean;
}

export class AppSettingTreeItem extends AzureTreeItem {
  public static contextValue: string = 'azureSpringCloud.app.setting';
  public readonly contextValue: string = AppSettingTreeItem.contextValue;
  public readonly parent: AppSettingsTreeItem;

  private readonly _options: Options;
  private readonly _key: string;
  private _value: string;

  public constructor(parent: AzureParentTreeItem, key: string, value: string, options: Options = {hideValue: false}) {
    super(parent);
    this._key = key;
    this._value = value;
    this._options = options;
  }

  public get id(): string {
    return this._key || this._value;
  }

  public get label(): string {
    if (this._key) {
      return this._options.hideValue ? `${this._key}=***` : `${this._key}=${this._value}`;
    } else {
      return this._options.hideValue ? '***' : this._value;
    }
  }

  public get description(): string {
    return this._options.hideValue ? `Click to view.` : ``;
  }

  public get iconPath(): TreeItemIconPath {
    return getThemedIconPath('constant');
  }

  public get commandId(): string {
    return ext.prefix + '.toggleAppSettingVisibility';
  }

  public async edit(context: IActionContext): Promise<void> {
    this._value = await this.parent.editItem(this._key, this._value, context);
    await this.refresh();
  }

  public async deleteTreeItemImpl(context: IActionContext): Promise<void> {
    if (this._options.deletable) {
      await this.parent.deleteItem(this._key, context);
    }
  }

  public async toggleValueVisibility(): Promise<void> {
    this._options.hideValue = !this._options.hideValue;
    await this.refresh();
  }
}
