import { deletes, get, post } from "@/utils";
import { fetchEventSource } from "@microsoft/fetch-event-source";

export interface DemoUser {
  id?: number;
  content: string;
  role: string;
}

export interface GetListParams {
  pageNum: number;
  pageSize: number;
  keyword?: string;
}
export interface LLMRequestParams {
  keyword: string;
  userId: string;
  convertId: string;
}
/**
 *
 * @param data
 * @returns 用户提问调用
 */

// 保存 SSE 实例
let currentSSE = null;

export const httpLLMRequest = (data: any, callback: Function) => {
  currentSSE = fetchEventSource("/api/llm", {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    async onopen(response) {
      if (!response.ok) throw new Error("请求失败");
    },
    onmessage(event) {
      callback(event);
    },
    onerror() {
      // 不抛出错误，避免自动断开
      return;
    },
  });
  return currentSSE;
};
/**
 *
 * @param data
 * @returns 创建一条新的对话记录
 */
export const httpCoversationCreate = (data: { userId: string }) => {
  return get({
    url: "/conversation/create",
    params: data,
  });
};
// 终止方法
export const stopLLMRequest = () => {
  if (currentSSE) {
    currentSSE.close();
    currentSSE = null;
  }
};
/**
 *
 * @param data
 * @returns 通过对话记录id和用户id 获取一条记录详情
 */
export const httpConversationGet = (data: {
  userId: string;
  convertId: string;
}) => {
  return get({
    url: "/conversation/get",
    params: data,
  });
};
/**
 *
 * @param data
 * @returns 通过用户id获取所有用户的历史会话
 */
export const httpConversationlistTitle = (data: { userId: string }) => {
  return get<any>({
    url: "conversation/list",
    params: data,
  });
};
/**
 *
 * @param data
 * @returns 通过用户id获取所有用户的历史会话
 */
export const httpDelConvertById = (data: {
  userId: string;
  convertId: string;
}) => {
  return deletes<any>({
    url: "/conversation/delete",
    params: data,
  });
};
/**
 *
 * @param data
 * @returns 返回base 64的上传接口
 */
export const uploadImage = (data) => {
  return post({
    url: "/upload/image",
    data,
    config: {
      headers: { "Content-Type": "multipart/form-data" },
    },
  });
};
