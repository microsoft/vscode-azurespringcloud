// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureWizardExecuteStep } from "@microsoft/vscode-azext-utils";
import { Progress } from "vscode";
import { ext } from "../../../extensionVariables";
import { EnhancedApp } from "../../../service/EnhancedApp";
import { localize } from "../../../utils";
import { IAppCreationWizardContext } from "./IAppCreationWizardContext";

export class UpdateAppStep extends AzureWizardExecuteStep<IAppCreationWizardContext> {

    public priority: number = 145;

    public async execute(context: IAppCreationWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const message: string = localize('updatingNewApp', 'Activating deployment of "{0}"...', context.newApp?.name);
        ext.outputChannel.appendLog(message);
        progress.report({ message });

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
