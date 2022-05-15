/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardExecuteStep } from "@microsoft/vscode-azext-utils";
import { Progress } from "vscode";
import { ext } from "../../../extensionVariables";
import { EnhancedApp } from "../../../service/EnhancedApp";
import { localize } from "../../../utils";
import { IAppCreationWizardContext } from "./IAppCreationWizardContext";

export class UpdateAppStep extends AzureWizardExecuteStep<IAppCreationWizardContext> {

    // tslint:disable-next-line: no-unexternalized-strings
    public priority: number = 145;

    public async execute(context: IAppCreationWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const message: string = localize('updatingNewApp', 'Activating deployment of "{0}"...', context.newApp?.name);
        ext.outputChannel.appendLog(message);
        progress.report({ message });

        const app: EnhancedApp = context.newApp!;
        const activeDeploymentName: string = context.newDeployment?.name ?? EnhancedApp.DEFAULT_DEPLOYMENT;
        await app.setActiveDeployment(context.newDeployment?.name ?? EnhancedApp.DEFAULT_DEPLOYMENT);
        ext.outputChannel.appendLog(localize('updatingNewAppSuccess', 'Deployment "{0}" is successfully activated.', activeDeploymentName));
        return Promise.resolve(undefined);
    }

    public shouldExecute(_context: IAppCreationWizardContext): boolean {
        return true;
    }
}
