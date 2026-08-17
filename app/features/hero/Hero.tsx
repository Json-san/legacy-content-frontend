import { useEffect, useRef } from "react";
import { Link } from "react-router";
import gsap from "gsap";
import { initCityStreet } from "./cityStreet";
import "./hero.css";

export function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const heroChildren = heroRef.current ? Array.from(heroRef.current.children) : [];
    const animatedTargets = [navRef.current, canvas, ...heroChildren];

    // Wipe any inline styles a tween from a previous mount left mid-flight
    // (e.g. navigating away before the entrance animation finished).
    gsap.killTweensOf(animatedTargets);
    gsap.set(animatedTargets, { clearProps: "all" });

    let tl: gsap.core.Timeline | null = null;
    const cleanup = initCityStreet(canvas, () => {
      tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(navRef.current, { y: -22, opacity: 0, duration: 0.8 }, 0);
      tl.from(heroChildren, { y: 24, opacity: 0, duration: 0.9, stagger: 0.09 }, 0.12);
      tl.from(canvas, { opacity: 0, duration: 1.1 }, 0);
    });

    return () => {
      tl?.kill();
      cleanup();
    };
  }, []);

  return (
    <div className="hero-page">
      <canvas id="crowd-canvas" ref={canvasRef} />

      <header className="nav" ref={navRef}>
        <a className="brand" href="#">
          <svg
            className="brand__mark"
            viewBox="0 0 48 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 24 24 12l14 12" />
            <path d="M13 21v15h9V26h4v10h9V21" />
            <path d="M20 26h8" />
            <path d="M29 15v-4h5v7" />
          </svg>
          <span className="brand__text">
            <span className="brand__name">Legacy Content</span>
            <span className="brand__tagline">Real Estate Compliance Engine</span>
          </span>
        </a>

        <div className="nav__actions">
          <Link className="icon-btn" to="/login" aria-label="Sign in">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="8" r="3.9" />
              <path d="M4.8 20c.6-4 3.6-6 7.2-6s6.6 2 7.2 6" />
            </svg>
          </Link>
        </div>
      </header>

      <main className="hero" ref={heroRef}>
        <p className="hero__eyebrow">
          <span>Compliance engine</span>
        </p>
        <h1 className="hero__title">Publish With Proof</h1>
        <p className="hero__lede">
          Drop in your first listing description and see it checked against
          your organization's rules — prohibited phrases, required
          disclosures and formatting — before it ever reaches a client.
        </p>
        <Link className="hero__cta" to="/login">
          <span>Run a compliance check</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h13m-5-5 5 5-5 5" />
          </svg>
        </Link>
      </main>
    </div>
  );
}
