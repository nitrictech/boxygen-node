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

const DEFAULT_OPTS = {
  context: ".",
  logger: DEFAULT_LOGGER,
};

interface WorkspaceOptions {
  context: string;
  logger: Logger;
}

const PORT_TIMEOUT = 5000;

export const BOXYGEN_IMAGE = "nitrictech/boxygen-dockerfile:rc-latest";

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
    return Image["from"](this, from);
  }

  public static async start(
    program: BoxygenProgram,
    opts: WorkspaceOptions = DEFAULT_OPTS
  ): Promise<void> {
    // TODO: Start the boxygen server and callback the user program
    const port = await getPort();

    const ctx = path.resolve(opts.context);

    execa.commandSync(`docker pull ${BOXYGEN_IMAGE}`);

    const cmdStr = oneLine`
			docker run 
			--rm 
			--privileged 
			-p${port}:50051 
			-v/var/run/docker.sock:/var/run/docker.sock 
			-v${ctx}:/workspace/ ${BOXYGEN_IMAGE}
		`;

    const cmd = execa.command(cmdStr);

    // Give the server time to startup
    // FIXME: Should replace this with a retry connection test on the gRPC port
    await tcpPortUsed.waitUntilUsed(port, 100, PORT_TIMEOUT);

    const client = new BuilderClient(
      `127.0.0.1:${port}`,
      grpc.ChannelCredentials.createInsecure()
    );
    const wkspc = new Workspace(client, opts);

    await program(wkspc);

    cmd.kill();
  }
}
