import { notFound } from "next/navigation";
import ParticipantScreen from "@/components/ParticipantScreen";
import { isValidCode } from "@/lib/session";

export const metadata = {
  title: "Join · Prompt Lab",
};

export default function JoinPage({ params }: { params: { code: string } }) {
  if (!isValidCode(params.code)) notFound();
  return <ParticipantScreen code={params.code} />;
}
