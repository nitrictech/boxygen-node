export const DEFAULT_LOGGER = (lines: string[]) => {
  lines.forEach((l) => console.log(l));
};

export type Logger = (lines: string[]) => void;
