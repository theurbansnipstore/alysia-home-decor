"use client";

function scorePassword(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

const LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"];
const COLORS = ["bg-clay", "bg-clay", "bg-brass", "bg-brass", "bg-sage-600"];

export default function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const score = scorePassword(password);

  return (
    <div className="mt-2">
      <div className="flex h-1 gap-1" role="presentation">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-full flex-1 rounded-full transition-colors ${i < score ? COLORS[score] : "bg-ink-100"}`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-ink-500" aria-live="polite">
        {LABELS[score]}
      </p>
    </div>
  );
}
