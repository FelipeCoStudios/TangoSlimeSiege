import { createFileRoute } from "@tanstack/react-router";
import Game from "@/slime/App";

export const Route = createFileRoute("/")({
  component: Game,
});
