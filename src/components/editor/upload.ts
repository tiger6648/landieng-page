import type { UploadedMedia } from "@/lib/clips";

/** 파일 하나를 업로드한다. fetch는 업로드 진행률을 주지 않아 XHR을 쓴다 */
export function uploadFile(
  file: File,
  onProgress: (ratio: number) => void,
): Promise<UploadedMedia> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/media");
    xhr.setRequestHeader("x-file-name", encodeURIComponent(file.name));
    xhr.setRequestHeader("content-type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      let data: { error?: string } & Partial<UploadedMedia> = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && data.mediaId) {
        resolve(data as UploadedMedia);
      } else {
        reject(new Error(data.error ?? `업로드 실패 (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("네트워크 오류로 업로드하지 못했습니다."));
    xhr.send(file);
  });
}
