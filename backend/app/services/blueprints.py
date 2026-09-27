"""Deterministic markdown generators for the architect and visualizer agents."""

from __future__ import annotations

import re

from app.services import code_templates

# ── Visualizer plans ────────────────────────────────────────────────────

_ALGORITHM_STEPS: dict[str, list[str]] = {
    "sorting": [
        "Start with the unsorted array and set `i = 0` (the first pass).",
        "Compare the adjacent pair `arr[j]` and `arr[j + 1]`.",
        "Swap the pair when `arr[j] > arr[j + 1]`, otherwise keep scanning.",
        "After each pass the largest remaining value is parked at the end (green bars).",
        "Repeat until a pass performs no swap — the array is sorted.",
    ],
    "binary_search": [
        "Sort the array and set `low = 0`, `high = n - 1`.",
        "Compute `mid = (low + high) // 2` and compare `arr[mid]` with the target.",
        "Equal? Return the index and stop.",
        "Smaller than the target? Move `low = mid + 1` (discard the left half).",
        "Greater than the target? Move `high = mid - 1`. Repeat until `low > high`.",
    ],
    "linked_list": [
        "Create a node holding the value and a `next` pointer.",
        "Append: walk to the tail and link the new node (O(n)).",
        "Prepend: point the new node at the old head and update `head` (O(1)).",
        "Delete: re-link the previous node to `current.next`.",
        "Reverse: walk once carrying `previous`, `current`, `next` — O(n) time, O(1) space.",
    ],
    "stack_queue": [
        "A stack is LIFO: `push` and `pop` both touch the tail of the list.",
        "A queue is FIFO: `enqueue` appends at the tail, `dequeue` pops from the front.",
        "Use `collections.deque` for the queue so `popleft()` stays O(1).",
        "Watch the `size` counter — empty pops should return `None`, not raise.",
    ],
    "tree": [
        "Compare the value with the current node and descend left (<) or right (>).",
        "Insert the new leaf when the child slot is empty.",
        "Search follows the same comparison path — O(log n) when balanced.",
        "In-order traversal (left, node, right) visits values in ascending order.",
        "Height = 1 + max(left height, right height); a skewed insert order degrades it to O(n).",
    ],
    "graph": [
        "Build an adjacency list from the edge pairs.",
        "BFS uses a queue and a visited set — explores level by level.",
        "DFS uses recursion or an explicit stack — explores depth first.",
        "Every vertex and edge is visited once: O(V + E) time, O(V) space.",
    ],
    "prime": [
        "Reject `n <= 1` immediately, then test divisors up to `sqrt(n)`.",
        "Check 2 and 3, then step through 6k ± 1 candidates — O(sqrt(n)) time.",
        "For ranges, the Sieve of Eratosthenes marks multiples: O(n log log n).",
    ],
}

_ALGORITHM_TEMPLATES = {
    "sorting": "sorting",
    "binary_search": "binary_search",
    "linked_list": "linked_list",
    "stack_queue": "stack_queue",
    "tree": "tree",
    "graph": "graph",
    "prime": "prime",
    "fibonacci": "fibonacci",
}

_ALGORITHM_LABELS = {
    "sorting": "Bubble / Quick / Merge Sort",
    "binary_search": "Binary Search",
    "linked_list": "Singly Linked List",
    "stack_queue": "Stack & Queue",
    "tree": "Binary Search Tree",
    "graph": "Graph BFS / DFS",
    "prime": "Prime Numbers",
    "fibonacci": "Fibonacci Sequence",
}

_VIEW_NAMES = {
    "sorting": "Sorting",
    "binary_search": "Binary Search",
    "linked_list": "Linked List",
    "stack_queue": "Stack & Queue",
    "tree": "Binary Tree",
    "graph": "Graph",
    "prime": "Prime",
    "fibonacci": "Sorting",
}


def detect_algorithm(text: str) -> str:
    lowered = text.lower()
    checks = (
        ("binary_search", ("binary search", "bsearch", "bisect")),
        ("linked_list", ("linked list", "linkedlist", "node")),
        ("stack_queue", ("stack", "queue", "lifo", "fifo")),
        ("tree", ("tree", "bst")),
        ("graph", ("graph", "bfs", "dfs", "traversal")),
        ("prime", ("prime", "sieve")),
        ("fibonacci", ("fibonacci", "fib")),
        ("sorting", ("sort", "bubble", "quick", "merge")),
    )
    for algorithm, keywords in checks:
        if any(keyword in lowered for keyword in keywords):
            return algorithm
    return "sorting"


def visualization_plan(text: str) -> str:
    """Markdown explanation plus a runnable snippet for the visualizer agent."""

    algorithm = detect_algorithm(text)
    label = _ALGORITHM_LABELS[algorithm]
    steps = _ALGORITHM_STEPS.get(algorithm, _ALGORITHM_STEPS["sorting"])
    template_key = _ALGORITHM_TEMPLATES.get(algorithm, "sorting")
    code, _ = code_templates.template_code(template_key, "python")

    lines = [
        f"Here is the step-by-step animation model for **{label}**.",
        "",
        "**Animation script**",
    ]
    lines.extend(f"{index}. {step}" for index, step in enumerate(steps, start=1))
    lines += [
        "",
        f"Open **Visualizer Studio → {_VIEW_NAMES.get(algorithm, 'Sorting')}** to replay these "
        "steps frame by frame, then press **Run Code** below for the reference implementation:",
        "",
        f"```python\n{code}\n```",
        "",
        "Each frame highlights: **red** = active comparison, **amber** = swap, **green** = final position.",
    ]
    return "\n".join(lines)


# ── Architecture blueprints ─────────────────────────────────────────────

