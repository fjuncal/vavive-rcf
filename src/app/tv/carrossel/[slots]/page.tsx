import { notFound } from "next/navigation";
import { TVMultiCarousel } from "@/components/tv/tv-multi-carousel";

export default async function TVMultiCarouselPage({
  params,
}: {
  params: Promise<{ slots: string }>;
}) {
  const { slots } = await params;
  if (slots !== "2" && slots !== "4") notFound();
  return <TVMultiCarousel slots={slots === "2" ? 2 : 4} />;
}
