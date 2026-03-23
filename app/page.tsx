import { redirect } from "next/navigation";

export default function RootPage() {
  // This instantly sends the user to the new Factory Dashboard upon login
  redirect("/dashboard");
}
