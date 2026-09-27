"""Curated code templates, keyword routing and language detection.

Everything here is offline-friendly: templates never touch the network or the
filesystem so that the sandboxed "Run Code" button can execute any of them.
"""

from __future__ import annotations

import re
from typing import Optional

from app.schemas.chat import CodeBlock

_CODE_BLOCK_RE = re.compile(r"```(\w+)?[ \t]*\n(.*?)```", re.DOTALL)

KNOWN_LANGUAGES: frozenset[str] = frozenset(
    {
        "python", "py", "javascript", "js", "typescript", "ts", "java", "c",
        "cpp", "csharp", "go", "rust", "ruby", "php", "swift", "kotlin", "sql",
        "html", "css", "bash", "sh", "json", "yaml", "text",
    }
)

RUNTIME_LANGUAGES: frozenset[str] = frozenset({"python", "py"})

_JS_FIBONACCI = """function fibonacci(n) {
  if (n <= 0) return [];
  const fib = [0, 1];
  while (fib.length < n) {
    fib.push(fib.at(-1) + fib.at(-2));
  }
  return fib.slice(0, n);
}

console.log("First 15 Fibonacci numbers:", fibonacci(15));
console.log("Sum:", fibonacci(15).reduce((a, b) => a + b, 0));"""

_CODE_TEMPLATES: dict[str, dict[str, str]] = {
    "fizzbuzz": {
        "python": '''"""Classic FizzBuzz: multiples of 3, 5 and 15 up to 100."""


def fizzbuzz(limit: int = 100) -> list[str]:
    """Return the FizzBuzz sequence for 1..limit."""
    sequence = []
    for i in range(1, limit + 1):
        if i % 15 == 0:
            sequence.append("FizzBuzz")
        elif i % 3 == 0:
            sequence.append("Fizz")
        elif i % 5 == 0:
            sequence.append("Buzz")
        else:
            sequence.append(str(i))
    return sequence


print(" ".join(fizzbuzz(20)))''',
        "javascript": '''function fizzbuzz(limit = 100) {
  const sequence = [];
  for (let i = 1; i <= limit; i++) {
    if (i % 15 === 0) sequence.push("FizzBuzz");
    else if (i % 3 === 0) sequence.push("Fizz");
    else if (i % 5 === 0) sequence.push("Buzz");
    else sequence.push(String(i));
  }
  return sequence;
}

console.log(fizzbuzz(20).join(" "));''',
    },
    "fibonacci": {
        "python": '''def fibonacci(n: int) -> list[int]:
    """Generate the first n Fibonacci numbers."""
    if n <= 0:
        return []
    fib = [0, 1]
    while len(fib) < n:
        fib.append(fib[-1] + fib[-2])
    return fib[:n]


# Example usage
result = fibonacci(15)
print(f"First 15 Fibonacci numbers: {result}")
print(f"Sum: {sum(result)}")''',
        "javascript": _JS_FIBONACCI,
    },
    "factorial": {
        "python": '''def factorial(n: int) -> int:
    """Calculate factorial using recursion."""
    if n < 0:
        raise ValueError("Factorial is not defined for negative numbers")
    if n <= 1:
        return 1
    return n * factorial(n - 1)


def factorial_iterative(n: int) -> int:
    """Calculate factorial iteratively in O(n) time."""
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result


for i in range(11):
    print(f"{i}! = {factorial(i)} (iterative: {factorial_iterative(i)})")''',
        "javascript": '''function factorial(n) {
  if (n < 0) throw new Error("Negative numbers not supported");
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

for (let i = 0; i <= 10; i++) {
  console.log(`${i}! = ${factorial(i)}`);
}''',
    },
    "sorting": {
        "python": '''def bubble_sort(items: list) -> list:
    """Bubble Sort - O(n^2) time, O(1) space."""
    data = items.copy()
    for i in range(len(data)):
        swapped = False
        for j in range(0, len(data) - i - 1):
            if data[j] > data[j + 1]:
                data[j], data[j + 1] = data[j + 1], data[j]
                swapped = True
        if not swapped:
            break
    return data


def quick_sort(items: list) -> list:
    """Quick Sort - O(n log n) average, O(n^2) worst case."""
    if len(items) <= 1:
        return list(items)
    pivot = items[len(items) // 2]
    left = [x for x in items if x < pivot]
    middle = [x for x in items if x == pivot]
    right = [x for x in items if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)


def merge_sort(items: list) -> list:
    """Merge Sort - O(n log n) time, O(n) space."""
    if len(items) <= 1:
        return list(items)
    mid = len(items) // 2
    return _merge(merge_sort(items[:mid]), merge_sort(items[mid:]))


def _merge(left: list, right: list) -> list:
    merged = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            merged.append(left[i])
            i += 1
        else:
            merged.append(right[j])
            j += 1
    merged.extend(left[i:])
    merged.extend(right[j:])
    return merged


import random

data = random.sample(range(1, 50), 12)
print(f"Original:    {data}")
print(f"Bubble Sort: {bubble_sort(data)}")
print(f"Quick Sort:  {quick_sort(data)}")
print(f"Merge Sort:  {merge_sort(data)}")''',
    },
    "binary_search": {
        "python": '''def binary_search(items: list, target) -> int:
    """Iterative binary search on a sorted list. Returns index or -1."""
    low, high = 0, len(items) - 1
    while low <= high:
        mid = (low + high) // 2
        if items[mid] == target:
            return mid
        if items[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1


def binary_search_recursive(items: list, target, low: int = 0, high: int | None = None) -> int:
    """Recursive binary search. O(log n) time, O(log n) stack space."""
    if high is None:
        high = len(items) - 1
    if low > high:
        return -1
    mid = (low + high) // 2
    if items[mid] == target:
        return mid
    if items[mid] < target:
        return binary_search_recursive(items, target, mid + 1, high)
    return binary_search_recursive(items, target, low, mid - 1)


sorted_list = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
print(f"List: {sorted_list}")
for target in [23, 72, 10]:
    index = binary_search(sorted_list, target)
    status = f"found at index {index}" if index != -1 else "not found"
    print(f"Search {target}: {status}")''',
    },
    "palindrome": {
        "python": '''def is_palindrome(text: str) -> bool:
    """Check a string ignoring case and non-alphanumeric characters."""
    cleaned = "".join(char.lower() for char in text if char.isalnum())
    return cleaned == cleaned[::-1]


def longest_palindrome(text: str) -> str:
    """Find the longest palindromic substring using expand-around-centre."""
    if len(text) < 2:
        return text
    start, max_length = 0, 1

    def expand(left: int, right: int) -> None:
        nonlocal start, max_length
        while left >= 0 and right < len(text) and text[left] == text[right]:
            if right - left + 1 > max_length:
                start, max_length = left, right - left + 1
            left -= 1
            right += 1

    for index in range(len(text)):
        expand(index, index)
        expand(index, index + 1)

    return text[start:start + max_length]


for candidate in ["racecar", "A man a plan a canal Panama", "hello", "abacaba"]:
    print(f'"{candidate}" -> palindrome={is_palindrome(candidate)}')

print("Longest palindrome in babad:", longest_palindrome("babad"))
print("Longest palindrome in cbbd:", longest_palindrome("cbbd"))''',
    },
    "linked_list": {
        "python": '''class Node:
    """A node in a singly linked list."""

    def __init__(self, data):
        self.data = data
        self.next = None


class LinkedList:
    """Singly linked list with the usual operations."""

    def __init__(self):
        self.head = None

    def append(self, data):
        node = Node(data)
        if not self.head:
            self.head = node
            return
        current = self.head
        while current.next:
            current = current.next
        current.next = node

    def prepend(self, data):
        node = Node(data)
        node.next = self.head
        self.head = node

    def delete(self, data) -> bool:
        if not self.head:
            return False
        if self.head.data == data:
            self.head = self.head.next
            return True
        current = self.head
        while current.next and current.next.data != data:
            current = current.next
        if current.next:
            current.next = current.next.next
            return True
        return False

    def reverse(self):
        previous, current = None, self.head
        while current:
            current.next, previous, current = previous, current, current.next
        self.head = previous

    def __repr__(self):
        values, current = [], self.head
        while current:
            values.append(str(current.data))
            current = current.next
        return " -> ".join(values) + " -> None"


ll = LinkedList()
for value in [10, 20, 30, 40, 50]:
    ll.append(value)

print(f"Original:  {ll}")
ll.prepend(5)
print(f"Prepend 5: {ll}")
ll.delete(30)
print(f"Delete 30: {ll}")
ll.reverse()
print(f"Reversed:  {ll}")''',
    },
    "calculator": {
        "python": '''class Calculator:
    """A calculator that keeps a history of every operation."""

    def __init__(self):
        self.history: list[str] = []

    def _record(self, expression: str) -> float:
        self.history.append(expression)
        return self.history and float(expression.split("=")[-1])

    def add(self, a: float, b: float) -> float:
        return self._record(f"{a} + {b} = {a + b}")

    def subtract(self, a: float, b: float) -> float:
        return self._record(f"{a} - {b} = {a - b}")

    def multiply(self, a: float, b: float) -> float:
        return self._record(f"{a} * {b} = {a * b}")

    def divide(self, a: float, b: float) -> float:
        if b == 0:
            raise ZeroDivisionError("Cannot divide by zero")
        return self._record(f"{a} / {b} = {a / b}")

    def power(self, base: float, exponent: float) -> float:
        return self._record(f"{base} ^ {exponent} = {base ** exponent}")

    def show_history(self):
        print("--- Calculation history ---")
        for index, entry in enumerate(self.history, start=1):
            print(f"  {index}. {entry}")


calc = Calculator()
calc.add(10, 5)
calc.subtract(20, 8)
calc.multiply(6, 7)
calc.divide(100, 3)
calc.power(2, 10)
calc.show_history()''',
    },
    "todo": {
        "python": '''from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Task:
    title: str
    done: bool = False
    created_at: str = field(
        default_factory=lambda: datetime.now().strftime("%Y-%m-%d %H:%M")
    )


class TodoApp:
    """In-memory TODO list manager."""

    def __init__(self):
        self.tasks: list[Task] = []

    def add(self, title: str) -> Task:
        task = Task(title=title)
        self.tasks.append(task)
        return task

    def complete(self, index: int) -> None:
        self.tasks[index].done = True

    def remove(self, index: int) -> None:
        self.tasks.pop(index)

    def pending(self) -> list[Task]:
        return [task for task in self.tasks if not task.done]

    def show(self) -> None:
        print("TODO list")
        print("-" * 40)
        for index, task in enumerate(self.tasks):
            marker = "[x]" if task.done else "[ ]"
            print(f"  {index}. {marker} {task.title}  ({task.created_at})")
        print(f"  {len(self.pending())} pending / {len(self.tasks)} total")


app = TodoApp()
app.add("Set up project structure")
app.add("Write unit tests")
app.add("Implement API endpoints")
app.add("Deploy to production")
app.complete(0)
app.complete(2)
app.show()''',
    },
    "api_fetch": {
        "python": '''"""Parse an API style JSON payload (sandbox has no network access)."""
import json

API_RESPONSE = [
    {"id": 1, "name": "Ada Lovelace", "email": "ada@example.com",
     "company": {"name": "Analytical Engines"}},
    {"id": 2, "name": "Alan Turing", "email": "alan@example.com",
     "company": {"name": "Bletchley Park"}},
    {"id": 3, "name": "Grace Hopper", "email": "grace@example.com",
     "company": {"name": "US Navy"}},
]


def parse_users(raw: str) -> list[dict]:
    """Decode the payload and normalise the fields we care about."""
    return [
        {
            "id": user["id"],
            "name": user["name"].upper(),
            "email": user["email"],
            "company": user["company"]["name"],
        }
        for user in json.loads(raw)
    ]


def main() -> None:
    users = parse_users(json.dumps(API_RESPONSE))
    print("Users from API payload")
    print("-" * 50)
    for user in users:
        print(f"  {user['id']}. {user['name']} <{user['email']}>")
        print(f"     company: {user['company']}")


main()''',
        "javascript": '''async function fetchUsers() {
  const response = await fetch("https://jsonplaceholder.typicode.com/users");
  const users = await response.json();

  console.log("Users:");
  users.slice(0, 5).forEach((user) => {
    console.log(`  ${user.id}. ${user.name} - ${user.email}`);
  });
}

await fetchUsers();''',
    },
    "class_example": {
        "python": '''from dataclasses import dataclass
from typing import Optional


@dataclass
class Product:
    name: str
    price: float
    quantity: int = 0

    @property
    def total_value(self) -> float:
        return self.price * self.quantity

    def __str__(self) -> str:
        return f"{self.name}: ${self.price:.2f} x {self.quantity}"


class Inventory:
    """Product inventory manager with search and reporting."""

    def __init__(self):
        self._products: dict[str, Product] = {}

    def add_product(self, name: str, price: float, quantity: int = 0) -> None:
        self._products[name.lower()] = Product(name, price, quantity)

    def restock(self, name: str, quantity: int) -> None:
        product = self._find(name)
        if product:
            product.quantity += quantity

    def sell(self, name: str, quantity: int) -> bool:
        product = self._find(name)
        if product and product.quantity >= quantity:
            product.quantity -= quantity
            return True
        return False

    def search(self, keyword: str) -> list[Product]:
        return [
            product
            for product in self._products.values()
            if keyword.lower() in product.name.lower()
        ]

    def report(self) -> None:
        print("Inventory report")
        print("-" * 45)
        total = 0.0
        for product in sorted(self._products.values(), key=lambda item: item.name):
            print(f"  {product}  (value: ${product.total_value:.2f})")
            total += product.total_value
        print(f"  Total inventory value: ${total:.2f}")

    def _find(self, name: str) -> Optional[Product]:
        return self._products.get(name.lower())


inventory = Inventory()
inventory.add_product("Laptop", 999.99, 15)
inventory.add_product("Mouse", 29.99, 100)
inventory.add_product("Keyboard", 79.99, 50)
inventory.add_product("Laptop Stand", 49.99, 30)
inventory.sell("Mouse", 12)
inventory.restock("Keyboard", 25)

print("Search 'laptop':")
for product in inventory.search("laptop"):
    print(f"  -> {product}")

inventory.report()''',
    },
    "decorator": {
        "python": '''import functools
import time


def timer(func):
    """Measure the execution time of a function."""

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - start
        print(f"{func.__name__}() took {elapsed:.4f}s")
        return result

    return wrapper


def retry(max_attempts: int = 3):
    """Retry a function until it succeeds or attempts run out."""

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as error:
                    print(f"  attempt {attempt}/{max_attempts} failed: {error}")
            raise RuntimeError(f"{func.__name__} failed {max_attempts} times")

        return wrapper

    return decorator


@timer
def slow_sum(limit: int) -> int:
    return sum(range(limit))


@functools.lru_cache(maxsize=None)
def fib(n: int) -> int:
    """Memoized Fibonacci - O(n) time, O(n) space."""
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)


print(f"Sum 1..1M = {slow_sum(1_000_000)}")
print(f"fib(30) = {fib(30)}")
print(f"cache entries = {fib.cache_info().currsize}")''',
    },
    "web_scraper": {
        "python": '''"""Extract structured data from an HTML document (offline demo)."""
from html.parser import HTMLParser

SAMPLE_HTML = """
<html>
  <head><title>Multicode Agent</title></head>
  <body>
    <h1>Documentation</h1>
    <a href="https://example.com/docs">Docs</a>
    <a href="/pricing">Pricing</a>
  </body>
</html>
"""


class PageParser(HTMLParser):
    """Collect the title, headings and links from a page."""

    def __init__(self):
        super().__init__()
        self.title = ""
        self.headings: list[str] = []
        self.links: list[str] = []
        self._capture: str | None = None

    def handle_starttag(self, tag, attrs):
        if tag in {"title", "h1", "h2"}:
            self._capture = tag
        elif tag == "a":
            for name, value in attrs:
                if name == "href" and value:
                    self.links.append(value)

    def handle_endtag(self, tag):
        if tag == self._capture:
            self._capture = None

    def handle_data(self, data):
        text = data.strip()
        if not text or not self._capture:
            return
        if self._capture == "title":
            self.title = text
        else:
            self.headings.append(text)


def scrape(html: str) -> dict:
    parser = PageParser()
    parser.feed(html)
    return {
        "title": parser.title or "(no title)",
        "headings": parser.headings,
        "links": parser.links,
    }


result = scrape(SAMPLE_HTML)
print("Title:", result["title"])
print("Headings:", ", ".join(result["headings"]))
print("Links:")
for href in result["links"]:
    print(f"  - {href}")''',
    },
    "tree": {
        "python": '''class TreeNode:
    """A node in a binary search tree."""

    def __init__(self, value):
        self.value = value
        self.left = None
        self.right = None


class BinarySearchTree:
    """BST with insert, search, traversals and height."""

    def __init__(self):
        self.root = None

    def insert(self, value) -> None:
        self.root = self._insert(self.root, value)

    def _insert(self, node, value):
        if node is None:
            return TreeNode(value)
        if value < node.value:
            node.left = self._insert(node.left, value)
        elif value > node.value:
            node.right = self._insert(node.right, value)
        return node

    def search(self, value) -> bool:
        return self._search(self.root, value)

    def _search(self, node, value) -> bool:
        if node is None:
            return False
        if value == node.value:
            return True
        if value < node.value:
            return self._search(node.left, value)
        return self._search(node.right, value)

    def inorder(self) -> list:
        result: list = []
        self._inorder(self.root, result)
        return result

    def _inorder(self, node, result) -> None:
        if node:
            self._inorder(node.left, result)
            result.append(node.value)
            self._inorder(node.right, result)

    def height(self) -> int:
        return self._height(self.root)

    def _height(self, node) -> int:
        if node is None:
            return 0
        return 1 + max(self._height(node.left), self._height(node.right))


bst = BinarySearchTree()
for value in [50, 30, 70, 20, 40, 60, 80, 10]:
    bst.insert(value)

print(f"In-order traversal: {bst.inorder()}")
print(f"Tree height: {bst.height()} (balanced ideal: 4)")
for target in [40, 55, 80]:
    print(f"Search {target}: {'found' if bst.search(target) else 'not found'}")''',
    },
    "stack_queue": {
        "python": '''from collections import deque


class Stack:
    """LIFO stack."""

    def __init__(self):
        self._items: list = []

    def push(self, item) -> None:
        self._items.append(item)

    def pop(self):
        return self._items.pop() if self._items else None

    def peek(self):
        return self._items[-1] if self._items else None

    def is_empty(self) -> bool:
        return not self._items

    def __len__(self) -> int:
        return len(self._items)

    def __repr__(self) -> str:
        return f"Stack({self._items})"


class Queue:
    """FIFO queue backed by collections.deque (O(1) popleft)."""

    def __init__(self):
        self._items: deque = deque()

    def enqueue(self, item) -> None:
        self._items.append(item)

    def dequeue(self):
        return self._items.popleft() if self._items else None

    def peek(self):
        return self._items[0] if self._items else None

    def is_empty(self) -> bool:
        return not self._items

    def __len__(self) -> int:
        return len(self._items)

    def __repr__(self) -> str:
        return f"Queue({list(self._items)})"


print("Stack (LIFO)")
stack = Stack()
for item in ["A", "B", "C", "D"]:
    stack.push(item)
    print(f"  push({item}) -> {stack}")
print(f"  pop() -> {stack.pop()}, remaining {stack}")
print(f"  peek() -> {stack.peek()}")

print("Queue (FIFO)")
queue = Queue()
for item in [1, 2, 3, 4]:
    queue.enqueue(item)
    print(f"  enqueue({item}) -> {queue}")
print(f"  dequeue() -> {queue.dequeue()}, remaining {queue}")
print(f"  peek() -> {queue.peek()}")''',
    },
    "graph": {
        "python": '''from collections import deque


class Graph:
    """Undirected graph with BFS and DFS traversal."""

    def __init__(self):
        self.adjacency: dict[str, list[str]] = {}

    def add_edge(self, source: str, target: str) -> None:
        self.adjacency.setdefault(source, []).append(target)
        self.adjacency.setdefault(target, []).append(source)

    def bfs(self, start: str) -> list[str]:
        visited, order = {start}, []
        queue = deque([start])
        while queue:
            node = queue.popleft()
            order.append(node)
            for neighbour in self.adjacency.get(node, []):
                if neighbour not in visited:
                    visited.add(neighbour)
                    queue.append(neighbour)
        return order

    def dfs(self, start: str) -> list[str]:
        visited, order = set(), []

        def visit(node: str) -> None:
            visited.add(node)
            order.append(node)
            for neighbour in self.adjacency.get(node, []):
                if neighbour not in visited:
                    visit(neighbour)

        visit(start)
        return order


graph = Graph()
for edge in [("A", "B"), ("A", "C"), ("B", "D"), ("C", "E"), ("D", "F")]:
    graph.add_edge(*edge)

print(f"Adjacency: {graph.adjacency}")
print(f"BFS from A: {graph.bfs('A')}")
print(f"DFS from A: {graph.dfs('A')}")''',
    },
    "prime": {
        "python": '''def is_prime(number: int) -> bool:
    """Trial division up to sqrt(number) - O(sqrt(n))."""
    if number <= 1:
        return False
    if number <= 3:
        return True
    if number % 2 == 0 or number % 3 == 0:
        return False
    divisor = 5
    while divisor * divisor <= number:
        if number % divisor == 0 or number % (divisor + 2) == 0:
            return False
        divisor += 6
    return True


def sieve(limit: int) -> list[int]:
    """Sieve of Eratosthenes - O(n log log n)."""
    if limit < 2:
        return []
    flags = [True] * (limit + 1)
    flags[0] = flags[1] = False
    for value in range(2, int(limit ** 0.5) + 1):
        if flags[value]:
            for multiple in range(value * value, limit + 1, value):
                flags[multiple] = False
    return [value for value, prime in enumerate(flags) if prime]


print("Trial division 1..50:", [n for n in range(1, 51) if is_prime(n)])
print("Sieve to 50:        ", sieve(50))
print("Sieve to 100 count: ", len(sieve(100)))''',
    },
}

