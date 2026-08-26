const FLIGHT_ORBIT =
  'M 86 292 C 112 126 454 72 560 238 C 626 342 480 470 296 454 C 138 440 56 356 86 292';

function Airplane() {
  return (
    <g className="ua-globe-flight__airplane" aria-hidden="true">
      <ellipse cx="0" cy="7" rx="48" ry="14" fill="rgba(14, 32, 56, 0.15)" />
      <path
        d="M-48 0 C-30 -10 16 -12 49 -3 C58 0 58 6 49 9 C13 18 -29 15 -48 5 C-54 2 -54 2 -48 0Z"
        fill="url(#ua-plane-body)"
        stroke="#C9DDE9"
        strokeWidth="1.5"
      />
      <path d="M-4 -7 L15 -35 C18 -39 24 -38 25 -33 L20 -6Z" fill="#0B79AE" />
      <path d="M-2 12 L21 37 C24 41 30 39 29 34 L19 8Z" fill="#087EA4" />
      <path d="M-39 -2 L-48 -21 C-50 -25 -45 -29 -41 -26 L-23 -8Z" fill="#0B79AE" />
      <path d="M-42 7 L-49 18 C-51 22 -47 25 -43 22 L-25 12Z" fill="#0757B5" />
      <path d="M31 -6 C40 -5 47 -3 52 0 C43 2 36 4 28 5Z" fill="#EAF8FF" />
      {[-26, -14, -2, 10].map((x) => (
        <circle key={x} cx={x} cy="1" r="2.4" fill="#0E5D82" stroke="#D9F4FF" strokeWidth="0.7" />
      ))}
      <path d="M-35 8 C-14 14 22 11 43 5" fill="none" stroke="#B5D9E8" strokeWidth="1.2" opacity="0.7" />
    </g>
  );
}

function Tree({ x, y, delay = 0 }: { x: number; y: number; delay?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="ua-globe-flight__landmark" style={{ animationDelay: `${delay}s` }}>
        <path d="M0 9 V25" stroke="#7A6546" strokeWidth="4" strokeLinecap="round" />
        <circle cx="0" cy="2" r="13" fill="#4DAA7A" />
        <circle cx="-7" cy="5" r="7" fill="#63C28D" />
        <circle cx="7" cy="6" r="8" fill="#2F9368" />
      </g>
    </g>
  );
}

function House({ x, y, delay = 0, coral = false }: { x: number; y: number; delay?: number; coral?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="ua-globe-flight__landmark" style={{ animationDelay: `${delay}s` }}>
        <path d="M-18 1 L0 -14 L18 1 V22 H-18Z" fill="#FFF9ED" stroke="#D8CDBA" strokeWidth="1.4" />
        <path d="M-22 2 L0 -18 L22 2 L17 7 L0 -8 L-17 7Z" fill={coral ? '#E76F51' : '#0B79AE'} />
        <rect x="-5" y="9" width="10" height="13" rx="2" fill="#B6DAE6" />
        <rect x="-14" y="7" width="6" height="7" rx="1.5" fill="#D8F1F7" />
        <rect x="8" y="7" width="6" height="7" rx="1.5" fill="#D8F1F7" />
      </g>
    </g>
  );
}

function Cloud({ className, x, y, scale = 1 }: { className: string; x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g className={className}>
        <path
          d="M-42 10 C-42 -2 -32 -12 -19 -12 C-13 -28 11 -31 22 -15 C39 -17 50 -5 49 10 C48 22 37 27 22 27 H-25 C-36 27 -42 21 -42 10Z"
          fill="#FFFFFF"
          opacity="0.86"
        />
        <path d="M-29 25 H26" stroke="#BFE5F2" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      </g>
    </g>
  );
}

