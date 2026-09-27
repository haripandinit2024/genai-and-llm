import { useMemo, useState } from "react";

import type { Preset, VizType } from "../types";
import { VIEW_ICON, actionIcon, alertIcon, chromeIcon } from "../utils/icons";
import { Icon } from "./Icon";

interface PresetGalleryProps {
  presets: Preset[];
  categories: string[];
  loading: boolean;
  error: string | null;
  onSelectPreset: (prompt: string, viz?: VizType) => void;
}

export function PresetGallery({
  presets,
  categories,
  loading,
  error,
  onSelectPreset,
}: PresetGalleryProps) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return presets.filter((preset) => {
      const matchesCategory = category === "All" || preset.category === category;
      const matchesQuery =
        !needle ||
        [preset.title, preset.description, preset.tag, preset.prompt]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [category, presets, query]);

  return (
    <div className="gallery-view">
      <div className="gallery-header">
        <div>
          <h2 className="view-heading">
            <Icon icon={VIEW_ICON.presets} size="xl" tone="accent" /> Preset Algorithm &amp; Feature
            Library
          </h2>
          <p className="view-subheading">
            {presets.length} verified blueprints served by the backend — pick one to load it into the
            chat studio, then run or visualize it.
          </p>
        </div>

        <div className="gallery-controls">
          <div className="search-box">
            <Icon icon={chromeIcon.search} size="base" />
            <input
              value={query}
              placeholder="Search presets…"
              aria-label="Search presets"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="segmented" role="group" aria-label="Filter by category">
            {categories.map((item) => (
              <button
                key={item}
                className={category === item ? "active" : ""}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="inline-alert">
          <Icon icon={alertIcon.error} size="base" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="empty-state row">
          <Icon icon={chromeIcon.loading} size="lg" spin /> Loading presets from the backend…
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="empty-state">No presets match “{query}”.</div>
      )}

      <div className="preset-grid">
        {filtered.map((preset) => (
          <article className="preset-card" key={preset.id}>
            <div className="preset-card-top">
              <span className="preset-tag">{preset.tag}</span>
              <span className="preset-complexity">{preset.complexity}</span>
            </div>
            <h3 className="preset-title">{preset.title}</h3>
            <p className="preset-desc">{preset.description}</p>
            <div className="preset-actions">
              <button
                className="btn-code-action run-btn"
                onClick={() => onSelectPreset(preset.prompt, preset.viz ?? undefined)}
              >
                <Icon icon={actionIcon.openInChat} size="sm" /> Open in chat
              </button>
              {preset.viz && (
                <button
                  className="btn-code-action viz-btn"
                  onClick={() => onSelectPreset(preset.prompt, preset.viz ?? undefined)}
                >
                  <Icon icon={actionIcon.visualize} size="sm" /> Visualize
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
