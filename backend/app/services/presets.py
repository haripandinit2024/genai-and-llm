"""Curated preset library exposed through ``GET /api/presets``."""

from __future__ import annotations

from app.schemas.tools import Preset, PresetListResponse

CATEGORY_ORDER: tuple[str, ...] = (
    "Algorithms",
    "Data Structures",
    "Web & API",
    "System Design",
)

PRESETS: tuple[Preset, ...] = (
    Preset(
        id="fibonacci",
        title="Fibonacci Sequence",
        description="Iterative and recursive Fibonacci with output and sum verification.",
        category="Algorithms",
        tag="Math & Recursion",
        prompt="Generate a fibonacci function",
        complexity="O(n)",
        viz="sorting",
    ),
    Preset(
        id="sorting",
        title="Sorting Algorithms Suite",
        description="Bubble, quick and merge sort side by side with complexity notes.",
        category="Algorithms",
        tag="Sorting",
        prompt="Show me sorting algorithms",
        complexity="O(n log n)",
        viz="sorting",
    ),
    Preset(
        id="binary-search",
        title="Binary Search",
        description="Iterative and recursive O(log n) search over a sorted array.",
        category="Algorithms",
        tag="Search",
        prompt="Write binary search algorithm",
        complexity="O(log n)",
        viz="binary_search",
    ),
    Preset(
        id="primes",
        title="Prime Numbers",
        description="Trial division up to sqrt(n) plus the Sieve of Eratosthenes.",
        category="Algorithms",
        tag="Number Theory",
        prompt="Generate a prime number checker and a sieve",
        complexity="O(sqrt(n))",
    ),
    Preset(
        id="linked-list",
        title="Linked List",
        description="Singly linked list with append, prepend, delete and reverse.",
        category="Data Structures",
        tag="Linked List",
        prompt="Write a linked list implementation",
        complexity="O(n)",
        viz="linked_list",
    ),
    Preset(
        id="bst",
        title="Binary Search Tree",
        description="Insert, search, height and in-order traversal on a BST.",
        category="Data Structures",
        tag="Trees",
        prompt="Create a binary search tree",
        complexity="O(log n) balanced",
        viz="tree",
    ),
    Preset(
        id="stack-queue",
        title="Stack & Queue",
        description="LIFO stack and FIFO queue, with O(1) deque-backed operations.",
        category="Data Structures",
        tag="Linear",
        prompt="Show stack and queue implementation",
        complexity="O(1)",
        viz="stack_queue",
    ),
    Preset(
        id="graph",
        title="Graph BFS & DFS",
        description="Adjacency-list graph with breadth-first and depth-first traversal.",
        category="Data Structures",
        tag="Graphs",
        prompt="Write a graph BFS and DFS implementation",
        complexity="O(V + E)",
    ),
    Preset(
        id="todo",
        title="TODO App Core",
        description="Dataclass task model with completion tracking and reporting.",
        category="Web & API",
        tag="Application",
        prompt="Build a todo app",
        complexity="O(n)",
    ),
    Preset(
        id="scraper",
        title="HTML Scraper",
        description="Parse titles, headings and links from HTML with html.parser.",
        category="Web & API",
        tag="Parsing",
        prompt="Write a web scraper script",
        complexity="O(n)",
    ),
    Preset(
        id="api-json",
        title="API Response Parsing",
        description="Decode a JSON payload and normalise the fields you care about.",
        category="Web & API",
        tag="JSON",
        prompt="Write code to parse an API JSON response",
        complexity="O(n)",
    ),
    Preset(
        id="architecture",
        title="System Design Blueprint",
        description="Gateway + services blueprint with REST contract and performance budget.",
        category="System Design",
        tag="Architecture",
        prompt="Design a scalable API gateway microservices architecture",
        complexity="O(1) routing",
    ),
)


def preset_list() -> PresetListResponse:
    """Return the presets grouped by the canonical category order."""

    ordered = sorted(
        PRESETS,
        key=lambda preset: (
            CATEGORY_ORDER.index(preset.category)
            if preset.category in CATEGORY_ORDER
            else len(CATEGORY_ORDER),
            preset.title,
        ),
    )
    return PresetListResponse(categories=list(CATEGORY_ORDER), presets=list(ordered))
