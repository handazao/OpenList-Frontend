import axios from "axios"
import { initAIConfig } from "~/utils/ai_config"
import { RenameObj } from "~/types"

export let ai_url = ""
export let ai_api_key = ""
export let ai_model = ""

// 异步初始化配置
async function loadAIConfig() {
  const cfg = await initAIConfig()
  ai_url = cfg.url
  ai_api_key = cfg.apiKey
  ai_model = cfg.model
  console.log("AI Config Loaded:", cfg)
}

// 立即执行初始化
loadAIConfig()

// 限制速率：最多 2 个请求/秒
const RATE_LIMIT = 2
const INTERVAL = 1000
const GAP = INTERVAL / RATE_LIMIT // 500ms 执行一次任务

let queue: (() => void)[] = []
let timer: number | null = null

function startScheduler() {
  if (timer !== null) return
  timer = setInterval(() => {
    const task = queue.shift()
    if (task) task()
    if (queue.length === 0) {
      clearInterval(timer!)
      timer = null
    }
  }, GAP)
}

export const fsAiRename = (
  srcName: string,
  tempName: string,
  prompt: string,
): Promise<RenameObj> => {
  return new Promise((resolve) => {
    const task = async () => {
      try {
        const url = ai_url
        const apiKey = ai_api_key
        const aiModel = ai_model

        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        }

        if (!prompt.trim()) {
          prompt =
            "你是一个文件重命名助手。\n" +
            "请将输入文件名改写为符合 Jellyfin 命名规范的完整文件名。\n" +
            "输出格式固定为：\n" +
            "剧名.SxxExx.年份.扩展名\n" +
            "要求：\n" +
            "1. 保留输入文件的扩展名；\n" +
            "2. 不输出任何多余文字；\n" +
            "3. 若无年份或附加信息，可省略.；\n" +
            "4. 保留中文。\n" +
            "5. 将名称中的..改为."

          /*prompt =
            "你是一个文件重命名助手。\n" +
            "请将输入文件名改写为符合 Jellyfin 电影命名规范的完整文件名。\n" +
            "输出格式固定为：\n" +
            "电影名.年份.扩展名\n" +
            "要求：\n" +
            "1. 保留输入文件的扩展名；\n" +
            "2. 不输出任何多余文字；\n" +
            "3. 若无年份或附加信息，可省略；\n" +
            "4. 保留中文；\n" +
            "5. 将名称中的..改为.";*/
        }

        const data = {
          model: aiModel,
          messages: [
            { role: "system", content: prompt },
            { role: "user", content: `剧名:${tempName}; 文件名:${srcName};` },
          ],
        }

        const resp = await axios.post(url, data, { headers })
        const aiNewName =
          resp.data?.choices?.[0]?.message?.content?.trim() || srcName

        resolve({ src_name: srcName, new_name: aiNewName })
      } catch (err) {
        console.error(`fsAiRename error for ${srcName}:`, err)
        resolve({ src_name: srcName, new_name: srcName + "_error" })
      }
    }

    queue.push(task)
    startScheduler()
  })
}
