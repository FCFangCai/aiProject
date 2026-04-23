import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

interface RequestOptions {
  url: string;
  params?: any;
  data?: any;
  config?: AxiosRequestConfig;
}

const request = axios.create({
  baseURL: "/api",
  timeout: 10_000,
});

request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 本地可运行的假接口：命中 /mock/** 时直接返回模拟数据，无需后端
    if (config.url?.startsWith("/mock/")) {
      config.adapter = async () => {
        await new Promise((resolve) => setTimeout(resolve, 600));

        return {
          data: {
            code: 0,
            message: "success",
            data: {
              id: 1001,
              name: "Demo User",
              role: "admin",
              from: "mock-adapter",
            },
          },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
          request: null,
        };
      };
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

request.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body?.code == 0 || body?.code == 200) {
      return response.data;
    } else {
      return Promise.reject(new Error(body?.message || "业务请求失败"));
    }
  },
  (error: AxiosError) => {
    if (error.response) {
      return Promise.reject(
        new Error(
          `请求失败(${error.response.status})：${error.response.statusText || "未知错误"}`,
        ),
      );
    }

    if (error.request) {
      return Promise.reject(new Error("网络异常，请检查网络连接"));
    }

    return Promise.reject(new Error(error.message || "请求异常"));
  },
);

export const get = async <T = unknown>({
  url,
  params,
  config,
}: RequestOptions): Promise<any> => {
  return request.get<ApiResponse<T>, ApiResponse<T>>(url, { ...config, params });
};

export const post = async <T = unknown>({
  url,
  data,
  config,
}: RequestOptions): Promise<ApiResponse<T>> => {
  return request.post<ApiResponse<T>, ApiResponse<T>>(url, data, config);
};

export const put = async <T = unknown>({
  url,
  data,
  config,
}: RequestOptions): Promise<ApiResponse<T>> => {
  return request.put<ApiResponse<T>, ApiResponse<T>>(url, data, config);
};

export const deletes = async <T = unknown>({
  url,
  data,
  params,
  config,
}: RequestOptions): Promise<ApiResponse<T>> => {
  return request.delete<ApiResponse<T>, ApiResponse<T>>(url, {
    ...config,
    params,
    data,
  });
};
