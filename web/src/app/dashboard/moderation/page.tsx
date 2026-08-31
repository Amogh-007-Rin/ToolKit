import { redirect } from "next/navigation";
import { requireModerator } from "@/lib/authorization";
import ModerationConsole from "./ModerationConsole";

export default async function ModerationPage() {
  if (!await requireModerator()) redirect("/dashboard");
  return <ModerationConsole />;
}
