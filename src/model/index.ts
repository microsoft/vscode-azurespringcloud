/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AppResource, DeploymentResource, ServiceResource } from "@azure/arm-appplatform";
import { AppService } from "../service/AppService";
import { DeploymentService } from "../service/DeploymentService";
import { ServiceService } from "../service/ServiceService";
import { nonNullProp } from "../utils";

class SpringCloudResourceId {
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

export interface IService extends ServiceResource {
    resourceGroup: string;
    name: string;
}

export namespace IService {
    export function fromResource(resource: ServiceResource): IService {
        const resourceId: SpringCloudResourceId = new SpringCloudResourceId(nonNullProp(resource, 'id'));
        return { ...resource, resourceGroup: resourceId.resourceGroup, name: resource.name! };
    }
}

export interface IApp extends AppResource {
    service: IService;
    name: string;
}

export namespace IApp {
    export function fromResource(resource: AppResource, service: IService): IApp {
        return {
            ...resource,
            service,
            name: resource.name!
        };
    }
}

export interface IDeployment extends DeploymentResource {
    app: IApp;
    name: string;
}

export namespace IDeployment {
    export function fromResource(resource: DeploymentResource, app: IApp): IDeployment {
        return {
            ...resource,
            app,
            name: resource.name!
        };
    }
}

export type EnhancedDeployment = IDeployment & DeploymentService;
export type EnhancedApp = IApp & AppService;
export type EnhancedService = IService & ServiceService;

export namespace EnhancedApp {
}

export namespace EnhancedDeployment {
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
