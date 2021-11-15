import { Workspace } from "./workspace";
import {
  AddRequest,
  CopyRequest,
  CommitRequest,
  ConfigRequest,
  FromRequest,
  RunRequest,
  OutputResponse,
  Container,
} from "@nitric/boxygen-api/builder/v1/builder_pb";
import { ImageMiddleware } from "./middleware";


export interface FromOpts {
  as?: string;
  ignore?: string[];
}

interface CopyOpts {
  from: Image;
}

interface ConfigOpts {
	ports?: number[];
	env?: Record<string, string>;
	volumes?: string[];
	workDir?: string;
	entrypoint?: string[];
	cmd?: string[];
}

/**
 *
 */
export class Image {
  public readonly workspace: Workspace;
  public readonly id: Promise<string>;

  // Ensure all instructions are applied in order
  // private instructions: Promise<void>[];
	private instructions: ((image: Image) => Promise<void>)[];

  private constructor(workspace: Workspace, id: Promise<string>) {
    this.id = id;
    this.workspace = workspace;
    this.instructions = [];
  }

  private get container(): Promise<Container> {
    return new Promise(async (res) => {
      const con = new Container();
      const id = await this.id;

      con.setId(id);

      res(con);
    });
  }

  /**
   *
   */
  public add(src: string, dest: string): Image {
		this.instructions.push(async (i) => {
			const addRequest = new AddRequest();
      const container = await i.container;

      addRequest.setSrc(src);
      addRequest.setDest(dest);
      addRequest.setContainer(container);

      const resp = i.workspace.client.add(addRequest);

      // Log output
      resp.on("data", (data: OutputResponse) => {
        i.workspace.logger(data.getLogList());
      });

      return new Promise<void>(res => resp.once("end", res));
		});

    return this;
  }

  public copy(src: string, dest: string, opts?: CopyOpts): Image {
		this.instructions.push(async (i) => {
			const copyRequest = new CopyRequest();
      const container = await i.container;

      if (opts && opts.from) {
        const id = await opts.from.id;
        copyRequest.setFrom(id);
      }

      copyRequest.setContainer(container);
      copyRequest.setSource(src);
      copyRequest.setDest(dest);

      const resp = i.workspace.client.copy(copyRequest);

      // Log output
      resp.on("data", (data: OutputResponse) => {
        i.workspace.logger(data.getLogList());
      });

			return new Promise<void>(res => resp.once("end", res));
		});

    return this;
  }

  public run(cmd: string[]): Image {
		this.instructions.push(async (i) => {
			const runRequest = new RunRequest();
      const container = await i.container;

      runRequest.setContainer(container);
      runRequest.setCommandList(cmd);

      const resp = i.workspace.client.run(runRequest);
      // Log output
      resp.on("data", (data: OutputResponse) => {
        i.workspace.logger(data.getLogList());
      });

			return new Promise<void>(res => resp.once("end", res));
		});

    return this;
  }

  public config(opts: ConfigOpts): Image {
		this.instructions.push(async (i) => {
			const configRequest = new ConfigRequest();
      const container = await i.container;

      configRequest.setContainer(container);
			if (opts.ports) {
				configRequest.setPortsList(opts.ports);
			}

			if (opts.cmd) {
				configRequest.setCmdList(opts.cmd);
			}

			if (opts.entrypoint) {
				configRequest.setEntrypointList(opts.entrypoint);
			}

			if (opts.volumes) {
				configRequest.setVolumesList(opts.volumes);
			}

      if (opts.workDir) {
        configRequest.setWorkingDir(opts.workDir);
      }

			if (opts.env) {
				Object.entries(opts.env).forEach(([k,v]) => {
					configRequest.getEnvMap().set(k,v);
				});
			}
      
      const resp = i.workspace.client.config(configRequest);

      // Log output
      resp.on("data", (data: OutputResponse) => {
        i.workspace.logger(data.getLogList());
      });

			return new Promise<void>(res => resp.once("end", res));
		});

    return this;
  }

  public apply(...middleware: ImageMiddleware[]): Image {
    for (let mware of middleware) {
      this.instructions.push(mware);
    }

    return this;
  }

	// apply queued instructions
	public async stage(): Promise<Image> {
		for(const i of this.instructions) {
			await i(this);
		}

		// clear out the queue
		this.instructions = [];

    return this;
	}

  public async commit(tag: string) {
		await this.stage();

    const container = await this.container;
    const commitRequest = new CommitRequest();

    commitRequest.setTag(tag);
    commitRequest.setContainer(container);

    const resp = this.workspace.client.commit(commitRequest);

    resp.on("data", (data: OutputResponse) => {
      this.workspace.logger(data.getLogList());
    });

    return await new Promise<void>((res) => {
      resp.once("end", res);
    });
  }

  private static from(workspace: Workspace, image: string, opts: FromOpts = {}): Image {
    const req = new FromRequest();
    req.setImage(image);
    req.setAs(opts.as || "");
    req.setIgnoreList(opts.ignore || []);

    // Call the server and prepare to containerise
    const id = new Promise<string>((res, rej) => {
      workspace.client.from(req, (err, data) => {
        if (err) {
          rej(err);
        } else {
          res(data.getContainer().getId());
        }
      });
    });

    return new Image(workspace, id);
  }
}
