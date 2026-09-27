import { useState } from "react";

import { SEVERITY_ICON, VIEW_ICON, statIcon, transportIcon } from "../utils/icons";
import { Icon } from "./Icon";

type AlgorithmKey = "sort" | "fibonacci" | "search" | "dict";

interface BenchmarkRow {
  size: number;
  medianMs: number;
  minMs: number;
  maxMs: number;
  opsPerSecond: number;
}

const SIZES = [100, 1_000, 5_000, 10_000];
const REPEATS = 5;

const ALGORITHMS: Record<
  AlgorithmKey,
  { label: string; complexity: string; run: (size: number) => void }
> = {
  sort: {
    label: "Array sort (Timsort)",
    complexity: "O(n log n)",
    run: (size) => {
      const data = Array.from({ length: size }, () => Math.random());
      data.sort((a, b) => a - b);
    },
  },
  fibonacci: {
    label: "Fibonacci (iterative)",
    complexity: "O(n)",
    run: (size) => {
      let previous = 0;
      let current = 1;
      for (let index = 0; index < size; index += 1) {
        [previous, current] = [current, previous + current];
      }
    },
  },
  search: {
    label: "Binary search",
    complexity: "O(log n)",
    run: (size) => {
      const data = Array.from({ length: size }, (_, index) => index);
      let low = 0;
      let high = data.length - 1;
      const target = size - 1;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (data[mid] === target) break;
        if (data[mid] < target) low = mid + 1;
        else high = mid - 1;
      }
    },
  },
  dict: {
    label: "Hash map lookup",
    complexity: "O(1)",
    run: (size) => {
      const table = new Map<number, number>();
      for (let index = 0; index < size; index += 1) table.set(index, index);
      let total = 0;
      for (let index = 0; index < size; index += 1) total += table.get(index) ?? 0;
      void total;
    },
  },
};

const REFERENCE = [
  { label: "O(1)", name: "Constant", detail: "Hash lookups, stack push/pop", badge: "o-1" },
  { label: "O(log n)", name: "Logarithmic", detail: "Binary search, balanced BST", badge: "o-logn" },
  { label: "O(n)", name: "Linear", detail: "Single passes, iteration", badge: "o-n" },
  { label: "O(n log n)", name: "Linearithmic", detail: "Comparison sorts", badge: "o-nlogn" },
  { label: "O(n²)", name: "Quadratic", detail: "Nested loops, naive pair scans", badge: "o-n2" },
];

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function measure(algorithm: AlgorithmKey, size: number): BenchmarkRow {
  const runner = ALGORITHMS[algorithm].run;
  runner(size); // warm-up so the JIT can optimise before we sample

  const samples: number[] = [];
  for (let repeat = 0; repeat < REPEATS; repeat += 1) {
    const start = performance.now();
    runner(size);
    samples.push(Math.max(performance.now() - start, 0.001));
  }

  const medianMs = median(samples);
  return {
    size,
    medianMs: Number(medianMs.toFixed(3)),
    minMs: Number(Math.min(...samples).toFixed(3)),
    maxMs: Number(Math.max(...samples).toFixed(3)),
    opsPerSecond: Math.round(1000 / medianMs),
  };
}

