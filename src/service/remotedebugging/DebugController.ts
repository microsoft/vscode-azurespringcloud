/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RemoteDebugging } from "@azure/arm-appplatform";
import { AzureWizard, AzureWizardExecuteStep, IActionContext } from "@microsoft/vscode-azext-utils";
import { window } from "vscode";
import { AppCommands } from "../../commands/AppCommands";
import { AppInstanceTreeItem } from "../../tree/AppInstanceTreeItem";
import { AppTreeItem } from "../../tree/AppTreeItem";
import { localize } from "../../utils";
import { EnhancedInstance } from "../EnhancedInstance";
import { IRemoteDebuggingContext } from "./steps/IRemoteDebuggingContext";
import { StartDebugConfigurationStep } from "./steps/StartDebugConfigurationStep";
import { StartDebuggingProxyStep } from "./steps/StartDebuggingProxyStep";

// tslint:disable-next-line:no-unnecessary-class
export class DebugController {
    public static async attachDebugger(context: IActionContext, node: AppInstanceTreeItem): Promise<void> {
        const instance: EnhancedInstance = node.instance;
        const attaching: string = localize('attachDebugger', 'Attaching debugger to app instance "{0}".', instance.name);
        const attached: string = localize('attachDebuggerSuccess', 'Successfully attached debugger to app instance "{0}".', instance.name);

        const config: RemoteDebugging = await instance.deployment.getDebuggingConfig();
        const wizardContext: IRemoteDebuggingContext = Object.assign(context, instance.deployment.app.service.subscription, { config });
        const executeSteps: AzureWizardExecuteStep<IRemoteDebuggingContext>[] = [];

        if (!config?.enabled) {
            const confirmMsg: string = localize('confirmRemoteDebug', 'Remote debugging should be enabled first before debugging. Do you want to enable it?');
            void AppCommands.enableRemoteDebugging(context, node.parent.parent, confirmMsg);
            return;
        }
        executeSteps.push(new StartDebuggingProxyStep(instance));
        executeSteps.push(new StartDebugConfigurationStep(instance));
        const wizard: AzureWizard<IRemoteDebuggingContext> = new AzureWizard(wizardContext, { executeSteps, title: attaching });
        await wizard.execute();
        const task: () => void = async () => {
            const action: string | undefined = await window.showInformationMessage(attached, AppTreeItem.ACCESS_PUBLIC_ENDPOINT, AppTreeItem.ACCESS_TEST_ENDPOINT);
            if (action) {
                const appTreeItem: AppTreeItem = node.parent.parent;
                action === AppTreeItem.ACCESS_PUBLIC_ENDPOINT ? void AppCommands.openPublicEndpoint(context, appTreeItem) : void AppCommands.openTestEndpoint(context, appTreeItem);
            }
        };
        setTimeout(task, 0);
    }
}
