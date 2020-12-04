import { AzureParentTreeItem, AzureTreeItem, IActionContext, TreeItemIconPath } from "vscode-azureextensionui";
import { AppSettingsTreeItem } from "./AppSettingsTreeItem";
import { TreeUtils } from "../utils/treeUtils";
import getThemedIconPath = TreeUtils.getThemedIconPath;

export interface Options {
  hidden?: boolean;
  deletable?: boolean;
  readonly?: boolean;
  typeLabel?: string;
  type?: string;
}

export class AppSettingTreeItem extends AzureTreeItem {
  public static contextValue: string = 'azureSpringCloud.app.setting';
  public readonly parent: AppSettingsTreeItem;

  private readonly _options: Options;
  public readonly key: string;
  public _value: string;

  public constructor(parent: AzureParentTreeItem, key: string, value: string, options: Options = {hidden: false, deletable: true}) {
    super(parent);
    this.key = key;
    this._value = value;
    this._options = options;
  }

  public get contextValue(): string {
    return this._options.type || AppSettingTreeItem.contextValue;
  }

  public get id(): string {
    return this.key || this._value;
  }

  public get label(): string {
    if (this.key) {
      return this._options.hidden ? `${this.key}=***` : `${this.key}=${this._value}`;
    } else {
      return this._options.hidden ? '***' : this._value;
    }
  }

  public get hidden(): boolean {
    return this._options.hidden ?? false;
  }

  public get description(): string {
    return this._options.hidden ? `Click to view.` : ``;
  }

  public get typeLabel(): string {
    return this._options.typeLabel || 'Setting';
  }

  public get deletable(): boolean {
    return this._options.deletable ?? true;
  }

  public get iconPath(): TreeItemIconPath {
    return getThemedIconPath('constant');
  }

  public get commandId(): string {
    return 'azureSpringCloud.common.toggleVisibility';
  }

  public get value(): string {
    return this._value;
  }

  public async updateValue(value: string, context: IActionContext): Promise<void> {
    this._value = await this.parent.updateSettingValue(this.id, value, context);
    await this.refresh();
  }

  public async deleteTreeItemImpl(context: IActionContext): Promise<void> {
    if (this.deletable) {
      await this.parent.deleteSettingItem(this.id, context);
    }
  }

  public async toggleVisibility(_context: IActionContext, hidden?: boolean): Promise<void> {
    this._options.hidden = hidden ?? !this._options.hidden;
    await this.refresh();
  }
}
