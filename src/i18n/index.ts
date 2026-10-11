import type { Lang } from "../types";
import { en } from "./en";
import { fr, type Strings } from "./fr";

export const strings: Record<Lang, Strings> = { fr, en };
export type { Strings };
