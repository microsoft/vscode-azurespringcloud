// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureWizardExecuteStep } from "@microsoft/vscode-azext-utils";
import { Progress } from "vscode";
import { EnhancedDeployment } from "../../../model/EnhancedDeployment";
import { localize } from "../../../utils";
import { IJvmOptionsUpdateWizardContext } from "./IJvmOptionsUpdateWizardContext";

export class UpdateJvmOptionsStep extends AzureWizardExecuteStep<IJvmOptionsUpdateWizardContext> {
    public readonly priority: number = 145;
    private readonly deployment: EnhancedDeployment;

    constructor(deployment: EnhancedDeployment) {
        super();
        this.deployment = deployment;
    }

    public async execute(context: IJvmOptionsUpdateWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const message: string = localize('updatingJvmOptions', 'Updating JVM Options of "{0}"...', this.deployment.app.name);
        progress.report({ message });
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        await this.deployment.updateJvmOptions(context.newJvmOptions!);
        return Promise.resolve(undefined);
    }

    public shouldExecute(context: IJvmOptionsUpdateWizardContext): boolean {
        return context.newJvmOptions !== undefined;
    }
}
