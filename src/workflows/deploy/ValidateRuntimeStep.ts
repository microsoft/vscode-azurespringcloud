// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureWizardExecuteStep } from "@microsoft/vscode-azext-utils";
import { ReadStream } from "fs";
import { ZipEntry } from "node-stream-zip";
import * as readline from 'readline';
import { Interface } from "readline";
import { Progress } from "vscode";
import { EnhancedDeployment } from "../../model/EnhancedDeployment";
import { localize } from "../../utils";
import { IAppDeploymentWizardContext } from "./IAppDeploymentWizardContext";
import StreamZip = require("node-stream-zip");

export class ValidateRuntimeStep extends AzureWizardExecuteStep<IAppDeploymentWizardContext> {
    public priority: number = 130;
    private readonly deployment: EnhancedDeployment;
    private readonly artifactPath: string;

    constructor(deployment: EnhancedDeployment, artifactPath: string) {
        super();
        this.deployment = deployment;
        this.artifactPath = artifactPath;
    }

    public async execute(context: IAppDeploymentWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const message: string = localize('validatingRuntime', 'Validating class bytecode version of artifact "{0}" to runtime version of target app...', this.artifactPath);
        progress.report({ message });
        const versionStr = (await this.deployment.runtimeVersion)?.split(/[\s\_]/)?.[1];
        if (!versionStr) {
            void context.ui.showWarningMessage(`Skip runtime version check because getting runtime version of target app ${this.deployment.app.name} failed.`);
            return;
        }
        const artifactVersion: number = await this.getClassByteCodeVersion(this.artifactPath);
        if (parseInt(versionStr) < artifactVersion - 44) {
            throw new Error(`The bytecode version of artifact (${this.artifactPath}) is "${artifactVersion} (Java ${artifactVersion - 44})",
            which is incompatible with the runtime "Java ${versionStr}" of the target app (${this.deployment.app.name}).
            This will cause the App to fail to start normally after deploying. Please consider rebuilding the artifact or selecting another app.`)
        }
    }

    public shouldExecute(_context: IAppDeploymentWizardContext): boolean {
        return true;
    }

    private async getClassByteCodeVersion(jarFilePath: string): Promise<number> {
        const zip: StreamZip.StreamZipAsync = new StreamZip.async({
            file: jarFilePath,
            storeEntries: true
        });

        // Manifest
        const manifestEntry: ZipEntry | undefined = await zip.entry('META-INF/MANIFEST.MF');
        if (!manifestEntry) {
            throw new Error(`invalid jar file: ${jarFilePath}, \`META-INF/MANIFEST.MF\` is not found.`)
        }
        const manifestStream: NodeJS.ReadableStream = await zip.stream(manifestEntry);
        const manifest: { [key: string]: string } = await this.readManifest(manifestStream);
        (manifestStream as ReadStream).destroy();

        // Main-Class
        const mainClass: string | undefined = manifest['Main-Class']?.replace(/\./g, '/')?.concat(".class");
        if (!mainClass) {
            throw new Error(`invalid jar file: ${jarFilePath}, \`Main-Class\` is not found in \`META-INF/MANIFEST.MF\`.`)
        }
        const mainClassEntry: ZipEntry | undefined = await zip.entry(mainClass);
        if (!mainClassEntry) {
            throw new Error(`invalid jar file: ${jarFilePath}, the specified \`Main-Class: ${manifest['Main-Class']}\` is not found.`)
        }
        const mainClassVersion: number = (await zip.entryData(mainClassEntry)).slice(6, 8).readUInt16BE();

        // Start-Class
        const startClass: string | undefined = manifest['Spring-Boot-Classes']?.concat(manifest['Start-Class']?.replace(/\./g, '/').concat(".class"));
        if (startClass) {
            const startClassEntry: ZipEntry | undefined = await zip.entry(startClass);
            if (!startClassEntry) {
                throw new Error(`invalid jar file: ${jarFilePath}, the specified \`Start-Class: ${manifest['Start-Class']}\` is not found.`)
            }
            const startClassVersion: number = (await zip.entryData(startClassEntry)).slice(6, 8).readUInt16BE();
            return Math.max(startClassVersion, mainClassVersion);
        }
        return mainClassVersion;
    }

    private async readManifest(manifestFileStream: NodeJS.ReadableStream): Promise<{ [key: string]: string }> {
        const lines: string[] = [];
        const rl: Interface = readline.createInterface({ input: manifestFileStream, crlfDelay: Infinity });
        for await (let l of rl) {
            if (l.startsWith(' ')) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                l = lines.pop()!.concat(l.substring(1));
            }
            lines.push(l);
        }
        rl.close();
        return lines.map(l => l.split(': '))
            .reduce((json, splits) => { json[splits[0]] = splits[1]; return json; }, {});
    }
}
