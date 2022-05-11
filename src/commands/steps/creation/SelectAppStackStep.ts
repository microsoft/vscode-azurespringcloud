/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { KnownSupportedRuntimeValue } from "@azure/arm-appplatform";
import { AzureWizardPromptStep, IAzureQuickPickItem } from "@microsoft/vscode-azext-utils";
import { localize } from "../../../utils";
import { IAppCreationWizardContext } from "./IAppCreationWizardContext";

export class SelectAppStackStep extends AzureWizardPromptStep<IAppCreationWizardContext> {
    public async prompt(context: IAppCreationWizardContext): Promise<void> {
        const picks: IAzureQuickPickItem<KnownSupportedRuntimeValue>[] = [
            { label: 'Java 8', description: 'Java 8', data: KnownSupportedRuntimeValue.Java8 },
            { label: 'Java 11', description: 'Java 11', data: KnownSupportedRuntimeValue.Java11 },
            { label: 'Java 17', description: 'Java 17', data: KnownSupportedRuntimeValue.Java17 }
        ];
        const placeHolder: string = localize('selectRuntime', 'Select a Java runtime version');
        context.newAppRuntime = (await context.ui.showQuickPick(picks, { placeHolder })).data;
        return Promise.resolve(undefined);
    }

    public shouldPrompt(context: IAppCreationWizardContext): boolean {
        return !(<string>context.newAppRuntime);
    }
}
