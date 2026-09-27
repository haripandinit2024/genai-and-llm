import { useEffect, useMemo, useRef, useState } from "react";

import type { VizType } from "../types";
import {
  VIEW_ICON,
  VIZ_MODE_ICON,
  chromeIcon,
  structureIcon,
  transportIcon,
} from "../utils/icons";
import { Icon } from "./Icon";

type SortAlgorithm = "bubble" | "selection" | "insertion";

const VIZ_MODE_LABEL: Record<VizType, string> = {
  sorting: "Sorting",
  binary_search: "Binary Search",
  linked_list: "Linked List",
  stack_queue: "Stack & Queue",
  tree: "Binary Tree",
};

const VIZ_TYPES = Object.keys(VIZ_MODE_LABEL) as VizType[];

interface VisualizerProps {
  initialType?: VizType;
  /** Changing this token re-applies ``initialType`` (used by the chat "Visualize" button). */
  syncToken?: number;
}

const ALGORITHM_LABELS: Record<SortAlgorithm, { name: string; complexity: string }> = {
  bubble: { name: "Bubble Sort", complexity: "O(n²) time · O(1) space" },
  selection: { name: "Selection Sort", complexity: "O(n²) time · O(1) space" },
  insertion: { name: "Insertion Sort", complexity: "O(n²) time · O(1) space" },
};

const randomArray = (size = 10) =>
  Array.from({ length: size }, () => Math.floor(Math.random() * 80) + 15);

/* ── Binary search tree helpers ───────────────────────────────────────── */

