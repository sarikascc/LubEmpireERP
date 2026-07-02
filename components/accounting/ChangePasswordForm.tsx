"use client";

import { useState } from "react";
import { changePasswordAction } from "@/app/actions/auth";
import PasswordInput from "@/components/PasswordInput";

export default function ChangePasswordForm() {
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);

    try {
      const response = await changePasswordAction(formData);

      if (response?.error) {
        setErrorMsg(response.error);
        return;
      }

      setSuccessMsg("Password updated successfully.");
      e.currentTarget.reset();
    } catch {
      setErrorMsg("Failed to update password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const glassInput =
    "w-full p-3 bg-white border border-gray-100 shadow-sm rounded-xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-md">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Current Password
        </label>
        <PasswordInput
          name="current_password"
          className={`${glassInput} pr-10`}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          New Password
        </label>
        <PasswordInput
          name="new_password"
          placeholder="Min. 8 characters"
          className={`${glassInput} pr-10`}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Confirm New Password
        </label>
        <PasswordInput
          name="confirm_password"
          placeholder="Re-enter new password"
          className={`${glassInput} pr-10`}
        />
      </div>

      {errorMsg && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md font-medium">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-100 rounded-md font-medium">
          {successMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-[42px] px-6 bg-[var(--lub-gold)] hover:bg-[#c9a227] disabled:opacity-60 text-white text-sm font-bold rounded-md transition-colors shadow-sm flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Updating...
          </>
        ) : (
          "Update Password"
        )}
      </button>
    </form>
  );
}
