interface Props {
  onClick: () => void;
}

export default function GoogleOAuthSection({ onClick }: Props) {
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface py-2.5 text-sm font-medium text-text transition-colors hover:bg-surface-alt"
      >
        Continue with Google
      </button>
      <div className="mb-4 flex items-center gap-3">
        <hr className="flex-1 border-border" />
        <span className="text-xs text-text-secondary">or</span>
        <hr className="flex-1 border-border" />
      </div>
    </>
  );
}