#: (template key, display label, trigger keywords, visualizer view)
KEYWORD_ROUTES: tuple[tuple[str, str, tuple[str, ...], Optional[str]], ...] = (
    ("fizzbuzz", "FizzBuzz", ("fizzbuzz", "fizz buzz", "fizz_buzz"), None),
    ("fibonacci", "Fibonacci sequence", ("fibonacci", "fib sequence", "fib("), "sorting"),
    ("factorial", "Factorial", ("factorial",), "sorting"),
    ("sorting", "Sorting algorithms",
     ("bubble sort", "quick sort", "merge sort", "sorting algorithm", "sort algorithm", "sort"),
     "sorting"),
    ("binary_search", "Binary Search", ("binary search", "bsearch", "bisect"), "binary_search"),
    ("palindrome", "Palindrome checker", ("palindrome",), None),
    ("linked_list", "Linked List", ("linked list", "linkedlist"), "linked_list"),
    ("calculator", "Calculator", ("calculator", "calc class"), None),
    ("todo", "TODO App", ("todo", "task manager", "task list", "to-do", "to do"), None),
    ("api_fetch", "API response parsing",
     ("api", "fetch", "http request", "rest api", "json parse"), None),
    ("class_example", "Class / OOP example",
     ("class", "oop", "object oriented", "inventory", "product"), None),
    ("decorator", "Decorators", ("decorator", "wrapper", "memoize", "memoization"), None),
    ("web_scraper", "Web scraper",
     ("scrape", "scraper", "web scraping", "crawl", "html parse"), None),
    ("tree", "Binary Search Tree",
     ("binary tree", "bst", "tree", "binary search tree"), "tree"),
    ("stack_queue", "Stack & Queue", ("stack", "queue", "lifo", "fifo"), "stack_queue"),
    ("graph", "Graph traversal", ("graph", "bfs", "dfs", "traversal"), None),
    ("prime", "Prime numbers", ("prime", "sieve"), None),
)

