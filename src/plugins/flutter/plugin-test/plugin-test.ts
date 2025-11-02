import { createPlugin } from "@types";

declare const danger: any;
declare const message: (msg: string) => void;
declare const warn: (msg: string) => void;
declare const fail: (msg: string) => void;

export default createPlugin(
  {
    name: "plugin-test",
    description: "Plugin para teste",
    enabled: true,
  },
  async () => {
    const modifiedFiles = danger.git.modified_files;
    const createdFiles = danger.git.created_files;
    const allFiles = [...modifiedFiles, ...createdFiles];

    message(`✅ ISSO ESTÁ SENDO EXECUTDO PELO PLUGIN-TEST.`);
  }
);
