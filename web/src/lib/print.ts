/**
 * 인쇄 / PDF — expo-print 대체
 * 리포트 HTML 을 숨김 iframe 에 넣고 브라우저 인쇄 다이얼로그를 연다.
 * (iOS Safari / Chrome 모두 "PDF로 저장" 을 제공하므로 PDF 저장도 이 경로로 처리)
 */
export function printHtml(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const iframe = document.createElement("iframe");
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        iframe.remove();
        reject(new Error("인쇄 프레임을 만들 수 없습니다."));
        return;
      }
      doc.open();
      doc.write(html);
      doc.close();

      const cleanup = () => {
        setTimeout(() => iframe.remove(), 1000);
        resolve();
      };

      const win = iframe.contentWindow!;
      win.onafterprint = cleanup;
      // 폰트/이미지 로딩 후 인쇄
      setTimeout(() => {
        try {
          win.focus();
          win.print();
          // onafterprint 미지원 브라우저 대비
          setTimeout(cleanup, 3000);
        } catch (e) {
          iframe.remove();
          reject(e);
        }
      }, 250);
    } catch (e) {
      reject(e);
    }
  });
}
