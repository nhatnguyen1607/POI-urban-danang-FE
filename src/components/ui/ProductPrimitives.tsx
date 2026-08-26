import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function ProductButton({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'coral' }) {
  return <button className={`ua-button ua-button--${variant} ${className}`} {...props} />;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'left',
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      {eyebrow && <div className="ua-eyebrow">{eyebrow}</div>}
      <h2 className="ua-section-title mt-3">{title}</h2>
      {description && <p className="ua-lead mt-4">{description}</p>}
    </div>
  );
}

export function FeatureCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <article className="group rounded-[18px] border border-[#dce8f2] bg-white p-6 transition hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(20,57,91,.1)]">
      <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#ddf3ff] text-[#0767c8]">{icon}</div>
      <h3 className="text-lg font-extrabold text-[#0e2038]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#607086]">{children}</p>
    </article>
  );
}

