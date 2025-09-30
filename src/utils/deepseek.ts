import axios from "axios"
import { RenameObj } from "~/types"

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
  return new Promise((resolve, reject) => {
    const task = async () => {
      try {
        const url = "https://api.modelarts-maas.com/v1/chat/completions"
        const apiKey =
          "ntIHrEUbDYO-KmFSjy7J86p2BfcXzgwOMqJNvuJs2_nH-HKpeTxKeg2VfUfJOrVFKP3uhL2bTeOM5uWJB8GNbg" // 替换成你的 Key

        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        }

        const data = {
          model: "DeepSeek-V3",
          messages: [
            {
              role: "system",
              content:
                "你是一个文件重命名助手。请返回符合 Jellyfin 命名规则的文件名（格式：剧名.SxxExx.年份.附加信息，不带路径和扩展名）。只返回文件名，不要多余文字。",
            },
            {
              role: "user",
              content: `提示:${prompt}; 文件名:${srcName}; 临时名:${tempName}`,
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
        reject(err)
      } finally {
        active--
        processQueue()
      }
    }

    queue.push(task)
    processQueue()
  })
}
