import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { CalendarCheck, Menu, X } from 'lucide-react';
import ButtonLink from '../components/ui/ButtonLink';

const links = [
  { href: '/#features', label: 'Features' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
        <CalendarCheck size={20} />
      </span>
      <span className="text-lg font-bold text-brand-900">ServiceFlow</span>
    </Link>
  );
}

export default function PublicLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />

          <nav className="hidden items-center gap-6 md:flex">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="text-sm font-medium text-slate-600 hover:text-brand-700">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <ButtonLink to="/login" variant="ghost">
              Log in
            </ButtonLink>
            <ButtonLink to="/register">Get started</ButtonLink>
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {open && (
          <div className="border-t border-slate-200 bg-white px-4 pb-4 md:hidden">
            <nav className="flex flex-col py-2">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="flex gap-2">
              <ButtonLink to="/login" variant="secondary" className="flex-1">
                Log in
              </ButtonLink>
              <ButtonLink to="/register" className="flex-1">
                Get started
              </ButtonLink>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <Logo />
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} ServiceFlow. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm text-slate-500">
            <a href="/#features" className="hover:text-brand-700">Features</a>
            <a href="/#pricing" className="hover:text-brand-700">Pricing</a>
            <a href="/#faq" className="hover:text-brand-700">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}