import { PublicProductBanner } from "@/components/public-product-banner";

export default async function PublicProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <>
      <PublicProductBanner slug={slug} />
      {children}
    </>
  );
}
