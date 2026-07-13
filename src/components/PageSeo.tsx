import { Helmet } from "react-helmet-async";

interface PageSeoProps {
  title: string;
  description: string;
  path: string;
  jsonLd?: object | object[];
}

/**
 * Per-route <head> tags. Renders a unique title, description, canonical,
 * og:title/og:description/og:url and optional JSON-LD for the current page.
 * Sitewide og:image + Organization/SoftwareApplication schema stay in index.html.
 */
export default function PageSeo({ title, description, path, jsonLd }: PageSeoProps) {
  const url = `https://roboheard.ai${path}`;
  const blocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:url" content={url} />
      {blocks.map((b, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(b)}</script>
      ))}
    </Helmet>
  );
}