#: Secondary keywords that make a request look like "write me code".
REQUEST_VERBS: tuple[str, ...] = (
    "write", "generate", "create", "code", "implement", "build", "make",
    "function", "script", "program", "show me", "give me", "example of",
    "how do i", "how to", "reverse", "convert", "calculate", "compute",
    "check if", "find the",
)

#: Ordered language hints - earlier entries win (javascript before java, etc.).
_LANGUAGE_HINTS: tuple[tuple[str, str], ...] = (
    ("typescript", "typescript"),
    ("javascript", "javascript"),
    ("node.js", "javascript"),
    ("js", "javascript"),
    ("java", "java"),
    ("c++", "cpp"),
    ("c#", "csharp"),
    ("csharp", "csharp"),
    ("golang", "go"),
    ("go", "go"),
    ("rust", "rust"),
    ("ruby", "ruby"),
    ("php", "php"),
    ("kotlin", "kotlin"),
    ("swift", "swift"),
    ("sql", "sql"),
)

_WORD_HINT_RE_CACHE: dict[str, re.Pattern[str]] = {}


def _word_hint_pattern(hint: str) -> re.Pattern[str]:
    """Match a language hint only as a whole word ('js' must not match 'json')."""

    pattern = _WORD_HINT_RE_CACHE.get(hint)
    if pattern is None:
        pattern = re.compile(rf"(?<![\w#+]){re.escape(hint)}(?![\w#+])")
        _WORD_HINT_RE_CACHE[hint] = pattern
    return pattern