export function PerformanceDashboard() {
  const [algorithm, setAlgorithm] = useState<AlgorithmKey>("sort");
  const [rows, setRows] = useState<BenchmarkRow[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastRun, setLastRun] = useState<number | null>(null);

  const runBenchmarks = async () => {
    setRunning(true);
    setRows([]);
    setProgress(0);
    const collected: BenchmarkRow[] = [];

    for (let index = 0; index < SIZES.length; index += 1) {
      collected.push(measure(algorithm, SIZES[index]));
      setRows([...collected]);
      setProgress(Math.round(((index + 1) / SIZES.length) * 100));
      // yield to the event loop so the progress bar can paint
      await new Promise((resolve) => window.setTimeout(resolve, 16));
    }

    setRunning(false);
    setLastRun(Date.now());
  };

  const maxMedian = rows.length ? Math.max(...rows.map((row) => row.medianMs)) : 1;
  const active = ALGORITHMS[algorithm];

  return (
    <div className="dashboard-view">
      <div className="viz-card">
        <div className="viz-header">
          <div>
            <div className="viz-title">
              <Icon icon={VIEW_ICON.performance} size="xxl" tone="accent" />
              <span>Live Empirical Benchmark Engine</span>
            </div>
            <div className="viz-subtitle">
              Median of {REPEATS} runs after a warm-up pass, measured in your browser with
              <code> performance.now()</code>
            </div>
          </div>

          <div className="viz-controls">
            <select
              className="select-control"
              value={algorithm}
              onChange={(event) => setAlgorithm(event.target.value as AlgorithmKey)}
            >
              {(Object.keys(ALGORITHMS) as AlgorithmKey[]).map((key) => (
                <option key={key} value={key}>
                  {ALGORITHMS[key].label} — {ALGORITHMS[key].complexity}
                </option>
              ))}
            </select>
            <button className="btn-viz-control primary" disabled={running} onClick={() => void runBenchmarks()}>
              <Icon icon={transportIcon.run} size="md" /> {running ? `Running ${progress}%` : "Run benchmark"}
            </button>
          </div>
        </div>

        <div className="benchmark-meta">
          <span className="complexity-badge o-nlogn">{active.complexity}</span>
          <span className="viz-stat">
            <Icon icon={statIcon.algorithm} size="sm" /> {active.label}
          </span>
          <span className="viz-stat">
            <Icon icon={statIcon.sizes} size="sm" /> sizes {SIZES.map((size) => size.toLocaleString()).join(", ")}
          </span>
          {lastRun && (
            <span className="viz-stat">
              <Icon icon={statIcon.lastRun} size="sm" /> last run {new Date(lastRun).toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="benchmark-table">
          <div className="benchmark-row head">
            <span>N</span>
            <span>median</span>
            <span>min</span>
            <span>max</span>
            <span>ops/sec</span>
            <span>scale</span>
          </div>
          {rows.length === 0 && (
            <div className="benchmark-empty">
              No measurements yet — pick an algorithm and press <strong>Run benchmark</strong>.
            </div>
          )}
          {rows.map((row) => (
            <div className="benchmark-row" key={row.size}>
              <span className="mono">{row.size.toLocaleString()}</span>
              <span className="mono strong">{row.medianMs} ms</span>
              <span className="mono">{row.minMs} ms</span>
              <span className="mono">{row.maxMs} ms</span>
              <span className="mono">{row.opsPerSecond.toLocaleString()}</span>
              <span className="benchmark-bar-cell">
                <span
                  className="benchmark-bar"
                  style={{ width: `${Math.max((row.medianMs / maxMedian) * 100, 2)}%` }}
                />
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="perf-grid">
        {REFERENCE.map((item) => (
          <div className="perf-card" key={item.label}>
            <div className="perf-card-head">
              <span className="perf-card-title">{item.name}</span>
              <span className={`complexity-badge ${item.badge}`}>{item.label}</span>
            </div>
            <div className="perf-big-value">{item.label}</div>
            <div className="perf-detail">{item.detail}</div>
          </div>
        ))}
      </div>

      <div className="viz-card">
        <div className="viz-title small">
          <Icon icon={SEVERITY_ICON.info} size="lg" tone="accent" />
          <span>How to read these numbers</span>
        </div>
        <ul className="notes-list">
          <li>Each sample is wall-clock time in the browser tab; other tabs and GC pauses add noise.</li>
          <li>
            Doubling N with a linear algorithm roughly doubles the median — quadratic growth shows up
            as a 4× jump.
          </li>
          <li>
            The backend sandbox reports exact execution timings for Python snippets in the
            <strong> Live Output Console</strong>.
          </li>
        </ul>
      </div>
    </div>
  );
}
