/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RemoteDebugging } from "@azure/arm-appplatform";
import { AzureWizard, AzureWizardExecuteStep, DialogResponses, IActionContext, openUrl } from "@microsoft/vscode-azext-utils";
import { MessageItem, window } from "vscode";
import { localize } from "../../utils";
import { EnhancedInstance } from "../EnhancedInstance";
import { EnableRemoteDebuggingStep } from "./steps/EnableRemoteDebuggingStep";
import { IRemoteDebuggingContext } from "./steps/IRemoteDebuggingContext";
import { StartDebugConfigurationStep } from "./steps/StartDebugConfigurationStep";
import { StartDebuggingProxyStep } from "./steps/StartDebuggingProxyStep";

// tslint:disable-next-line:no-unnecessary-class
export class DebugController {
    public static async attachDebugger(context: IActionContext, instance: EnhancedInstance): Promise<void> {
        const attaching: string = localize('attachDebugger', 'Attaching debugger to Azure Spring Apps app instance "{0}".', instance.name);
        const attached: string = localize('attachDebuggerSuccess', 'Debugger is successfully attached to Azure Spring Apps app instance "{0}".', instance.name);

        const config: RemoteDebugging = await instance.deployment.enableDebugging();
        const wizardContext: IRemoteDebuggingContext = Object.assign(context, instance.deployment.app.service.subscription, { config });
        const executeSteps: AzureWizardExecuteStep<IRemoteDebuggingContext>[] = [];

        if (!config?.enabled) {
            const confirmMsg: string = localize('confirmRemoteDebug', 'The configurations of the selected app will be changed before debugging. Would you like to continue?');
            const result: MessageItem = await context.ui.showWarningMessage(confirmMsg, { modal: true }, DialogResponses.yes, DialogResponses.learnMore);
            if (result === DialogResponses.learnMore) {
                await openUrl('https://aka.ms/asa-remotedebug');
                return;
            } else {
                executeSteps.push(new EnableRemoteDebuggingStep(instance));
            }
        }
        executeSteps.push(new StartDebuggingProxyStep(instance));
        executeSteps.push(new StartDebugConfigurationStep(instance));
        const wizard: AzureWizard<IRemoteDebuggingContext> = new AzureWizard(wizardContext, { executeSteps, title: attaching });
        await wizard.execute();
        const task: () => void = async () => {
            window.showInformationMessage(attached);
        };
        setTimeout(task, 0);
    }
}
