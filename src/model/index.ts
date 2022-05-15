/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export class SpringCloudResourceId {
    private readonly parts: string[];

    public constructor(id: string) {
        // tslint:disable-next-line: no-unexternalized-strings
        this.parts = id.split("/");
    }

    public get subscription(): string {
        return this.parts[2];
    }

    public get resourceGroup(): string {
        return this.parts[4];
    }

    public get serviceName(): string {
        return this.parts[8];
    }

    public get appName(): string {
        return this.parts[10];
    }
}

export interface IScaleSettings {
    capacity?: number;
    cpu?: number;
    memory?: number;
}

export namespace IScaleSettings {
    // tslint:disable:no-unexternalized-strings
    export const LABELS: { [key: string]: string } = {
        cpu: "vCPU",
        memory: "Memory/GB",
        capacity: "Instance count"
    };
    export const SCOPES: { [key: string]: { [key: string]: { max: number; min: number } } } = {
        Enterprise: {
            cpu: { max: 4, min: 0.5 },
            memory: { max: 8, min: 0.5 },
            capacity: { max: 500, min: 1 }
        },
        Standard: {
            cpu: { max: 4, min: 0.5 },
            memory: { max: 8, min: 0.5 },
            capacity: { max: 500, min: 1 }
        },
        Basic: {
            cpu: { max: 1, min: 0.5 },
            memory: { max: 2, min: 0.5 },
            capacity: { max: 25, min: 1 }
        }
    };
}
