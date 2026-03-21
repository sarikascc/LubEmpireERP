import { redirect } from "next/navigation";

export default function RootPage() {
  // This instantly sends the user to the starting module of the ERP
  redirect("/materials/raw-materials");
}
