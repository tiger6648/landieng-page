/**
 * 파일 하나를 요청 본문 그대로 업로드한다. fetch는 업로드 진행률을 주지 않아 XHR을 쓴다.
 * 서버가 { error } 를 돌려주면 그 메시지로 실패한다.
 */
export function uploadFile<T>(
  url: string,
  file: File,
  onProgress?: (ratio: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("x-file-name", encodeURIComponent(file.name));
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      let data: { error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && !data.error) {
        resolve(data as T);
      } else {
        reject(new Error(data.error ?? `업로드 실패 (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("네트워크 오류로 업로드하지 못했습니다."));
    xhr.send(file);
  });
}
