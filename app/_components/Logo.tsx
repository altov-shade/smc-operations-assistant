export function SMCLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Southern Metro Conference"
    >
      <path
        d="M24 2 L44 8 V26 C44 38.5 35 49 24 54 C13 49 4 38.5 4 26 V8 Z"
        fill="#0B1F3A"
        stroke="#C9A23E"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line
        x1="13"
        y1="20"
        x2="35"
        y2="20"
        stroke="#C9A23E"
        strokeWidth="1.25"
      />
      <text
        x="24"
        y="33"
        textAnchor="middle"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="11"
        fontWeight="700"
        letterSpacing="1.8"
        fill="#F5F1E8"
      >
        SMC
      </text>
      <circle cx="24" cy="42" r="1.25" fill="#C9A23E" />
    </svg>
  );
}

export function SMCWordmark() {
  return (
    <div className="leading-tight">
      <p className="text-[10px] tracking-[0.22em] uppercase text-smc-gold font-semibold">
        Southern Metro Conference
      </p>
      <h1 className="font-serif text-lg sm:text-xl text-smc-ink mt-0.5">
        Operations Assistant
      </h1>
    </div>
  );
}
