import type { SiteFeaturesData } from "@/lib/storefront";

export interface SiteFeaturesProps {
  content?: SiteFeaturesData;
}

const siteFeaturesScopedStyles = `
  .feature-icon-badge {
    transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .feature-card:hover .feature-icon-badge {
    transform: scale(1.1);
  }
`;

/**
 * SiteFeatures — Value Propositions & Trust Badges Section.
 */
export default function SiteFeatures({ content }: SiteFeaturesProps) {
  const accentColor = content?.accentColor || "#e8c98e";
  const features = content?.features || [
    {
      icon: "M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4",
      title: "Free Returns",
      desc: "Easy 30-day returns. No questions asked.",
    },
    {
      icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
      title: "Secure Checkout",
      desc: "256-bit SSL encryption on every order.",
    },
    {
      icon: "M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z",
      title: "24/7 Support",
      desc: "We're here whenever you need us.",
    },
  ];

  return (
    <section className="bg-zinc-50 border-y border-zinc-100">
      <style dangerouslySetInnerHTML={{ __html: siteFeaturesScopedStyles }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 sm:grid-cols-3 gap-10">
        {features.map((item) => (
          <div
            key={item.title}
            className="feature-card flex flex-col items-center text-center gap-3"
          >
            <div
              className="feature-icon-badge w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
              }}
            >
              <svg
                className="w-5 h-5"
                style={{ color: accentColor }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d={item.icon}
                />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-zinc-900">
              {item.title}
            </h3>
            <p className="text-sm text-zinc-500 leading-relaxed">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
