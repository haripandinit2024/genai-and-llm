import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, api } from "../services/api";
import type { Agent, ConnectionState, HealthInfo, Preset } from "../types";

const HEALTH_POLL_MS = 20_000;

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .agents()
      .then((data) => {
        if (!active) return;
        setAgents(data.agents);
        setCapabilities(data.capabilities);
        setError(null);
      })
      .catch((caught: ApiError) => active && setError(caught.message));
    return () => {
      active = false;
    };
  }, []);

  return { agents, capabilities, error };
}

export function useBackendHealth() {
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [state, setState] = useState<ConnectionState>("checking");
  const timer = useRef<number | null>(null);

  const check = useCallback(async () => {
    try {
      const info = await api.health();
      setHealth(info);
      setState("online");
    } catch {
      setState("offline");
    }
  }, []);

  useEffect(() => {
    void check();
    timer.current = window.setInterval(() => void check(), HEALTH_POLL_MS);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [check]);

  return { health, state, refresh: check };
}

export function usePresets() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .presets()
      .then((data) => {
        if (!active) return;
        setPresets(data.presets);
        setCategories(["All", ...data.categories]);
        setError(null);
      })
      .catch((caught: ApiError) => active && setError(caught.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { presets, categories, loading, error };
}
