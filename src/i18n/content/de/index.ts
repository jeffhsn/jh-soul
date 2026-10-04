import all from "./all.json";
import read1 from "./read-1.json";
import read2 from "./read-2.json";

const content: Record<string, string> = { ...all, ...read1, ...read2 };
export default content;
