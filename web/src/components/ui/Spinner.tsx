/**
 * RN ActivityIndicator 대체
 */
export function Spinner({
  size = "small",
  color = "#d4b06a",
  className = "",
}: {
  size?: "small" | "large";
  color?: string;
  className?: string;
}) {
  const px = size === "large" ? 32 : 20;
  const border = size === "large" ? 3 : 2;
  return (
    <span
      role="status"
      aria-label="로딩 중"
      className={`inline-block shrink-0 animate-spin rounded-full ${className}`}
      style={{
        width: px,
        height: px,
        borderWidth: border,
        borderStyle: "solid",
        borderColor: color,
        borderRightColor: "transparent",
      }}
    />
  );
}
