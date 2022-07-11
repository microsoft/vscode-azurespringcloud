// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface IScaleSettings {
    capacity?: number;
    cpu?: number;
    memory?: number;
}

export namespace IScaleSettings {
    export const LABELS: { [key: string]: string } = {
        cpu: 'vCPU',
        memory: 'Memory/GB',
        capacity: 'Instance count'
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
