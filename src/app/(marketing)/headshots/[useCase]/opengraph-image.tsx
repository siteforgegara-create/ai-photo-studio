import { getUseCase, useCases } from "@/config/use-cases";
import { ogContentType, ogSize, renderOg } from "@/lib/og";

export const alt = "AI headshots that look like you";
export const size = ogSize;
export const contentType = ogContentType;

export function generateStaticParams() {
  return useCases.map((u) => ({ useCase: u.slug }));
}

export default async function Image({ params }: { params: Promise<{ useCase: string }> }) {
  const { useCase } = await params;
  const uc = getUseCase(useCase);
  return renderOg({
    overline: `AI HEADSHOTS · ${(uc?.label ?? "HEADSHOTS").toUpperCase()}`,
    title: uc?.h1 ?? "Headshots that look like you",
    subtitle: "Free previews before you pay · Every photo checked for likeness",
  });
}
