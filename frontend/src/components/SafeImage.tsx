import { useState } from "react";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & { fallbackHeight?: number };

export default function SafeImage({ fallbackHeight = 80, ...imgProps }: Props) {
  const [ok, setOk] = useState(true);
  if (!ok) return <div style={{ height: fallbackHeight }} />;
  return (
    <img
      {...imgProps}
      onError={() => setOk(false)}
      style={{ display: "block", width: "100%", height: "auto", ...(imgProps.style || {}) }}
      alt={imgProps.alt ?? ""}
    />
  );
}
