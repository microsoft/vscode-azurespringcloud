/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from "vscode-azureextensionui";
import { ext } from "../../../../extensionVariables";
import { EnhancedDeployment } from "../../../../model";
import { localize } from "../../../../utils";
import { IJvmOptionsUpdateWizardContext } from "./IJvmOptionsUpdateWizardContext";

export class InputJvmOptionsStep extends AzureWizardPromptStep<IJvmOptionsUpdateWizardContext> {
    private readonly deployment: EnhancedDeployment;

    constructor(deployment: EnhancedDeployment) {
        super();
        this.deployment = deployment;
    }

    public async prompt(context: IJvmOptionsUpdateWizardContext): Promise<void> {
        const prompt: string = localize('jvmOptionsPrompt', 'Enter new JVM options for the Spring app.');
        context.newJvmOptions = (await ext.ui.showInputBox({
            prompt,
            placeHolder: 'e.g. -Xmx2048m -Xms256m',
            value: this.deployment.properties?.deploymentSettings?.jvmOptions ?? '',
        })).trim();
        return Promise.resolve(undefined);
    }

    public shouldPrompt(context: IJvmOptionsUpdateWizardContext): boolean {
        return context.newJvmOptions === undefined;
    }
}
