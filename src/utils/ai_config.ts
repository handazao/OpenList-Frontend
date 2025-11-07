import { PResp } from "~/types"
import { AI } from "~/types/ai"
import { r } from "./request"

let aiConfig: AI = {
  url: "",
  apiKey: "",
  model: "",
}

export function getAIConfig() {
  return aiConfig
}

export async function initAIConfig() {
  // 1. 尝试读取缓存
  try {
    const cacheStr = localStorage.getItem("ai_config")
    if (cacheStr) {
      const cache = JSON.parse(cacheStr)
      if (cache.url && cache.apiKey && cache.model) {
        aiConfig = cache
        return aiConfig
      }
    }
  } catch {
    localStorage.removeItem("ai_config")
  }

  // 2. 请求接口
  const resp: PResp<AI> = await r.post(`/auth/ai`)
  if (!resp?.data) throw new Error("无法获取 AI 配置")

  const { url, apiKey, model } = resp.data
  aiConfig = { url, apiKey, model }

  // 3. 写缓存
  localStorage.setItem("ai_config", JSON.stringify(aiConfig))

  return aiConfig
}
