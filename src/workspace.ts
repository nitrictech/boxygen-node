// Copyright 2021, Nitric Technologies Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { BoxygenProgram } from "./program";
import { Image, FromOpts } from "./image";
import { Logger, DEFAULT_LOGGER } from "./logger";
import { BuilderClient } from "@nitric/boxygen-api/builder/v1/builder_grpc_pb";
import * as grpc from "@grpc/grpc-js";
import execa from "execa";
import getPort from "get-port";
import { oneLine } from "common-tags";
import * as path from "path";
import tcpPortUsed from 'tcp-port-used';

const DEFAULT_TIMEOUT = 5000;

const DEFAULT_OPTS = {
  context: ".",
  logger: DEFAULT_LOGGER,
  timeout: DEFAULT_TIMEOUT,
  version: "latest",
};

interface WorkspaceOptions {
  context: string;
  logger: Logger;
  timeout: number;
  version: string;
}

export const DEFAULT_VERSION = "latest";

export const BOXYGEN_IMAGE = "nitrictech/boxygen-dockerfile";

/**
 *
 */
export class Workspace {
  // hold reference to instansiated client here...
  public readonly logger: Logger;
  private readonly _client: BuilderClient;
  public readonly context: string;

  private constructor(client: BuilderClient, opts: WorkspaceOptions) {
    this._client = client;
    this.logger = opts.logger;
    this.context = path.resolve(opts.context);
  }

  public get client() {
    return this._client;
  }

  // Create a new image from this workspace
  public image(from: string, opts: FromOpts = {}): Image {
    return Image["from"](this, from, opts);
  }

  public static async start(
    program: BoxygenProgram,
    opts: Partial<WorkspaceOptions> = DEFAULT_OPTS
  ): Promise<void> {
    // TODO: Start the boxygen server and callback the user program
    const port = await getPort();

    // Enforce default opts where partially defined
    const options = {
      ...DEFAULT_OPTS,
      ...opts,
    };

    const image = `${BOXYGEN_IMAGE}:${options.version}`

    const ctx = path.resolve(options.context);

    execa.commandSync(`docker pull ${image}`);

    const cmdStr = oneLine`
			docker run 
			--rm 
			--privileged 
			-p${port}:50051 
			-v/var/run/docker.sock:/var/run/docker.sock 
			-v${ctx}:/workspace/ ${image}
		`;

    const cmd = execa.command(cmdStr);

    // Give the server time to startup
    // FIXME: Should replace this with a retry connection test on the gRPC port
    await tcpPortUsed.waitUntilUsed(port, 100, options.timeout);

    const client = new BuilderClient(
      `127.0.0.1:${port}`,
      grpc.ChannelCredentials.createInsecure()
    );
    const wkspc = new Workspace(client, options);

    await program(wkspc);

    cmd.kill();
  }
}
