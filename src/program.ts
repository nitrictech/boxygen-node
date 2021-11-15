import { Workspace } from "./workspace";

export type BoxygenProgram = (workspace: Workspace) => Promise<void>;
