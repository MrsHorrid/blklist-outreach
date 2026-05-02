export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#08090b] flex items-center justify-center p-4 overflow-hidden">
      {/* Atmospheric gradient layers */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(80, 70, 229, 0.18), transparent 60%), radial-gradient(ellipse 50% 40% at 80% 100%, rgba(139, 92, 246, 0.12), transparent 70%)',
        }}
      />
      {/* Grid overlay */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />
      <div className="relative w-full flex items-center justify-center">{children}</div>
    </div>
  )
}
