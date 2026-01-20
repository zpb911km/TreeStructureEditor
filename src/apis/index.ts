import * as fs from "@tauri-apps/plugin-fs";
import * as path from "@tauri-apps/api/path";
import { AIConfig } from "../types";
import { showError, showInfo, showSuccess } from "../utils/notifications";


const AIConfigBaseDir = fs.BaseDirectory.AppLocalData;
const configPath = "AIConfig/";
const configFile = "ai_api.json";
const filesBaseDir = fs.BaseDirectory.Document;
const treePath = "tree_structure_files/";
const outputPath = "output/";

export async function saveAIConfig(config: AIConfig): Promise<void> {
  const exist = await fs.exists(configPath, { baseDir: AIConfigBaseDir });
  if (!exist) {
    await fs.mkdir(configPath, { baseDir: AIConfigBaseDir });
    showInfo("创建文件夹");
  }
  const configString = JSON.stringify(config);
  const encodedConfig = new TextEncoder().encode(configString);
  fs.open(await path.join(configPath, configFile), {
    baseDir: AIConfigBaseDir,
    create: true,
    write: true,
  }).then((file) => {
    file.write(encodedConfig).then(() => {
      file.close();
      showInfo("保存成功");
    });
  });
}

export async function loadAIConfig(): Promise<AIConfig | null> {
  try {
    const exist = await fs.exists(configPath, { baseDir: AIConfigBaseDir });
    if (!exist) {
      await fs.mkdir(configPath, { baseDir: AIConfigBaseDir });
      showInfo("创建文件夹");
    }
  } catch (error) {
    showError("创建文件夹失败: " + error);
    return null;
  }
  try {
    const configString = await fs.readTextFile(
      await path.join(configPath, configFile),
      {
        baseDir: AIConfigBaseDir,
      },
    );
    const config = JSON.parse(configString) as AIConfig;
    if (!(config.apiKey && config.baseURL && config.model)) {
      showError("配置文件不完整");
      return null;
    }
    return config;
  } catch (error) {
    const fileExist = await fs.exists(
      await path.join(configPath, configFile),
      {
        baseDir: AIConfigBaseDir,
      },
    );
    if (!fileExist) {
      showInfo("配置文件不存在,请填写并保存");
      return null;
    }
    showError("读取配置文件失败: " + error);
    return null;
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
      showInfo(`创建文件夹 ${currentDir} 成功`);
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
      showError("创建文件夹失败: " + error);
    }
  } else {
    showInfo(`文件夹${fullDir}已存在`);
  }
  console.log(`trying to write ${fullPath}`)
  fs.writeTextFile(fullPath, content, {
    baseDir: filesBaseDir,
    create: true,
  }).then(() => {
    showSuccess("保存成功");
  }).catch((error) => {
    showError("保存失败: " + error);
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
    showError("读取文件失败: " + error);
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
      showError("创建文件夹失败: " + error);
    }
  } else {
    showInfo(`文件夹${fullDir}已存在`);
  }
  console.log(`trying to write ${fullPath}`)
  fs.writeTextFile(fullPath, content, {
    baseDir: filesBaseDir,
    create: true,
  }).then(() => {
    showSuccess("导出成功");
  }).catch((error) => {
    showError("导出失败: " + error);
  });
}

export async function deleteFile(filePath: string): Promise<void> {
  const fullPath = await path.join(filesBaseDir.toString(), treePath, filePath);
  fs.remove(fullPath, {
    baseDir: filesBaseDir,
  }).then(() => {
    showSuccess("删除成功");
  }).catch((error) => {
    showError("删除失败: " + error);
  });
}

export async function getFilePaths(): Promise<string[]> {
  const filePaths = await fs.readDir(treePath, {
    baseDir: filesBaseDir,
  }).then((files) => {
    return files.map((file) => {
      return file.name;
    });
  })
  showInfo("获取文件列表成功" + filePaths);
  return filePaths;
}