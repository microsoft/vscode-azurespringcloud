import { AzureWizard, AzureWizardExecuteStep, IActionContext, createSubscriptionContext } from "@microsoft/vscode-azext-utils";
import { window } from "vscode";
import { openPublicEndpoint, openTestEndpoint } from "../../commands";
import { ext } from "../../extensionVariables";
import { EnhancedApp } from "../../model/EnhancedApp";
import { EnhancedDeployment } from "../../model/EnhancedDeployment";
import { AppItem } from "../../tree/AppItem";
import * as utils from "../../utils";
import { IAppDeploymentWizardContext } from "./IAppDeploymentWizardContext";
import { OpenLogStreamStep } from "./OpenLogStreamStep";
import { UpdateDeploymentStep } from "./UpdateDeploymentStep";
import { UploadArtifactStep } from "./UploadArtifactStep";
import { ValidateRuntimeStep } from "./ValidateRuntimeStep";

export async function deployArtifact(context: IActionContext, item: AppItem, artifactPath: string): Promise<void> {
    const app: EnhancedApp = item.app;
    const deployment: EnhancedDeployment | undefined = await app.activeDeployment;
    if (!deployment) {
        throw new Error(`App "${app.name}" has no active deployment.`);
    }
    const deploying: string = utils.localize('deploying', 'Deploying artifact to "{0}".', app.name);
    const deployed: string = utils.localize('deployed', 'Successfully deployed artifact to "{0}".', app.name);
    const wizardContext: IAppDeploymentWizardContext = Object.assign(context, createSubscriptionContext(app.service.subscription), { app });
    const executeSteps: AzureWizardExecuteStep<IAppDeploymentWizardContext>[] = [];
    if (!(await deployment.app.service.isEnterpriseTier()) && (await deployment.runtimeVersion)?.split(/[\s\_]/)?.[0].toLowerCase() === 'java') {
        executeSteps.push(new ValidateRuntimeStep(deployment, artifactPath));
    }
    executeSteps.push(new UploadArtifactStep(app, artifactPath));
    executeSteps.push(new UpdateDeploymentStep(deployment));
    executeSteps.push(new OpenLogStreamStep(deployment));
    const wizard: AzureWizard<IAppDeploymentWizardContext> = new AzureWizard(wizardContext, { executeSteps, title: deploying });
    const description = utils.localize('deploying', 'Deploying...');
    await ext.state.runWithTemporaryDescription(app.id, description, () => wizard.execute());
    const task: () => void = async () => {
        const action: string | undefined = await window.showInformationMessage(deployed, AppItem.ACCESS_PUBLIC_ENDPOINT, AppItem.ACCESS_TEST_ENDPOINT);
        if (action) {
            return action === AppItem.ACCESS_PUBLIC_ENDPOINT ? openPublicEndpoint(context, item) : openTestEndpoint(context, item);
        }
    };
    setTimeout(task, 0);
}
