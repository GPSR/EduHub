"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #070d19; color: #e7edf8; font-family: 'Plus Jakarta Sans', sans-serif; -webkit-font-smoothing: antialiased; }
          main { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
          .box { max-width: 400px; width: 100%; text-align: center; }
          .icon { font-size: 48px; margin-bottom: 20px; }
          h1 { font-size: 20px; font-weight: 700; color: rgba(231,237,248,0.94); }
          p { margin-top: 8px; font-size: 14px; color: rgba(231,237,248,0.6); line-height: 1.6; }
          .btns { margin-top: 28px; display: flex; gap: 12px; justify-content: center; }
          button { padding: 10px 20px; border-radius: 13px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all .15s; border: none; }
          .primary { background: linear-gradient(180deg,#67b4ff,#4f8dfd); color: #fff; }
          .primary:hover { background: linear-gradient(180deg,#7ac0ff,#5a95ff); }
        `}</style>
      </head>
      <body>
        <main>
          <div className="box">
            <div className="icon">💥</div>
            <h1>Unexpected error</h1>
            <p>Something critical failed. Please refresh or try again.</p>
            <div className="btns">
              <button className="primary" onClick={reset}>Reload</button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
