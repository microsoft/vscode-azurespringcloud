/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, registerCommandWithTreeNodeUnwrapping } from "@microsoft/vscode-azext-utils";
import * as vscode from "vscode";
import { AppItem } from "../tree/AppItem";
import { DashboardExtensionApi, RemoteBootAppData, RemoteBootAppDataProvider, RemoteBootAppDataProviderOptions } from "./api";

let inited: boolean = false;

export async function initialize(context: vscode.ExtensionContext): Promise<void> {
    if (inited) {
        return;
    }

    const dashboardExt = vscode.extensions.getExtension<DashboardExtensionApi>("vscjava.vscode-spring-boot-dashboard");
    if (dashboardExt) {
        await vscode.commands.executeCommand("setContext", "spring.dashboard:enabled", true);

        const provider = new AzureSpringAppsProvider(context);
        const options: RemoteBootAppDataProviderOptions = { iconPath: new vscode.ThemeIcon("azure") };

        const ensureProviderRegistered = async () => {
            await waitUntilDashboardActivated(dashboardExt, 5000);
            if (!inited) {
                const api = dashboardExt.exports;
                api.registerRemoteBootAppDataProvider("Azure", provider, options);
                inited = true;
            }
        }

        // register commands
        registerCommandWithTreeNodeUnwrapping("azureSpringApps.app.showLiveInformation", async (_context: IActionContext, appNode: AppItem) => {
            if (!dashboardExt.isActive) {
                await dashboardExt.activate();
            }

            const app = appNode.app;
            let endpoint: string | undefined = await app.getPublicEndpoint();
            if (!(await app.properties)?.public || !endpoint || endpoint.toLowerCase() === 'none') {
                const choice = await vscode.window.showWarningMessage(`App "${app.name}" is not publicly accessible. Do you want to assign it a public endpoint?`, { modal: true }, "Yes");
                if (!choice) {
                    return;
                }
                await vscode.commands.executeCommand("azureSpringApps.app.assignEndpoint", appNode);
                endpoint = await app.getPublicEndpoint();
            }
            if (endpoint) {
                await ensureProviderRegistered();

                await provider.addAppData(appNode);
                // connect right now
                const appData = await provider.toRemoteBootAppData(appNode);
                if (appData) {
                    dashboardExt.exports.connectRemoteApp(appData);
                }
                await vscode.commands.executeCommand("spring.apps.focus");
            }
        });

        // APIs only available after dashboard is activated.
        await ensureProviderRegistered();
    }
}

class AzureSpringAppsProvider implements RemoteBootAppDataProvider {

    store: Map<string, RemoteBootAppData>;

    iconPathForApps: { light: string | vscode.Uri; dark: string | vscode.Uri };
    onDidChangeDataEmitter: vscode.EventEmitter<void>;

    onDidChangeData: vscode.Event<void>;
    constructor(context: vscode.ExtensionContext) {
        this.store = new Map();
        this.iconPathForApps = {
            dark: vscode.Uri.joinPath(context.extensionUri, "resources", "dark", "app.svg"),
            light: vscode.Uri.joinPath(context.extensionUri, "resources", "light", "app.svg"),
        };
        this.onDidChangeDataEmitter = new vscode.EventEmitter<void>();
        this.onDidChangeData = this.onDidChangeDataEmitter.event;
    }

    provide(): RemoteBootAppData[] | Thenable<RemoteBootAppData[]> {
        return Array.from(this.store.values());
    }

    public async addAppData(appNode: AppItem) {
        const appData = await this.toRemoteBootAppData(appNode);
        if (appData) {
            this.store.set(appData.name, appData);
            this.onDidChangeDataEmitter.fire();
        }
    }

    public async toRemoteBootAppData(appNode: AppItem): Promise<RemoteBootAppData | undefined> {
        const app = appNode.app;
        const url = (await app.properties)?.url;
        if (url) {
            const uri = vscode.Uri.parse(url);
            const host = uri.authority;
            const jmxurl = uri.with({ path: "/actuator" }).toString();
            return {
                name: app.name,
                host,
                jmxurl,
                iconPath: this.iconPathForApps
            };
        } else {
            return undefined;
        }

    }
}


async function waitUntilDashboardActivated(dashboardExt: vscode.Extension<DashboardExtensionApi>, pollingIntervalMillis: number) {
    return new Promise<void>((resolve) => {
        if (dashboardExt.isActive) {
            return resolve();
        }
        const id = setInterval(() => {
            if (dashboardExt.isActive) {
                clearInterval(id);
                resolve();
            }
        }, pollingIntervalMillis);
    });
}
