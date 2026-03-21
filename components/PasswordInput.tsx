"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <input
        className="input-field w-full pr-10"
        type={showPassword ? "text" : "password"}
        name="password"
        placeholder="••••••••"
        required
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-[var(--lub-gold)] transition-colors cursor-pointer"
        onMouseDown={() => setShowPassword(true)}
        onMouseUp={() => setShowPassword(false)}
        onMouseLeave={() => setShowPassword(false)}
        onTouchStart={() => setShowPassword(true)}
        onTouchEnd={() => setShowPassword(false)}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}