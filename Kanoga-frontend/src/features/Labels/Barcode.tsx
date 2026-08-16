import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

/** Renders a linear barcode as inline SVG. */
export function Barcode({
  value,
  format = "CODE128",
  height = 34,
  showText = false,
}: {
  value: string;
  format?: "CODE128" | "EAN13";
  height?: number;
  showText?: boolean;
}) {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format,
        height,
        width: 1.4,
        margin: 0,
        displayValue: showText,
        fontSize: 10,
      });
    } catch {
      if (ref.current) ref.current.innerHTML = "";
    }
  }, [value, format, height, showText]);

  if (!value) return null;
  return <svg ref={ref} style={{ maxWidth: "100%" }} />;
}
