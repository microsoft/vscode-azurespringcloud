/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardExecuteStep } from "@microsoft/vscode-azext-utils";
import { Progress } from "vscode";
import { ext } from "../../../extensionVariables";
import { EnhancedDeployment } from "../../../service/EnhancedDeployment";
import { localize } from "../../../utils";
import { IAppDeploymentWizardContext } from "./IAppDeploymentWizardContext";

export class UpdateDeploymentStep extends AzureWizardExecuteStep<IAppDeploymentWizardContext> {

    // tslint:disable-next-line: no-unexternalized-strings
    public priority: number = 140;
    private readonly deployment: EnhancedDeployment;

    constructor(deployment: EnhancedDeployment) {
        super();
        this.deployment = deployment;
    }

    public async execute(context: IAppDeploymentWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const message: string = localize('updateDeployment', 'Updating deployment...');
        ext.outputChannel.appendLog(message);
        progress.report({ message });
        await this.deployment.updateArtifactPath(context.relativePathOrBuildResultId!);
        ext.outputChannel.appendLog(localize('updateDeploymentSuccess', 'Deployment is successfully updated.'));
    }

    public shouldExecute(_context: IAppDeploymentWizardContext): boolean {
        return true;
    }
}
