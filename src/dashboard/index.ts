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

        const emitter = new vscode.EventEmitter<void>();
        vscode.commands.registerCommand("azure.springcloud.changedata", () => emitter.fire());
        const provider: RemoteBootAppDataProvider = {
            onDidChangeData: emitter.event,
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
                        host: "hanli-test-spring-app-spring-app-20230207162021.azuremicroservices.io",
                        jmxurl: "https://hanli-test-spring-app-spring-app-20230207162021.azuremicroservices.io/actuator",
                        name: "hanli-test-spring-app-spring-app-20230207162021",
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