_DOMAIN_HINTS: tuple[tuple[tuple[str, ...], str, list[str]], ...] = (
    (
        ("payment", "checkout", "billing"),
        "Payments Platform",
        ["Identity", "Payments API", "Ledger", "Fraud Scoring", "Webhook Fan-out"],
    ),
    (
        ("chat", "realtime", "messaging", "websocket"),
        "Realtime Messaging Platform",
        ["Gateway", "Presence", "Message Fan-out", "History Store", "Media Service"],
    ),
    (
        ("ecommerce", "shop", "cart", "catalog"),
        "Commerce Platform",
        ["Storefront BFF", "Catalog", "Cart", "Orders", "Inventory"],
    ),
    (
        ("analytics", "etl", "pipeline", "data"),
        "Analytics Pipeline",
        ["Ingest API", "Stream Buffer", "Transform Workers", "Warehouse", "BI Query Layer"],
    ),
)

_DEFAULT_SERVICES = [
    "Auth Service",
    "Core Domain Service",
    "Background Workers",
    "Read Model / Cache",
]


def _blueprint_subject(text: str) -> tuple[str, list[str]]:
    lowered = text.lower()
    for keywords, subject, services in _DOMAIN_HINTS:
        if any(keyword in lowered for keyword in keywords):
            return subject, services
    cleaned = re.sub(r"^(design|architect|build|create|plan)\s+", "", text.strip(), flags=re.I)
    cleaned = re.sub(r"[^a-zA-Z0-9 \-]", "", cleaned).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    if len(cleaned) > 3:
        subject = cleaned[0].upper() + cleaned[1:]
    else:
        subject = "Modular Service Platform"
    return subject, _DEFAULT_SERVICES


def _flow_diagram(stages: list[tuple[str, list[str]]]) -> str:
    """Render an aligned ASCII request-flow diagram.

    ``stages`` is a list of ``(stage_label, nodes)`` pairs; every node of a
    stage is rendered on its own padded line so the output stays aligned in any
    monospace font.
    """

    rendered: list[list[str]] = []
    width = 0
    for label, nodes in stages:
        if label is None:
            block = ["  ".join(f"[ {node} ]" for node in nodes)]
        elif nodes:
            block = [f"[ {label} ]"] + [f"    - {node}" for node in nodes]
        else:
            block = [f"[ {label} ]"]
        width = max([width, *(len(line) for line in block)])
        rendered.append(block)

    centre = width // 2
    lines: list[str] = []
    for index, block in enumerate(rendered):
        if index:
            lines.append(" " * centre + "|")
            lines.append(" " * centre + "v")
        lines.extend(line.ljust(width) for line in block)
    return "\n".join(line.rstrip() for line in lines)


def architecture_blueprint(text: str) -> str:
    """Markdown architecture blueprint with diagram, contracts and budget."""

    subject, services = _blueprint_subject(text)
    diagram = _flow_diagram(
        [
            (None, ["Client / Web App"]),
            ("API Gateway - TLS, auth, rate limiting, routing", []),
            (None, services),
            ("Message Broker -> Background Workers", []),
            ("Data Store + Cache (primary, replica, Redis)", []),
        ]
    )

    endpoints = [
        ("POST", "/v1/%s" % _slug(subject), "Create a resource", "201 + Location header"),
        ("GET", "/v1/%s/{id}" % _slug(subject), "Read one resource (cacheable)", "200 / 404"),
        ("GET", "/v1/%s?limit=50&cursor=..." % _slug(subject), "Cursor-paginated list", "200"),
        ("PATCH", "/v1/%s/{id}" % _slug(subject), "Partial update (idempotent)", "200"),
        ("POST", "/v1/webhooks", "Register an event subscriber", "202"),
    ]

    lines: list[str] = [
        f"**{subject}** — reference architecture for a system that must scale horizontally.",
        "",
        "**Component diagram**",
        f"```text\n{diagram}\n```",
        "",
        "**Services and responsibilities**",
    ]
    lines.extend(
        f"- **{name}** — owns its own schema, deploys independently, and exposes only a versioned HTTP contract."
        for name in services
    )
    lines += [
        "",
        "**REST contract**",
        "- `POST` create operations accept an `Idempotency-Key` header so retries are safe.",
    ]
    lines.extend(f"- **{method} {path}** — {purpose} → `{result}`" for method, path, purpose, result in endpoints)
    lines += [
        "",
        "**Request envelope**",
        "```json\n"
        '{\n'
        '  "request_id": "req_8f2c",\n'
        '  "actor": { "id": "usr_42", "scopes": ["write"] },\n'
        '  "payload": { "name": "example", "amount_cents": 1999 }\n'
        "}\n```",
        "",
        "**Scaling & resilience**",
        "- Gateway holds no session state; scale it horizontally behind a load balancer.",
        "- Each service owns its datastore: primary + read replica, with a Redis cache for hot reads.",
        "- Publish domain events to a broker and let workers consume them at-least-once with idempotent handlers.",
        "- Add circuit breakers and a bulkhead per dependency so one slow service cannot exhaust the pool.",
        "- Emit structured logs with a shared `request_id`, plus RED metrics (Rate, Errors, Duration) per route.",
        "",
        "**Performance budget**",
        "- p50 read latency ≤ 40 ms (cache hit ≤ 5 ms), p99 ≤ 250 ms.",
        "- Gateway overhead target ≤ 2 ms per hop; keep payloads under 100 KB.",
        "- Rate limits: 100 rps per API key burst, 20 rps sustained, 429 with `Retry-After`.",
        "- Complexity: routing lookup `O(1)` per request (hash map), pagination `O(limit)` per page.",
    ]
    return "\n".join(lines)


def _slug(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "resources"
