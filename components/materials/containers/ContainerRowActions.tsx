"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteContainerAction } from "@/app/actions/containers";

export default function ContainerRowActions({
  container,
  boxes,
  stickers,
  caps,
}: {
  container: any;
  boxes: { id: string; name: string }[];
  stickers: { id: string; name: string }[];
  caps: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  // --- DELETE HANDLER ---
  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete ${container.name}?`)) {
      setIsDeleting(true);
      try {
        const formData = new FormData();
        formData.append("id", container.id);
        await deleteContainerAction(formData);
        router.refresh();
      } catch (error: any) {
        alert(error.message);
        setIsDeleting(false);
      }
    }
  };

  // Clean, invisible button style that only colors the icon on hover
  const iconBtnClass =
    "p-1.5 text-gray-400 transition-colors hover:bg-gray-50 rounded-md";

  return (
    <div className="flex items-center justify-end gap-1">
      {/* 1. EDIT BUTTON (Clean Pencil) */}
      <button
        title="Edit Container"
        className={`${iconBtnClass} hover:text-amber-500`}
        // onClick={() => setIsEditOpen(true)} // Uncomment and add edit logic when needed
      >
        <svg
          className="w-[18px] h-[18px]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
      </button>

      {/* 2. DELETE BUTTON (Clean Trash Can) */}
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        title="Delete Container"
        className={`${iconBtnClass} hover:text-red-500 disabled:opacity-50`}
      >
        {isDeleting ? (
          <svg
            className="w-[18px] h-[18px] animate-spin text-red-500"
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
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        ) : (
          <svg
            className="w-[18px] h-[18px]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
