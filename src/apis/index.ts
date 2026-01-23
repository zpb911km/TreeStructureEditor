import * as fs from "@tauri-apps/plugin-fs";
import * as path from "@tauri-apps/api/path";
import { AIConfig, Config, FileNode } from "../types";
import { showError, showInfo, showSuccess } from "../utils/notifications";


const AIConfigBaseDir = fs.BaseDirectory.AppLocalData;
const AIConfigPath = "AIConfig/";
const AIConfigFile = "ai_api.json";
const configBaseDir = fs.BaseDirectory.AppLocalData;
const configPath = "config/";
const configFile = "config.json";
const filesBaseDir = fs.BaseDirectory.Document;
const treePath = "tree_structure_files/";
const outputPath = "output/";

export async function mkTreePathDir(): Promise<void> {
  const exist = await fs.exists(treePath.trim(), { baseDir: filesBaseDir });
  if (!exist) {
    await fs.mkdir(treePath.trim(), { baseDir: filesBaseDir });
    showInfo("make root folder");
  } else {
    showSuccess("root folder exists");
  }
}

export async function saveAIConfig(config: AIConfig): Promise<void> {
  const exist = await fs.exists(AIConfigPath, { baseDir: AIConfigBaseDir });
  if (!exist) {
    await fs.mkdir(AIConfigPath, { baseDir: AIConfigBaseDir });
    showInfo("mkdir");
  }
  const configString = JSON.stringify(config);
  fs.writeTextFile(
    await path.join(AIConfigPath, AIConfigFile),
    configString,
    {
      baseDir: AIConfigBaseDir,
      create: true,
    },
  ).then(() => {
    showSuccess("save success");
  }).catch((error) => {
    showError("save error: " + error);
  });
}

export async function loadAIConfig(): Promise<AIConfig | null> {
  try {
    const exist = await fs.exists(AIConfigPath, { baseDir: AIConfigBaseDir });
    if (!exist) {
      await fs.mkdir(AIConfigPath, { baseDir: AIConfigBaseDir });
      showInfo("mkdir");
    }
  } catch (error) {
    showError("mkdir error: " + error);
    return null;
  }
  try {
    const configString = await fs.readTextFile(
      await path.join(AIConfigPath, AIConfigFile),
      {
        baseDir: AIConfigBaseDir,
      },
    );
    const config = JSON.parse(configString) as AIConfig;
    if (!(config.apiKey && config.baseURL && config.model)) {
      showError("config file is invalid");
      return null;
    }
    return config;
  } catch (error) {
    const fileExist = await fs.exists(
      await path.join(AIConfigPath, AIConfigFile),
      {
        baseDir: AIConfigBaseDir,
      },
    );
    if (!fileExist) {
      showInfo("No config file exists, please save config file first.");
      return null;
    }
    showError("load error: " + error);
    return null;
  }
}

export async function saveConfig(config: Config): Promise<void> {
  const exist = await fs.exists(configPath, { baseDir: configBaseDir });
  if (!exist) {
    await fs.mkdir(configPath, { baseDir: configBaseDir });
    showInfo("mkdir");
  }
  const configString = JSON.stringify(config);
  await fs.writeTextFile(
    await path.join(configPath, configFile),
    configString,
    {
      baseDir: configBaseDir,
      create: true,
    },
  ).then(() => {
    showSuccess("save success");
  }).catch((error) => {
    showError("save error: " + error);
  });
}

export async function loadConfig(): Promise<Config> {
  try {
    const exist = await fs.exists(configPath, { baseDir: configBaseDir });
    if (!exist) {
      await fs.mkdir(configPath, { baseDir: configBaseDir });
      showInfo("mkdir");
    }
  } catch (error) {
    showError("mkdir error: " + error);
    return {};
  }
  try {
    const configbytes = await fs.readFile(
      await path.join(configPath, configFile),
      {
        baseDir: configBaseDir,
      },
    );
    const configString = new TextDecoder().decode(configbytes);
    const config = JSON.parse(configString) as Config;
    return config;
  } catch (error) {
    const fileExist = await fs.exists(
      await path.join(configPath, configFile),
      {
        baseDir: configBaseDir,
      },
    );
    if (!fileExist) {
      showInfo("Config file not exists, please save config file first.");
      return {};
    }
    showError("load config error: " + error);
    return {};
  }
}

async function recursiveMakeDir(dir: string): Promise<void> {
  const dirs = dir.split(path.sep());
  let currentDir = "";
  for (const dir of dirs) {
    currentDir += dir + path.sep();
    const exist = await fs.exists(currentDir, { baseDir: filesBaseDir });
    if (!exist) {
      await fs.mkdir(currentDir, { baseDir: filesBaseDir });
      showInfo(`mkdir: ${currentDir}`);
    }
  }
}