export function GlobeFlightAnimation({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <svg
      className={`ua-globe-flight${reducedMotion ? ' is-reduced-motion' : ''}`}
      viewBox="0 0 640 540"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="ua-ocean" cx="34%" cy="26%" r="78%">
          <stop offset="0%" stopColor="#63D9E5" />
          <stop offset="52%" stopColor="#18A8C1" />
          <stop offset="100%" stopColor="#087EA4" />
        </radialGradient>
        <linearGradient id="ua-land" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#DFF3BF" />
          <stop offset="100%" stopColor="#94C982" />
        </linearGradient>
        <linearGradient id="ua-plane-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="72%" stopColor="#F5FBFF" />
          <stop offset="100%" stopColor="#D9ECF5" />
        </linearGradient>
        <radialGradient id="ua-atmosphere">
          <stop offset="65%" stopColor="#D8F8FF" stopOpacity="0" />
          <stop offset="100%" stopColor="#D8F8FF" stopOpacity="0.78" />
        </radialGradient>
        <clipPath id="ua-globe-clip">
          <circle cx="320" cy="292" r="145" />
        </clipPath>
        <filter id="ua-soft-shadow" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="16" stdDeviation="12" floodColor="#0E4964" floodOpacity="0.22" />
        </filter>
        <filter id="ua-plane-shadow" x="-40%" y="-80%" width="180%" height="240%">
          <feDropShadow dx="0" dy="7" stdDeviation="5" floodColor="#0E4964" floodOpacity="0.24" />
        </filter>
      </defs>

      <Cloud className="ua-globe-flight__cloud ua-globe-flight__cloud--back-one" x={102} y={122} scale={0.72} />
      <Cloud className="ua-globe-flight__cloud ua-globe-flight__cloud--back-two" x={510} y={156} scale={0.55} />

      <path
        className="ua-globe-flight__orbit ua-globe-flight__orbit--back"
        d={FLIGHT_ORBIT}
        fill="none"
        pathLength="100"
      />

      <g className="ua-globe-flight__world">
        <ellipse cx="320" cy="452" rx="151" ry="24" fill="#0B5A75" opacity="0.12" />
        <g filter="url(#ua-soft-shadow)">
          <circle cx="320" cy="292" r="145" fill="url(#ua-ocean)" />
          <g clipPath="url(#ua-globe-clip)">
            <g className="ua-globe-flight__landmasses">
              <path
                d="M203 214 C227 176 265 158 293 168 C309 175 308 194 328 198 C353 204 361 226 344 241 C329 254 322 272 303 274 C278 277 269 254 247 251 C222 248 211 238 203 214Z"
                fill="url(#ua-land)"
              />
              <path
                d="M357 176 C392 169 424 183 444 207 C460 228 448 245 426 245 C408 245 403 261 388 269 C367 280 348 264 352 246 C357 224 338 207 344 190Z"
                fill="url(#ua-land)"
              />
              <path
                d="M366 294 C388 280 423 283 441 304 C458 324 444 345 421 350 C402 354 398 376 377 386 C357 395 336 377 340 357 C344 337 339 311 366 294Z"
                fill="url(#ua-land)"
              />
              <path
                d="M229 303 C252 286 279 293 289 315 C300 340 283 361 260 366 C239 370 230 394 207 388 C184 382 181 355 195 339 C206 326 211 315 229 303Z"
                fill="url(#ua-land)"
              />
              <path d="M470 264 C487 259 500 270 494 285 C488 299 466 302 458 288 C451 276 458 267 470 264Z" fill="#A9D68C" />
            </g>
            <ellipse cx="276" cy="240" rx="92" ry="132" fill="#FFFFFF" opacity="0.13" transform="rotate(24 276 240)" />
            <path d="M187 330 C247 390 376 414 449 346" fill="none" stroke="#8AE0EA" strokeWidth="3" opacity="0.32" />
          </g>
          <circle cx="320" cy="292" r="145" fill="url(#ua-atmosphere)" />
          <circle cx="320" cy="292" r="145" fill="none" stroke="#D7F7FB" strokeWidth="4" opacity="0.78" />
          <ellipse cx="279" cy="224" rx="56" ry="90" fill="#FFFFFF" opacity="0.12" transform="rotate(28 279 224)" />
        </g>

        <House x={213} y={386} delay={0.2} />
        <Tree x={261} y={423} delay={1.2} />
        <House x={417} y={381} delay={2.1} coral />
        <Tree x={464} y={332} delay={3.2} />
        <Tree x={184} y={299} delay={4.3} />
      </g>

      <path
        className="ua-globe-flight__orbit ua-globe-flight__orbit--front"
        d="M 90 304 C 146 437 336 493 505 404"
        fill="none"
        pathLength="100"
      />

      <g filter="url(#ua-plane-shadow)">
        {reducedMotion ? (
          <g transform="translate(492 132) rotate(38)">
            <Airplane />
          </g>
        ) : (
          <g>
            <Airplane />
            <animateMotion dur="7.8s" repeatCount="indefinite" rotate="auto" path={FLIGHT_ORBIT} />
            <animate
              attributeName="opacity"
              values="1;0.58;0.72;1;1"
              keyTimes="0;0.18;0.36;0.58;1"
              dur="7.8s"
              repeatCount="indefinite"
            />
          </g>
        )}
      </g>

      <Cloud className="ua-globe-flight__cloud ua-globe-flight__cloud--front-one" x={116} y={414} scale={0.76} />
      <Cloud className="ua-globe-flight__cloud ua-globe-flight__cloud--front-two" x={520} y={410} scale={0.64} />
    </svg>
  );
}