def extract_code_blocks(text: str) -> list[CodeBlock]:
    """Pull fenced code blocks out of a markdown message."""

    blocks: list[CodeBlock] = []
    for match in _CODE_BLOCK_RE.finditer(text):
        language = (match.group(1) or "text").lower()
        blocks.append(
            CodeBlock(
                language=language,
                code=match.group(2).rstrip("\n"),
                runnable=language in RUNTIME_LANGUAGES,
            )
        )
    return blocks


def detect_language(text: str) -> Optional[str]:
    """Return the language of the first fenced code block, if it is known."""

    for match in _CODE_BLOCK_RE.finditer(text):
        language = (match.group(1) or "").lower()
        if language in KNOWN_LANGUAGES:
            return language
    return None


def detect_requested_language(text: str) -> str:
    """Detect the language the user asked for (defaults to Python)."""

    lowered = text.lower()
    for hint, language in _LANGUAGE_HINTS:
        if _word_hint_pattern(hint).search(lowered):
            return language
    return "python"


def find_template(text: str) -> tuple[Optional[str], Optional[str], Optional[str]]:
    """Match user text against the curated templates.

    Returns ``(template_key, label, viz_hint)``.
    """

    lowered = text.lower()
    for key, label, keywords, viz in KEYWORD_ROUTES:
        if any(keyword in lowered for keyword in keywords):
            return key, label, viz
    return None, None, None


def template_code(template_key: str, language: str) -> tuple[str, str]:
    """Return ``(code, actual_language)`` for a template, falling back to Python."""

    templates = _CODE_TEMPLATES.get(template_key, {})
    if not templates:
        return "", language
    if language in templates:
        return templates[language], language
    return templates.get("python", ""), "python"
