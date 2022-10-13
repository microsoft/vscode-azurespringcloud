// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { KnownSupportedRuntimeValue } from "@azure/arm-appplatform";
import { AzureWizardExecuteStep } from "@microsoft/vscode-azext-utils";
import { Progress } from "vscode";
import { ext } from "../../../extensionVariables";
import { EnhancedApp } from "../../../service/EnhancedApp";
import { localize } from "../../../utils";
import { IAppCreationWizardContext } from "./IAppCreationWizardContext";

export class CreateAppDeploymentStep extends AzureWizardExecuteStep<IAppCreationWizardContext> {

    public priority: number = 140;

    public async execute(context: IAppCreationWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const message: string = localize('creatingNewAppDeployment', 'Creating default deployment...');
        ext.outputChannel.appendLog(message);
        progress.report({ message });

        const appRuntime: KnownSupportedRuntimeValue | undefined = context.newAppRuntime;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const app: EnhancedApp = context.newApp!;
        context.newDeployment = await app.createDeployment(EnhancedApp.DEFAULT_DEPLOYMENT, appRuntime);
        ext.outputChannel.appendLog(localize('creatingNewAppDeploymentSuccess', 'Successfully created default deployment.'));
        await app.startDeployment(EnhancedApp.DEFAULT_DEPLOYMENT);
        return Promise.resolve(undefined);
    }

    public shouldExecute(_context: IAppCreationWizardContext): boolean {
        return true;
    }
}
