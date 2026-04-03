interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-[3px]",
} as const;

export function LoadingSpinner({ size = "md", className = "" }: LoadingSpinnerProps) {
  return (
    <span
      role="status"
      aria-label="טוען"
      className={`inline-block animate-spin rounded-full border-neutral-300 border-t-neutral-900 ${SIZE[size]} ${className}`}
    />
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f4ef]">
      <LoadingSpinner size="lg" />
    </div>
  );
}
