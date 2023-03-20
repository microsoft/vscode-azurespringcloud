/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import {
    AzureResourceQuickPickWizardContext,
    AzureWizardPromptStep,
    ContextValueQuickPickStep,
    IActionContext,
    QuickPickAzureResourceStep,
    QuickPickAzureSubscriptionStep,
    QuickPickGroupStep,
    runQuickPickWizard
} from "@microsoft/vscode-azext-utils";
import { AzExtResourceType } from "@microsoft/vscode-azureresources-api";
import * as vscode from 'vscode';
import { ext } from "../extensionVariables";
import { AppInstanceItem } from "../tree/AppInstanceItem";
import { AppInstancesItem } from "../tree/AppInstancesItem";
import { AppItem } from "../tree/AppItem";
import AppsItem from "../tree/AppsItem";
import { localize } from "./index";

export interface PickItemOptions {
    title?: string;
}

export async function pickApps(context: IActionContext, options?: PickItemOptions): Promise<AppsItem> {
    return await runQuickPickWizard(context, {
        promptSteps: getPickAppsSteps(ext.rgApiV2.resources.azureResourceTreeDataProvider),
        title: options?.title,
    });
}

export async function pickApp(context: IActionContext, options?: PickItemOptions): Promise<AppItem> {
    return await runQuickPickWizard(context, {
        promptSteps: getPickAppSteps(ext.rgApiV2.resources.azureResourceTreeDataProvider),
        title: options?.title,
    });
}

export async function pickAppInstance(context: IActionContext, options?: PickItemOptions): Promise<AppInstanceItem> {
    return await runQuickPickWizard(context, {
        promptSteps: getPickInstanceSteps(ext.rgApiV2.resources.azureResourceTreeDataProvider),
        title: options?.title,
    });
}

function getPickAppsSteps(tdp: vscode.TreeDataProvider<unknown>): AzureWizardPromptStep<AzureResourceQuickPickWizardContext>[] {
    const types = [AzExtResourceType.SpringApps];
    return [
        new QuickPickAzureSubscriptionStep(tdp),
        new QuickPickGroupStep(tdp, {
            groupType: types
        }),
        new QuickPickAzureResourceStep(tdp, {
            resourceTypes: types,
            skipIfOne: false,
        }, {
            placeHolder: localize('selectSpringApps', 'Select Spring Apps'),
        }),
    ];
}

function getPickAppSteps(tdp: vscode.TreeDataProvider<unknown>): AzureWizardPromptStep<AzureResourceQuickPickWizardContext>[] {
    return [
        ...getPickAppsSteps(tdp),
        new ContextValueQuickPickStep(tdp, {
            contextValueFilter: { include: AppItem.contextValue },
            skipIfOne: false,
        }, {
            placeHolder: localize('selectApp', 'Select Spring App'),
            noPicksMessage: localize('noApps', 'Selected Spring Apps has no apps'),
        }),
    ];
}

function getPickInstanceSteps(tdp: vscode.TreeDataProvider<unknown>): AzureWizardPromptStep<AzureResourceQuickPickWizardContext>[] {
    return [
        ...getPickAppSteps(tdp),
        new ContextValueQuickPickStep(tdp, {
            contextValueFilter: { include: AppInstancesItem.contextValue },
            skipIfOne: true,
        }),
        new ContextValueQuickPickStep(tdp, {
            contextValueFilter: { include: new RegExp("azureSpringApps\\.app\\.instance") },
            skipIfOne: false,
        }, {
            placeHolder: localize('selectInstance', 'Select Spring App instance'),
            noPicksMessage: localize('noInstances', 'Selected Spring App has no running instances'),
        })
    ];
}