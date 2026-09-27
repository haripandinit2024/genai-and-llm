import { PresetGallery } from "../components/PresetGallery";
import type { Preset, VizType } from "../types";

interface PresetsPageProps {
  presets: Preset[];
  categories: string[];
  loading: boolean;
  error: string | null;
  onSelectPreset: (prompt: string, viz?: VizType) => void;
}

export function PresetsPage({
  presets,
  categories,
  loading,
  error,
  onSelectPreset,
}: PresetsPageProps) {
  return (
    <PresetGallery
      presets={presets}
      categories={categories}
      loading={loading}
      error={error}
      onSelectPreset={onSelectPreset}
    />
  );
}
