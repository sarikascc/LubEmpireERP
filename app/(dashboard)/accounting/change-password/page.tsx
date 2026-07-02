import ChangePasswordForm from "@/components/accounting/ChangePasswordForm";

export default function ChangePasswordPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Change Password</h1>
        <p className="text-sm text-gray-500 mt-1">
          Update your account password. You will need your current password to
          confirm the change.
        </p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