export async function saveFile(shortPath: string, content: string): Promise<void> {
  const fullPath = await path.join(treePath, shortPath);
  const fullDir = await path.dirname(fullPath) + path.sep();
  const exist = await fs.exists(fullPath, { baseDir: filesBaseDir });
  console.log(shortPath, treePath, fullPath, fullDir, exist)
  if (!exist) {
    try {
      await recursiveMakeDir(fullDir);
    } catch (error) {
      showError("fail in mkdir:" + error);
    }
  } else {
    showInfo(`${fullDir} is ready`);
  }
  console.log(`trying to write ${fullPath}`)
  fs.writeTextFile(fullPath, content, {
    baseDir: filesBaseDir,
    create: true,
  }).then(() => {
    showSuccess("save success");
  }).catch((error) => {
    showError("save error: " + error);
  });
}

export async function loadFile(filePath: string): Promise<string | null> {
  const fullPath = await path.join(treePath, filePath);
  try {
    const content = await fs.readTextFile(fullPath, {
      baseDir: filesBaseDir,
    });
    return content;
  } catch (error) {
    showError("loadFile error: " + error);
    return null;
  }
}

export async function outputFile(shortPath: string, content: string) {
  let fullPath = await path.join(treePath, shortPath);
  const fullDir = await path.dirname(fullPath) + path.sep() + outputPath + path.sep();
  const name = (await path.basename(fullPath)).replace(".json", ".html");
  fullPath = await path.join(fullDir, name);
  const exist = await fs.exists(fullPath, { baseDir: filesBaseDir });
  console.log(shortPath, treePath, fullPath, fullDir, exist)
  if (!exist) {
    try {
      await recursiveMakeDir(fullDir);
    } catch (error) {
      showError("fail in mkdir: " + error);
    }
  } else {
    showInfo(`${fullDir} is ready`);
  }
  console.log(`trying to write ${fullPath}`)
  fs.writeTextFile(fullPath, content, {
    baseDir: filesBaseDir,
    create: true,
  }).then(() => {
    showSuccess("success export");
  }).catch((error) => {
    showError("export error:" + error);
  });
}

export async function deleteFile(filePath: string): Promise<void> {
  const fullPath = await path.join(treePath, filePath);
  fs.remove(fullPath, {
    baseDir: filesBaseDir,
  }).then(() => {
    showSuccess("success delete");
  }).catch((error) => {
    showError("delete failed: " + error);
  });
}

export async function createFile(parentDir: string | null, fileName: string): Promise<void> {
  let fullPath = treePath;
  if (parentDir) {
    fullPath = await path.join(treePath, parentDir) + path.sep();
  }
  fullPath = await path.join(fullPath, fileName);
  
  fs.writeTextFile(fullPath, "", {
    baseDir: filesBaseDir,
    create: true,
  }).then(() => {
    showSuccess("success create");
  }).catch((error) => {
    showError("create error: " + error);
  });
}

export async function createDirectory(parentDir: string | null, dirName: string): Promise<void> {
  let fullPath = treePath;
  if (parentDir) {
    fullPath = await path.join(treePath, parentDir) + path.sep();
  }
  fullPath = await path.join(fullPath, dirName);
  
  fs.mkdir(fullPath, {
    baseDir: filesBaseDir,
    recursive: true,
  }).then(() => {
    showSuccess("success mkdir");
  }).catch((error) => {
    showError("mkdir error: " + error);
  });
}

export async function renameFile(oldPath: string, newName: string): Promise<void> {
  const fullPath = await path.join(treePath, oldPath);
  const dirPath = await path.dirname(fullPath);
  const newFullPath = await path.join(dirPath, newName);
  
  fs.rename(fullPath, newFullPath, {
    oldPathBaseDir: filesBaseDir,
    newPathBaseDir: filesBaseDir,
  }).then(() => {
    showSuccess("success rename");
  }).catch((error) => {
    showError("rename error: " + error);
  });
}

export async function getFilePaths(node: FileNode | null | undefined, dirPath?: string): Promise<FileNode[]> {
  let baseDir = filesBaseDir;
  let queryPath = treePath;
  if (dirPath) {
    // 如果传入了 dirPath，说明是子目录，直接使用 dirPath 作为查询路径
    queryPath = await path.join(treePath, dirPath) + path.sep();
  } else if (node && node.isDirectory) {
    // 如果没有传入 dirPath 但传入了 node，使用 node.name
    queryPath = await path.join(treePath, node.name) + path.sep();
  }
  return await fs.readDir(queryPath, {
    baseDir,
  }) as FileNode[];
}