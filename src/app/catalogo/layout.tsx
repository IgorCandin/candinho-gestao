export default function PublicCatalogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="catalog-public-scope">{children}</div>;
}