interface TreeNode {
  value: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

interface PositionedNode {
  value: number;
  x: number;
  y: number;
}

interface TreeLayout {
  nodes: PositionedNode[];
  edges: { from: PositionedNode; to: PositionedNode }[];
  width: number;
  height: number;
}

function insertNode(root: TreeNode | null, value: number): TreeNode {
  if (!root) return { value, left: null, right: null };
  if (value < root.value) root.left = insertNode(root.left, value);
  else if (value > root.value) root.right = insertNode(root.right, value);
  return root;
}

function buildTree(values: number[]): TreeNode | null {
  return values.reduce<TreeNode | null>((root, value) => insertNode(root, value), null);
}

const NODE_RADIUS = 22;
const X_GAP = 62;
const Y_GAP = 74;

function layoutTree(root: TreeNode | null): TreeLayout {
  const nodes: PositionedNode[] = [];
  const edges: { from: PositionedNode; to: PositionedNode }[] = [];
  let column = 0;
  let maxDepth = 0;

  const walk = (node: TreeNode | null, depth: number): PositionedNode | null => {
    if (!node) return null;
    const left = walk(node.left, depth + 1);
    const positioned: PositionedNode = {
      value: node.value,
      x: column * X_GAP + NODE_RADIUS + 8,
      y: depth * Y_GAP + NODE_RADIUS + 8,
    };
    column += 1;
    maxDepth = Math.max(maxDepth, depth);
    nodes.push(positioned);
    if (left) edges.push({ from: positioned, to: left });
    const right = walk(node.right, depth + 1);
    if (right) edges.push({ from: positioned, to: right });
    return positioned;
  };

  walk(root, 0);
  return {
    nodes,
    edges,
    width: Math.max(column * X_GAP + 20, 240),
    height: (maxDepth + 1) * Y_GAP + 20,
  };
}

/* ── Component ────────────────────────────────────────────────────────── */

export function Visualizer({ initialType = "sorting", syncToken = 0 }: VisualizerProps) {
  const [vizType, setVizType] = useState<VizType>(initialType);
  const [speed, setSpeed] = useState(240);
  const [stepText, setStepText] = useState("Press Start to run the animation frame by frame.");
  const [running, setRunning] = useState(false);
  const runToken = useRef(0);

  // Sorting
  const [sortAlgo, setSortAlgo] = useState<SortAlgorithm>("bubble");
  const [array, setArray] = useState<number[]>(randomArray());
  const [activeIndices, setActiveIndices] = useState<number[]>([]);
  const [compareIndices, setCompareIndices] = useState<number[]>([]);
  const [sortedIndices, setSortedIndices] = useState<number[]>([]);
  const [stats, setStats] = useState({ comparisons: 0, swaps: 0 });

  // Binary search
  const [searchTarget, setSearchTarget] = useState(34);
  const [searchPointers, setSearchPointers] = useState<{ low: number; mid: number; high: number } | null>(null);
  const [foundIndex, setFoundIndex] = useState<number | null>(null);

  // Linked list
  const [listNodes, setListNodes] = useState<number[]>([12, 28, 45, 67, 89]);
  const [activeNode, setActiveNode] = useState<number | null>(null);
  const [nodeInput, setNodeInput] = useState("");

  // Stack & queue (independent structures)
  const [stackItems, setStackItems] = useState<string[]>(["Node Alpha", "Node Beta", "Node Gamma"]);
  const [queueItems, setQueueItems] = useState<string[]>(["Job 1", "Job 2", "Job 3"]);
  const [itemInput, setItemInput] = useState("");

  // Tree
  const [treeValues, setTreeValues] = useState<number[]>([50, 30, 70, 20, 40, 60, 80]);
  const [treeInput, setTreeInput] = useState("");

  useEffect(() => {
    setVizType(initialType);
  }, [initialType, syncToken]);

  useEffect(() => () => void (runToken.current += 1), []);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const isCurrentRun = (token: number) => runToken.current === token;

  const stop = () => {
    runToken.current += 1;
    setRunning(false);
    setActiveIndices([]);
    setCompareIndices([]);
    setStepText("Animation stopped.");
  };

  /* ── Sorting ── */

  const runSorting = async () => {
    const token = runToken.current + 1;
    runToken.current = token;
    setRunning(true);
    setStats({ comparisons: 0, swaps: 0 });
    setSortedIndices([]);

    const data = [...array];
    const n = data.length;
    let comparisons = 0;
    let swaps = 0;
    const settled: number[] = [];

    const publish = () => setStats({ comparisons, swaps });

    if (sortAlgo === "bubble") {
      for (let i = 0; i < n - 1 && isCurrentRun(token); i += 1) {
        let swapped = false;
        for (let j = 0; j < n - i - 1 && isCurrentRun(token); j += 1) {
          setCompareIndices([j, j + 1]);
          comparisons += 1;
          setStepText(`Comparing index ${j} (${data[j]}) with ${j + 1} (${data[j + 1]}).`);
          publish();
          await sleep(speed);
          if (!isCurrentRun(token)) return;

          if (data[j] > data[j + 1]) {
            [data[j], data[j + 1]] = [data[j + 1], data[j]];
            swaps += 1;
            setActiveIndices([j, j + 1]);
            setArray([...data]);
            setStepText(`Swapping ${data[j + 1]} and ${data[j]}.`);
            publish();
            await sleep(speed);
            swapped = true;
          }
        }
        settled.push(n - i - 1);
        setSortedIndices([...settled]);
        if (!swapped) break;
      }
      if (isCurrentRun(token)) setSortedIndices(data.map((_, index) => index));
    } else if (sortAlgo === "selection") {
      for (let i = 0; i < n - 1 && isCurrentRun(token); i += 1) {
        let minIndex = i;
        for (let j = i + 1; j < n && isCurrentRun(token); j += 1) {
          setCompareIndices([minIndex, j]);
          comparisons += 1;
          setStepText(`Minimum so far: ${data[minIndex]} — checking ${data[j]}.`);
          publish();
          await sleep(speed);
          if (data[j] < data[minIndex]) minIndex = j;
        }
        if (minIndex !== i) {
          [data[i], data[minIndex]] = [data[minIndex], data[i]];
          swaps += 1;
          setActiveIndices([i, minIndex]);
          setArray([...data]);
          publish();
          await sleep(speed);
        }
        settled.push(i);
        setSortedIndices([...settled]);
      }
      if (isCurrentRun(token)) setSortedIndices(data.map((_, index) => index));
    } else {
      for (let i = 1; i < n && isCurrentRun(token); i += 1) {
        const key = data[i];
        let j = i - 1;
        setCompareIndices([i]);
        setStepText(`Inserting ${key} into the sorted prefix.`);
        await sleep(speed);

        while (j >= 0 && data[j] > key && isCurrentRun(token)) {
          comparisons += 1;
          data[j + 1] = data[j];
          swaps += 1;
          setActiveIndices([j, j + 1]);
          setArray([...data]);
          publish();
          await sleep(speed);
          j -= 1;
        }
        data[j + 1] = key;
        setArray([...data]);
        setSortedIndices(data.slice(0, i + 1).map((_, index) => index));
      }
    }

    if (!isCurrentRun(token)) return;
    setActiveIndices([]);
    setCompareIndices([]);
    setSortedIndices(data.map((_, index) => index));
    setArray([...data]);
    setRunning(false);
    setStepText(
      `${ALGORITHM_LABELS[sortAlgo].name} finished: ${comparisons} comparisons, ${swaps} moves.`,
    );
  };

  /* ── Binary search ── */

  const runBinarySearch = async () => {
    const token = runToken.current + 1;
    runToken.current = token;
    setRunning(true);
    setFoundIndex(null);

    const data = [...array].sort((a, b) => a - b);
    setArray(data);
    let low = 0;
    let high = data.length - 1;

    while (low <= high && isCurrentRun(token)) {
      const mid = Math.floor((low + high) / 2);
      setSearchPointers({ low, mid, high });
      setCompareIndices([mid]);
      setStepText(`mid=${mid} → ${data[mid]} vs target ${searchTarget}`);
      await sleep(speed);
      if (!isCurrentRun(token)) return;

      if (data[mid] === searchTarget) {
        setFoundIndex(mid);
        setSortedIndices([mid]);
        setStepText(`Found ${searchTarget} at index ${mid} after ${Math.floor(Math.log2(mid + 1)) + 1} probes.`);
        setRunning(false);
        return;
      }
      if (data[mid] < searchTarget) {
        low = mid + 1;
        setStepText(`${data[mid]} < ${searchTarget} → search the right half.`);
      } else {
        high = mid - 1;
        setStepText(`${data[mid]} > ${searchTarget} → search the left half.`);
      }
    }

    if (!isCurrentRun(token)) return;
    setSearchPointers(null);
    setSortedIndices([]);
    setCompareIndices([]);
    setRunning(false);
    setStepText(`${searchTarget} is not present in this dataset (O(log n) probes).`);
  };

  /* ── Linked list ── */

  const addNode = (position: "append" | "prepend") => {
    const value = Number(nodeInput);
    if (!Number.isFinite(value) || nodeInput.trim() === "") return;
    setListNodes((previous) => (position === "append" ? [...previous, value] : [value, ...previous]));
    setActiveNode(position === "append" ? listNodes.length : 0);
    setNodeInput("");
    setStepText(`${position === "append" ? "Appended" : "Prepended"} node ${value}.`);
    window.setTimeout(() => setActiveNode(null), 900);
  };

  const removeNode = (index: number) => {
    setStepText(`Unlinked node at index ${index} (${listNodes[index]}).`);
    setListNodes((previous) => previous.filter((_, position) => position !== index));
  };

  const reverseList = () => {
    setListNodes((previous) => [...previous].reverse());
    setStepText("Reversed every pointer: head becomes tail (O(n) time, O(1) space).");
  };

  /* ── Stack & queue ── */

  const pushStack = () => {
    const value = itemInput.trim();
    if (!value) return;
    setStackItems((previous) => [...previous, value]);
    setItemInput("");
    setStepText(`push("${value}") → top of stack.`);
  };

  const popStack = () => {
    setStackItems((previous) => {
      if (!previous.length) return previous;
      setStepText(`pop() → "${previous[previous.length - 1]}" removed from the top.`);
      return previous.slice(0, -1);
    });
  };

  const enqueue = () => {
    const value = itemInput.trim();
    if (!value) return;
    setQueueItems((previous) => [...previous, value]);
    setItemInput("");
    setStepText(`enqueue("${value}") → rear of the queue.`);
  };

  const dequeue = () => {
    setQueueItems((previous) => {
      if (!previous.length) return previous;
      setStepText(`dequeue() → "${previous[0]}" left from the front.`);
      return previous.slice(1);
    });
  };

  /* ── Tree ── */

  const treeRoot = useMemo(() => buildTree(treeValues), [treeValues]);
  const layout = useMemo(() => layoutTree(treeRoot), [treeRoot]);

  const inorder = useMemo(() => {
    const values: number[] = [];
    const walk = (node: TreeNode | null) => {
      if (!node) return;
      walk(node.left);
      values.push(node.value);
      walk(node.right);
    };
    walk(treeRoot);
    return values;
  }, [treeRoot]);

  const addTreeNode = () => {
    const value = Number(treeInput);
    if (!Number.isFinite(value) || treeInput.trim() === "") return;
    setTreeValues((previous) => [...previous, value]);
    setTreeInput("");
    setStepText(`insert(${value}) → descended left/right and linked a new leaf.`);
  };

  const depth = useMemo(() => {
    const walk = (node: TreeNode | null): number => (node ? 1 + Math.max(walk(node.left), walk(node.right)) : 0);
    return walk(treeRoot);
  }, [treeRoot]);

  const bannerStyle = {
    padding: "12px 18px",
    background: "rgba(99, 102, 241, 0.1)",
    border: "1px solid rgba(99, 102, 241, 0.3)",
    borderRadius: "10px",
    fontSize: "13px",
    color: "#e0e7ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap" as const,
  };

  return (
    <div className="visualizer-view">
      <div className="viz-card">
        <div className="viz-header">
          <div>
            <div className="viz-title">
              <Icon icon={VIEW_ICON.visualizer} size="xxl" tone="accent" />
              <span>Algorithm &amp; Data Structure Visualizer</span>
            </div>
            <div className="viz-subtitle">
              Step-by-step execution model with live state inspection
            </div>
          </div>
          <div className="viz-controls">
            {VIZ_TYPES.map((key) => (
              <button
                key={key}
                className={`btn-viz-control${vizType === key ? " primary" : ""}`}
                aria-pressed={vizType === key}
                onClick={() => {
                  stop();
                  setVizType(key);
                  setStepText(`Switched to ${VIZ_MODE_LABEL[key]}. Press Start to animate.`);
                }}
              >
                <Icon
                  icon={VIZ_MODE_ICON[key]}
                  size="base"
                  glow={vizType === key}
                />{" "}
                {VIZ_MODE_LABEL[key]}
              </button>
            ))}
          </div>
        </div>

        <div style={bannerStyle}>
          <div>
            <strong>Execution step:</strong> {stepText}
          </div>
          <div className="viz-speed">
            <Icon icon={chromeIcon.speed} size="base" tone="muted" />
            <label htmlFor="viz-speed">Speed</label>
            <input
              id="viz-speed"
              type="range"
              min={40}
              max={600}
              step={20}
              value={speed}
              onChange={(event) => setSpeed(Number(event.target.value))}
            />
          </div>
        </div>

        {/* ── Sorting ── */}
        {vizType === "sorting" && (
          <div className="viz-section">
            <div className="viz-toolbar">
              <select
                className="select-control"
                value={sortAlgo}
                onChange={(event) => setSortAlgo(event.target.value as SortAlgorithm)}
              >
                <option value="bubble">Bubble Sort O(n²)</option>
                <option value="selection">Selection Sort O(n²)</option>
                <option value="insertion">Insertion Sort O(n²)</option>
              </select>
              <span className="complexity-badge o-n2">
                {ALGORITHM_LABELS[sortAlgo].complexity}
              </span>
              <button className="btn-viz-control primary" disabled={running} onClick={() => void runSorting()}>
                <Icon icon={transportIcon.run} size="md" /> Start {ALGORITHM_LABELS[sortAlgo].name}
              </button>
              <button className="btn-viz-control" disabled={running} onClick={() => {
                setArray(randomArray());
                setSortedIndices([]);
                setActiveIndices([]);
                setCompareIndices([]);
                setStats({ comparisons: 0, swaps: 0 });
                setStepText("Generated a fresh dataset.");
              }}>
                <Icon icon={transportIcon.shuffle} size="md" /> Shuffle
              </button>
              <button className="btn-viz-control" disabled={!running} onClick={stop}>
                <Icon icon={transportIcon.stop} size="md" /> Stop
              </button>
              <span className="viz-stat">comparisons: {stats.comparisons}</span>
              <span className="viz-stat">moves: {stats.swaps}</span>
            </div>

            <div className="array-container">
              {array.map((value, index) => {
                const classes = activeIndices.includes(index)
                  ? "active"
                  : compareIndices.includes(index)
                    ? "compare"
                    : sortedIndices.includes(index)
                      ? "sorted"
                      : "";
                return (
                  <div className="array-bar-wrapper" key={index}>
                    <div className={`array-bar ${classes}`} style={{ height: `${value * 2.4}px` }} />
                    <span className="bar-val">{value}</span>
                  </div>
                );
              })}
            </div>
            <div className="viz-legend">
              <span className="legend-item"><i className="legend-swatch compare" /> comparison</span>
              <span className="legend-item"><i className="legend-swatch active" /> swap / active</span>
              <span className="legend-item"><i className="legend-swatch sorted" /> final position</span>
            </div>
          </div>
        )}

        {/* ── Binary search ── */}
        {vizType === "binary_search" && (
          <div className="viz-section">
            <div className="viz-toolbar">
              <label className="viz-label" htmlFor="search-target">Target</label>
              <input
                id="search-target"
                className="input-control"
                type="number"
                value={searchTarget}
                onChange={(event) => setSearchTarget(Number(event.target.value))}
              />
              <span className="complexity-badge o-logn">O(log n) time · O(1) space</span>
              <button className="btn-viz-control primary" disabled={running} onClick={() => void runBinarySearch()}>
                <Icon icon={transportIcon.probe} size="md" /> Search
              </button>
              <button className="btn-viz-control" disabled={running} onClick={() => {
                setArray(Array.from({ length: 9 }, () => Math.floor(Math.random() * 90) + 10).sort((a, b) => a - b));
                setSearchPointers(null);
                setFoundIndex(null);
                setSortedIndices([]);
                setStepText("Generated a new sorted dataset.");
              }}>
                <Icon icon={transportIcon.shuffle} size="md" /> New dataset
              </button>
              <button className="btn-viz-control" disabled={!running} onClick={stop}>
                <Icon icon={transportIcon.stop} size="md" /> Stop
              </button>
            </div>

            <div className="array-container">
              {array.map((value, index) => {
                const isMid = searchPointers?.mid === index;
                const isLow = searchPointers?.low === index;
                const isHigh = searchPointers?.high === index;
                const classes = foundIndex === index
                  ? "sorted"
                  : isMid
                    ? "compare"
                    : isLow || isHigh
                      ? "active"
                      : "";
                const pointer = foundIndex === index ? "FOUND" : isMid ? "MID" : isLow ? "LOW" : isHigh ? "HIGH" : "";
                return (
                  <div className="array-bar-wrapper" key={index}>
                    <div className={`array-bar ${classes}`} style={{ height: `${value * 2.2}px` }} />
                    <span className="bar-val">{value}</span>
                    <span className="bar-pointer">{pointer || `[${index}]`}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Linked list ── */}
        {vizType === "linked_list" && (
          <div className="viz-section">
            <div className="viz-toolbar">
              <input
                className="input-control"
                type="number"
                placeholder="Node value"
                value={nodeInput}
                onChange={(event) => setNodeInput(event.target.value)}
              />
              <span className="complexity-badge o-n">prepend O(1) · append O(n)</span>
              <button className="btn-viz-control primary" onClick={() => addNode("append")}>
                <Icon icon={structureIcon.appendTail} size="md" /> Append tail
              </button>
              <button className="btn-viz-control" onClick={() => addNode("prepend")}>
                <Icon icon={structureIcon.prependHead} size="md" /> Prepend head
              </button>
              <button className="btn-viz-control" onClick={reverseList}>
                <Icon icon={structureIcon.reverse} size="md" /> Reverse
              </button>
            </div>

            <div className="nodes-container">
              <span className="list-head">
                <Icon icon={structureIcon.listHead} size="sm" /> HEAD
              </span>
              {listNodes.length === 0 && <span className="empty-state">List is empty — append a node.</span>}
              {listNodes.map((value, index) => (
                <span className="list-node-group" key={`${value}-${index}`}>
                  <button
                    className={`viz-node${activeNode === index ? " active" : ""}`}
                    onClick={() => removeNode(index)}
                    title="Click to unlink this node"
                  >
                    {value}
                  </button>
                  <span className="arrow-connector">
                    <Icon
                      icon={index < listNodes.length - 1 ? structureIcon.listNext : structureIcon.listNull}
                      size="lg"
                      tone={index < listNodes.length - 1 ? "accent-glow" : "subtle"}
                      label={index < listNodes.length - 1 ? undefined : "null terminator"}
                    />
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Stack & queue ── */}
        {vizType === "stack_queue" && (
          <div className="viz-section">
            <div className="viz-toolbar">
              <input
                className="input-control"
                type="text"
                placeholder="Item label"
                value={itemInput}
                onChange={(event) => setItemInput(event.target.value)}
              />
              <button className="btn-viz-control primary" onClick={pushStack}>
                <Icon icon={structureIcon.push} size="md" /> Stack push
              </button>
              <button className="btn-viz-control" onClick={popStack}>
                <Icon icon={structureIcon.pop} size="md" /> Stack pop
              </button>
              <button className="btn-viz-control primary" onClick={enqueue}>
                <Icon icon={structureIcon.enqueue} size="md" /> Queue enqueue
              </button>
              <button className="btn-viz-control" onClick={dequeue}>
                <Icon icon={structureIcon.dequeue} size="md" /> Queue dequeue
              </button>
            </div>

            <div className="structure-grid">
              <div className="structure-panel">
                <header>
                  <span className="structure-title">
                    <Icon icon={VIZ_MODE_ICON.stack_queue} size="sm" /> Stack (LIFO)
                  </span>
                  <span className="complexity-badge o-1">push/pop O(1)</span>
                </header>
                <div className="structure-body column">
                  {stackItems.length === 0 && <span className="empty-state">Empty stack</span>}
                  {[...stackItems].reverse().map((item, index) => (
                    <div className={`stack-item${index === 0 ? " top" : ""}`} key={`${item}-${index}`}>
                      {index === 0 && <span className="stack-tag">top</span>}
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="structure-panel">
                <header>
                  <span className="structure-title">
                    <Icon icon={structureIcon.enqueue} size="sm" /> Queue (FIFO)
                  </span>
                  <span className="complexity-badge o-1">deque O(1)</span>
                </header>
                <div className="structure-body row">
                  {queueItems.length === 0 && <span className="empty-state">Empty queue</span>}
                  {queueItems.map((item, index) => (
                    <div className={`queue-item${index === 0 ? " front" : ""}`} key={`${item}-${index}`}>
                      {index === 0 && <span className="stack-tag">front</span>}
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Binary search tree ── */}
        {vizType === "tree" && (
          <div className="viz-section">
            <div className="viz-toolbar">
              <input
                className="input-control"
                type="number"
                placeholder="Value to insert"
                value={treeInput}
                onChange={(event) => setTreeInput(event.target.value)}
              />
              <span className="complexity-badge o-logn">search O(log n) balanced</span>
              <button className="btn-viz-control primary" onClick={addTreeNode}>
                <Icon icon={structureIcon.insert} size="md" /> Insert node
              </button>
              <button
                className="btn-viz-control"
                onClick={() => {
                  setTreeValues([50, 30, 70, 20, 40, 60, 80]);
                  setStepText("Reset to a balanced demo tree.");
                }}
              >
                <Icon icon={structureIcon.reset} size="md" /> Reset tree
              </button>
              <span className="viz-stat">height: {depth}</span>
              <span className="viz-stat">nodes: {treeValues.length}</span>
            </div>

            <div className="tree-canvas">
              <svg
                viewBox={`0 0 ${layout.width} ${layout.height}`}
                width="100%"
                height={Math.min(layout.height, 340)}
                role="img"
                aria-label="Binary search tree"
              >
                {layout.edges.map((edge, index) => (
                  <line
                    key={index}
                    x1={edge.from.x}
                    y1={edge.from.y}
                    x2={edge.to.x}
                    y2={edge.to.y}
                    stroke="rgba(99, 102, 241, 0.55)"
                    strokeWidth={2}
                  />
                ))}
                {layout.nodes.map((node) => (
                  <g key={`${node.value}-${node.x}`}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={NODE_RADIUS}
                      fill="rgba(99, 102, 241, 0.22)"
                      stroke="var(--accent)"
                      strokeWidth={2}
                    />
                    <text
                      x={node.x}
                      y={node.y + 5}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontFamily="var(--font-mono)"
                      fontSize={14}
                      fontWeight={700}
                    >
                      {node.value}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            <div className="tree-footer">
              <span>
                <strong>In-order traversal:</strong> {inorder.join(" → ") || "—"}
              </span>
              <span className="tree-hint">
                Left child &lt; parent &lt; right child. In-order output is always sorted.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
