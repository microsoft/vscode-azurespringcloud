import { VerifyProvidersStep } from "@microsoft/vscode-azext-azureutils";
import { AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep, IActionContext, createSubscriptionContext } from "@microsoft/vscode-azext-utils";
import { window } from "vscode";
import { ext } from "../../extensionVariables";
import { EnhancedService } from "../../model/EnhancedService";
import { AppItem } from "../../tree/AppItem";
import ServiceItem from "../../tree/ServiceItem";
import * as utils from "../../utils";
import { CreateAppDeploymentStep } from "./CreateAppDeploymentStep";
import { CreateAppStep } from "./CreateAppStep";
import { IAppCreationWizardContext } from "./IAppCreationWizardContext";
import { InputAppNameStep } from "./InputAppNameStep";
import { SelectAppStackStep } from "./SelectAppStackStep";

export async function createApp(context: IActionContext, item: ServiceItem): Promise<AppItem> {
    const service: EnhancedService = item.service;
    const subContext = createSubscriptionContext(service.subscription);
    const wizardContext: IAppCreationWizardContext = Object.assign(context, subContext, { service });
    const promptSteps: AzureWizardPromptStep<IAppCreationWizardContext>[] = [];
    const executeSteps: AzureWizardExecuteStep<IAppCreationWizardContext>[] = [];
    promptSteps.push(new InputAppNameStep(service));
    (!await service.isEnterpriseTier()) && promptSteps.push(new SelectAppStackStep(service));
    executeSteps.push(new VerifyProvidersStep(['Microsoft.AppPlatform']));
    executeSteps.push(new CreateAppStep(service));
    executeSteps.push(new CreateAppDeploymentStep());
    const creating: string = utils.localize('creatingSpringCouldApp', 'Creating new Spring app in Azure');
    const wizard: AzureWizard<IAppCreationWizardContext> = new AzureWizard(wizardContext, { promptSteps, executeSteps, title: creating });

    await wizard.prompt();
    const appName: string = utils.nonNullProp(wizardContext, 'newAppName');
    await ext.state.showCreatingChild(
        service.id,
        utils.localize('createApp', 'Create App "{0}"...', appName),
        async () => {
            try {
                await wizard.execute();
            } finally {
                // refresh this node even if create fails because container app provision failure throws an error, but still creates a container app
                await item.refresh();
                ext.state.notifyChildrenChanged(service.id);
            }
        });
    const created: string = utils.localize('createdSpringCouldApp', 'Successfully created Spring app "{0}".', appName);
    void window.showInformationMessage(created);
    return new AppItem(item, utils.nonNullProp(wizardContext, 'newApp'));
}
