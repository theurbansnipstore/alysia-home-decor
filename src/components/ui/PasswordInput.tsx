"use client";

import { useState, forwardRef, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, id, className, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const inputId = id || "password";

    return (
      <div>
        {label && (
          <label htmlFor={inputId} className="mb-1 block text-sm text-ink-700">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? "text" : "password"}
            className="w-full border border-ink-100 bg-bone-100 px-3 py-2 pr-10 text-sm text-charcoal focus:border-brass focus:outline-none"
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 hover:text-brass-600"
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-1 text-xs text-clay">
            {error}
          </p>
        )}
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

export default PasswordInput;
