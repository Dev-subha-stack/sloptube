// Stand-in for the old framework's <Image>: a plain <img> with the same props.
import type { CSSProperties, ImgHTMLAttributes } from "react";

type StaticImage = { src: string; width?: number; height?: number };

export type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "width" | "height"> & {
  src: string | StaticImage;
  width?: number | string;
  height?: number | string;
  fill?: boolean;
  priority?: boolean;
  unoptimized?: boolean;
  preload?: boolean;
  quality?: number;
  placeholder?: string;
  blurDataURL?: string;
};

export default function Image({
  src,
  fill,
  priority,
  unoptimized: _u,
  preload,
  quality: _q,
  placeholder: _p,
  blurDataURL: _b,
  style,
  loading,
  ...rest
}: ImageProps) {
  const url = typeof src === "string" ? src : src.src;
  const fillStyle: CSSProperties | undefined = fill
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style }
    : style;
  return <img src={url} style={fillStyle} loading={priority || preload ? "eager" : (loading ?? "lazy")} decoding="async" {...rest} />;
}
