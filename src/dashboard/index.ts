import * as vscode from "vscode";
import { DashboardExtensionApi, RemoteBootAppDataProvider, RemoteBootAppDataProviderOptions } from "./api";

export async function init(context: vscode.ExtensionContext) {
    const dashboardExt = vscode.extensions.getExtension<DashboardExtensionApi>("vscjava.vscode-spring-boot-dashboard");
    if (dashboardExt) {
        const api = await dashboardExt.activate(); // TODO: passively get API instead of forcing to activate it?
        const options: RemoteBootAppDataProviderOptions = { iconPath: new vscode.ThemeIcon("azure") };
        const iconPathForApps = {
            dark: vscode.Uri.joinPath(context.extensionUri, "resources", "dark", "app.svg"),
            light: vscode.Uri.joinPath(context.extensionUri, "resources", "light", "app.svg"),
        };
        const provider: RemoteBootAppDataProvider = {
            provide() {
                // TODO: provide a list of running spring app metadata
                return [
                    {
                        host: "localhost-8080",
                        jmxurl: "http://localhost:8080/actuator",
                        name: "appRunningOnLocalhost",
                        description: "via actuator http endpoints",
                        group: "azure-spring-cloud",
                        iconPath: iconPathForApps
                    },
                    {
                        host: "xxxxx.azuremicroservices.io",
                        jmxurl: "https://xxxxx.azuremicroservices.io/actuator",
                        name: "xxxxx",
                        description: "spring-petclinic",
                        group: "azure-spring-cloud",
                        iconPath: iconPathForApps
                    }
                ];
            },
        };

        api.registerRemoteBootAppDataProvider("Azure", provider, options);
    } else {
        // TODO: ask user consent to install dashboard extension?
    }
}
