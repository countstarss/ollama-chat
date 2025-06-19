/**
 * 通用的API请求封装
 */

interface FetcherOptions extends RequestInit {
  timeout?: number;
  onProgress?: (progress: number) => void;
}

interface FetcherResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

class FetcherError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'FetcherError';
    this.status = status;
    this.data = data;
  }
}

/**
 * 创建一个带超时的fetch请求
 */
function fetchWithTimeout(url: string, options: FetcherOptions = {}): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;

  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new FetcherError('请求超时', 408));
    }, timeout);

    fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })
      .then(response => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          reject(new FetcherError('请求被取消', 0));
        } else {
          reject(error);
        }
      });
  });
}

/**
 * 通用的API请求方法
 */
export async function fetcher<T = any>(
  url: string,
  options: FetcherOptions = {}
): Promise<FetcherResponse<T>> {
  try {
    const response = await fetchWithTimeout(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const contentType = response.headers.get('content-type');
    let data: any;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      return {
        error: data?.error?.message || data?.message || `请求失败 (${response.status})`,
        status: response.status,
        data,
      };
    }

    return {
      data,
      status: response.status,
    };
  } catch (error) {
    if (error instanceof FetcherError) {
      return {
        error: error.message,
        status: error.status,
      };
    }

    return {
      error: error instanceof Error ? error.message : '未知错误',
      status: 0,
    };
  }
}

/**
 * GET请求
 */
export async function get<T = any>(
  url: string,
  options?: Omit<FetcherOptions, 'method' | 'body'>
): Promise<FetcherResponse<T>> {
  return fetcher<T>(url, {
    ...options,
    method: 'GET',
  });
}

/**
 * POST请求
 */
export async function post<T = any>(
  url: string,
  data?: any,
  options?: Omit<FetcherOptions, 'method' | 'body'>
): Promise<FetcherResponse<T>> {
  return fetcher<T>(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * PUT请求
 */
export async function put<T = any>(
  url: string,
  data?: any,
  options?: Omit<FetcherOptions, 'method' | 'body'>
): Promise<FetcherResponse<T>> {
  return fetcher<T>(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE请求
 */
export async function del<T = any>(
  url: string,
  options?: Omit<FetcherOptions, 'method'>
): Promise<FetcherResponse<T>> {
  return fetcher<T>(url, {
    ...options,
    method: 'DELETE',
  });
}

/**
 * 流式响应处理
 */
export async function* streamFetcher(
  url: string,
  options: FetcherOptions = {}
): AsyncGenerator<string, void, unknown> {
  const response = await fetchWithTimeout(url, options);

  if (!response.ok) {
    const error = await response.text();
    throw new FetcherError(error, response.status);
  }

  if (!response.body) {
    throw new FetcherError('响应体为空', 0);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      yield chunk;
    }
  } finally {
    reader.releaseLock();
  }
}

// 导出类型
export type { FetcherOptions, FetcherResponse };
export { FetcherError };