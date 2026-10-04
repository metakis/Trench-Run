import { Component, type ReactNode } from "react";
import { clearSave } from "./Game";

export class GameErrorBoundary extends Component<{ children: ReactNode }, { err: boolean; key: number }> {
  override state = { err: false, key: 0 };
  static getDerivedStateFromError() { return { err: true }; }
  override componentDidCatch(e: unknown) { console.error("Game crashed:", e); }
  override render() {
    if (!this.state.err) return <div key={this.state.key} className="contents">{this.props.children}</div>;
    return (
      <div className="starfield flex h-screen flex-col items-center justify-center gap-4 text-center">
        <h2 className="font-display text-3xl uppercase tracking-widest text-gold">Something went wrong</h2>
        <p className="font-mono text-sm text-muted-foreground">Your game was saved. Resume where you left off, or start over.</p>
        <div className="flex gap-3">
          <button className="saber-btn bg-primary px-6 py-2 font-display uppercase tracking-widest text-primary-foreground"
            onClick={() => this.setState((s) => ({ err: false, key: s.key + 1 }))}>Resume</button>
          <button className="saber-btn bg-secondary px-6 py-2 font-display uppercase tracking-widest text-foreground"
            onClick={() => { clearSave(); this.setState((s) => ({ err: false, key: s.key + 1 })); }}>New game</button>
        </div>
      </div>
    );
  }
}
