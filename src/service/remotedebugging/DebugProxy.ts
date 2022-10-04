/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { EventEmitter } from 'events';
import { createServer, Server, Socket } from 'net';
import * as websocket from 'websocket';
import { ext } from '../../extensionVariables';
import { EnhancedDeployment } from "../EnhancedDeployment";
import { EnhancedInstance } from "../EnhancedInstance";

export class DebugProxy extends EventEmitter {
    private _server: Server | undefined;
    private _wsclient: websocket.client | undefined;
    private _wsconnection: websocket.connection | undefined;
    private readonly _instance: EnhancedInstance;
    private readonly _port: number;

    constructor(instance: EnhancedInstance, port: number) {
        super();
        this._instance = instance;
        this._port = port;
        this._server = createServer();
    }

    public async newStart(): Promise<void> {
        if (!this._server) {
            this.emit('error', new Error('Proxy server is not started.'));
        } else {
            const deployment: EnhancedDeployment = this._instance.deployment;
            const credential: { accessToken: string } = await deployment.app.service.subscription.credentials.getToken();
            const appName: string = deployment.app.name;
            const deploymentName: string = deployment.name;
            const instanceName: string = this._instance.name ?? 'unknown-instance';
            const fqdn: string = deployment.app.properties?.fqdn ?? 'unknown-host';
            const url: string = `wss://${fqdn}/api/remoteDebugging/apps/${appName}/deployments/${deploymentName}/instances/${instanceName}?port=5005`;
            const token: string = credential.accessToken;
            const forward = new PortForward();
            this._server.on('connection', async (socket: Socket) => {
                forward.portForward(url, token, socket);
            });

            this._server.on('listening', () => {
                ext.outputChannel.appendLog('[Proxy Server] start listening');
                this.emit('start');
            });

            this._server.listen({
                host: '127.0.0.1',
                port: this._port,
                backlog: 1
            });
        }
    }

    public async start(): Promise<void> {
        if (!this._server) {
            this.emit('error', new Error('Proxy server is not started.'));
        } else {
            this._server.on('connection', async (socket: Socket) => {
                if (this._wsclient) {
                    ext.outputChannel.appendLog(`[Proxy Server] The server is already connected. Rejected connection to "${socket.remoteAddress}:${socket.remotePort}"`);
                    this.emit('error', new Error(`[Proxy Server]  The server is already connected. Rejected connection to "${socket.remoteAddress}:${socket.remotePort}"`));
                    socket.destroy();
                } else {
                    ext.outputChannel.appendLog(`[Proxy Server] client connected ${socket.remoteAddress}:${socket.remotePort}`);
                    socket.pause();

                    this._wsclient = new websocket.client();

                    this._wsclient.on('connect', (connection: websocket.connection) => {
                        ext.outputChannel.appendLog('[WebSocket] client connected');
                        this._wsconnection = connection;

                        connection.on('close', (code: number, desc: string) => {
                            console.log('close:', code, desc);
                            ext.outputChannel.appendLog('[WebSocket] client closed');
                            this.dispose();
                            socket.destroy();
                            this.emit('end');
                        });

                        connection.on('error', (err: Error) => {
                            console.log('error:', err);
                            ext.outputChannel.appendLog(`[WebSocket] ${err}`);
                            this.dispose();
                            socket.destroy();
                            this.emit('error', err);
                        });

                        connection.on('message', (data: websocket.Message) => {
                            if ('binaryData' in data && data.binaryData) {
                                socket.write(data.binaryData);
                            }
                        });
                        socket.resume();
                    });

                    this._wsclient.on('connectFailed', (err: Error) => {
                        ext.outputChannel.appendLog(`[WebSocket] ${err}`);
                        this.dispose();
                        socket.destroy();
                        this.emit('error', err);
                    });

                    const deployment: EnhancedDeployment = this._instance.deployment;
                    const credential: { accessToken: string } = await deployment.app.service.subscription.credentials.getToken();
                    const appName: string = deployment.app.name;
                    const deploymentName: string = deployment.name;
                    const instanceName: string = this._instance.name ?? 'unknown-instance';
                    const fqdn: string = deployment.app.properties?.fqdn ?? 'unknown-host';
                    this._wsclient.connect(
                        `wss://remote-debugging-tooling.azuremicroservices.io/api/remoteDebugging/apps/debug-test-1/deployments/default/instances/debug-test-1-default-12-6ffc755876-hf67k?port=5005`,
                        undefined,
                        undefined,
                        {
                            Upgrade: 'websocket',
                            Connection: 'Upgrade',
                            Authorization: `Bearer ${credential.accessToken}`
                        }
                    );

                    socket.on('data', (data: Buffer) => {
                        if (this._wsconnection) {
                            this._wsconnection.send(data);
                        }
                    });

                    socket.on('end', () => {
                        ext.outputChannel.appendLog(`[Proxy Server] client disconnected ${socket.remoteAddress}:${socket.remotePort}`);
                        this.dispose();
                        this.emit('end');
                    });

                    socket.on('error', (err: Error) => {
                        ext.outputChannel.appendLog(`[Proxy Server] ${err}`);
                        this.dispose();
                        socket.destroy();
                        this.emit('error', err);
                    });
                }
            });

            this._server.on('listening', () => {
                ext.outputChannel.appendLog('[Proxy Server] start listening');
                this.emit('start');
            });

            this._server.listen({
                host: 'localhost',
                port: this._port,
                backlog: 1
            });
        }
    }

    public dispose(): void {
        if (this._wsconnection) {
            this._wsconnection.close();
            this._wsconnection = undefined;
        }
        if (this._wsclient) {
            this._wsclient.abort();
            this._wsclient = undefined;
        }
        if (this._server) {
            this._server.close();
            this._server = undefined;
        }
    }
}
