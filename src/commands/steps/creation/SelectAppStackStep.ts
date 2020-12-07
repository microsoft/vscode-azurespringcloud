import { RuntimeVersion } from "@azure/arm-appplatform/esm/models";
import { AzureWizardPromptStep, IAzureQuickPickItem } from "vscode-azureextensionui";
import { ext } from "../../../extensionVariables";
import { localize } from "../../../utils";
import { IAppCreationWizardContext } from "./IAppCreationWizardContext";

export class SelectAppStackStep extends AzureWizardPromptStep<IAppCreationWizardContext> {
    public async prompt(context: IAppCreationWizardContext): Promise<void> {
        const picks: IAzureQuickPickItem<RuntimeVersion>[] = [
            {label: 'Java 8', description: 'Java 8', data: "Java_8"},
            {label: 'Java 11', description: 'Java 11', data: "Java_11"}
        ];
        const placeHolder: string = localize('selectRuntime', 'Select a Java runtime version');
        context.newAppRuntime = (await ext.ui.showQuickPick(picks, {placeHolder})).data;
        return Promise.resolve(undefined);
    }

    public shouldPrompt(context: IAppCreationWizardContext): boolean {
        return !context.newAppRuntime;
    }
}
