import QRCode from "qrcode";
import { useEffect, useState } from "react";

interface Props {
  value: string;
}

export default function QrCode({ value }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, {
      width: 200,
      margin: 1,
      color: { dark: "#14141f", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!dataUrl) return null;

  return (
    <div className="qr-wrap">
      <img src={dataUrl} alt="QR-Code zum Beitreten" width={140} height={140} />
    </div>
  );
}
