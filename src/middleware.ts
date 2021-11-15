import { Image } from "./image";

export type ImageMiddleware = (image: Image) => Promise<void>;
