// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureWizardExecuteStep } from "@microsoft/vscode-azext-utils";
import { Progress } from "vscode";
import { EnhancedDeployment } from "../../model/EnhancedDeployment";
import { localize } from "../../utils";
import { IAppDeploymentWizardContext } from "./IAppDeploymentWizardContext";

export class OpenLogStreamStep extends AzureWizardExecuteStep<IAppDeploymentWizardContext> {

    public priority: number = 145;
    private readonly deployment: EnhancedDeployment;

    constructor(deployment: EnhancedDeployment) {
        super();
        this.deployment = deployment;
    }

    public async execute(context: IAppDeploymentWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const message: string = localize('openLogStream', 'Opening application log stream...');
        progress.report({ message });
        await this.deployment.latestInstance.then(i => i.startStreamingLogs(context));
    }

    public shouldExecute(_context: IAppDeploymentWizardContext): boolean {
        return true;
    }
}
