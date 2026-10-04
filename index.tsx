import { createFileRoute } from "@tanstack/react-router";
import { Game } from "@/game/Game";
import { GameErrorBoundary } from "@/game/ErrorBoundary";

export const Route = createFileRoute("/")({
  component: () => <GameErrorBoundary><Game /></GameErrorBoundary>,
});
