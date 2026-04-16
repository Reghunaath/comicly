interface Props {
  id: string;
  label: string;
  type?: "email" | "password" | "text";
  autoComplete?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
}

export default function AuthField({
  id,
  label,
  type = "text",
  autoComplete,
  value,
  onChange,
  error,
  className = "",
}: Props) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-text">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={[
          "w-full rounded-lg border px-3 py-2 text-sm text-text outline-none transition-colors",
          "focus:ring-2 focus:ring-border-focus",
          error ? "border-error" : "border-border",
        ].join(" ")}
      />
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}
