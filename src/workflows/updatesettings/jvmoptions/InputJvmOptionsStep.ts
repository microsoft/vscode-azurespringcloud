// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureWizardPromptStep } from "@microsoft/vscode-azext-utils";
import { EnhancedDeployment } from "../../../model/EnhancedDeployment";
import { localize } from "../../../utils";
import { IJvmOptionsUpdateWizardContext } from "./IJvmOptionsUpdateWizardContext";

export class InputJvmOptionsStep extends AzureWizardPromptStep<IJvmOptionsUpdateWizardContext> {
    private readonly deployment: EnhancedDeployment;

    constructor(deployment: EnhancedDeployment) {
        super();
        this.deployment = deployment;
    }

    public async prompt(context: IJvmOptionsUpdateWizardContext): Promise<void> {
        const jvmOptions: string = await this.deployment.getJvmOptions();
        const prompt: string = localize('jvmOptionsPrompt', 'Enter new JVM options for the Spring app.');
        context.newJvmOptions = (await context.ui.showInputBox({
            prompt,
            placeHolder: 'e.g. -Xmx2048m -Xms256m',
            value: jvmOptions ?? '',
        })).trim();
        return Promise.resolve(undefined);
    }

    public shouldPrompt(context: IJvmOptionsUpdateWizardContext): boolean {
        return context.newJvmOptions === undefined;
    }
}
