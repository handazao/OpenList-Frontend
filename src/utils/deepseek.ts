import axios from "axios"
import { RenameObj } from "~/types"

export let ai_url = import.meta.env.VITE_AI_URL as string
export let ai_api_key = import.meta.env.VITE_AI_API_KEY as string

// 限制速率：最多 2 个请求/秒
const RATE_LIMIT = 2
const INTERVAL = 1000

let queue: (() => void)[] = []
let active = 0

function processQueue() {
  while (active < RATE_LIMIT && queue.length > 0) {
    const task = queue.shift()
    if (task) {
      active++
      task()
    }
  }
  setTimeout(() => {
    active = 0
    processQueue()
  }, INTERVAL)
}

// 启动调度器
processQueue()

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
            "5. 将名称中的..改为.";


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
          model: "DeepSeek-V3",
          messages: [
            {
              role: "system",
              content: prompt,
            },
            {
              role: "user",
              content: `剧名:${tempName}; 文件名:${srcName};`,
            },
          ],
        }

        const resp = await axios.post(url, data, { headers })
        const aiNewName =
          resp.data?.choices?.[0]?.message?.content?.trim() || srcName

        resolve({
          src_name: srcName,
          new_name: aiNewName,
        })
      } catch (err) {
        console.error(`fsAiRename error for ${srcName}:`, err)
        // 出错时返回原文件名，避免上层阻塞
        resolve({
          src_name: srcName,
          new_name: srcName + "_error",
        })
      } finally {
        active--
        processQueue()
      }
    }

    queue.push(task)
    processQueue()
  })
}
