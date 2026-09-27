import { Visualizer } from "../components/Visualizer";
import type { VizType } from "../types";

interface VisualizerPageProps {
  vizType: VizType;
  syncToken: number;
}

export function VisualizerPage({ vizType, syncToken }: VisualizerPageProps) {
  return <Visualizer initialType={vizType} syncToken={syncToken} />;
}
