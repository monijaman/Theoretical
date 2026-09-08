# 💡 Most Frequently Asked DSA Problems - Detailed Solutions

## Table of Contents
1. [Two Sum](#1-two-sum)
2. [Longest Substring Without Repeating Characters](#2-longest-substring-without-repeating-characters)
3. [Reverse Linked List](#3-reverse-linked-list)
4. [Detect Cycle in Linked List](#4-detect-cycle-in-linked-list)
5. [Valid Parentheses](#5-valid-parentheses)
6. [Binary Search](#6-binary-search)
7. [Merge Intervals](#7-merge-intervals)
8. [Tree Traversals](#8-tree-traversals)
9. [Bonus Problems](#9-bonus-problems)

---

## 1. Two Sum

**Problem:** Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.

**Example:**
```
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: nums[0] + nums[1] = 2 + 7 = 9
```

### Solution 1: Brute Force

```javascript
/**
 * Time Complexity: O(n²)
 * Space Complexity: O(1)
 */
function twoSumBruteForce(nums, target) {
  // Check every pair of numbers
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) {
        return [i, j];
      }
    }
  }
  return [];
}

// Example
console.log(twoSumBruteForce([2, 7, 11, 15], 9)); // [0, 1]
```

**How it works:**
1. Use two nested loops
2. For each element, check all elements after it
3. If sum equals target, return indices
4. **Drawback:** Slow for large arrays (O(n²))

### Solution 2: Hash Map (Optimal)

```javascript
/**
 * Time Complexity: O(n)
 * Space Complexity: O(n)
 */
function twoSum(nums, target) {
  const map = new Map(); // Store: value -> index
  
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    
    // Check if complement exists in map
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    
    // Store current number and its index
    map.set(nums[i], i);
  }
  
  return [];
}

// Example with detailed steps
function twoSumDetailed(nums, target) {
  const map = new Map();
  
  for (let i = 0; i < nums.length; i++) {
    console.log(`\nStep ${i + 1}:`);
    console.log(`Current number: ${nums[i]}`);
    console.log(`Complement needed: ${target - nums[i]}`);
    
    const complement = target - nums[i];
    
    if (map.has(complement)) {
      console.log(`✓ Found! ${complement} + ${nums[i]} = ${target}`);
      return [map.get(complement), i];
    }
    
    map.set(nums[i], i);
    console.log(`Map now: ${JSON.stringify([...map])}`);
  }
  
  return [];
}

// Test
console.log(twoSum([2, 7, 11, 15], 9)); // [0, 1]
console.log(twoSum([3, 2, 4], 6));      // [1, 2]
console.log(twoSum([3, 3], 6));         // [0, 1]
```

**How it works:**
1. Create a hash map to store numbers we've seen
2. For each number, calculate its complement (target - current)
3. Check if complement exists in map
4. If yes: return [complement's index, current index]
5. If no: add current number to map and continue

**Visual Example:**
```
nums = [2, 7, 11, 15], target = 9

Step 1: i=0, nums[0]=2
  complement = 9 - 2 = 7
  map is empty, so add: {2: 0}

Step 2: i=1, nums[1]=7
  complement = 9 - 7 = 2
  2 exists in map at index 0
  Return [0, 1] ✓
```

### Follow-up Questions:

**Q: What if there are multiple solutions?**
```javascript
function twoSumAllPairs(nums, target) {
  const result = [];
  const map = new Map();
  
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    
    if (map.has(complement)) {
      result.push([map.get(complement), i]);
    }
    
    map.set(nums[i], i);
  }
  
  return result;
}
```

**Q: What if the array is sorted?**
```javascript
function twoSumSorted(nums, target) {
  let left = 0;
  let right = nums.length - 1;
  
  while (left < right) {
    const sum = nums[left] + nums[right];
    
    if (sum === target) {
      return [left, right];
    } else if (sum < target) {
      left++; // Need larger sum
    } else {
      right--; // Need smaller sum
    }
  }
  
  return [];
}

// Time: O(n), Space: O(1) - Better than hash map!
```

---

## 2. Longest Substring Without Repeating Characters

**Problem:** Given a string `s`, find the length of the longest substring without repeating characters.

**Example:**
```
Input: s = "abcabcbb"
Output: 3
Explanation: The answer is "abc", with length 3
```

### Solution 1: Brute Force

```javascript
/**
 * Time Complexity: O(n³)
 * Space Complexity: O(min(n, m)) where m is charset size
 */
function lengthOfLongestSubstringBrute(s) {
  let maxLength = 0;
  
  // Check all possible substrings
  for (let i = 0; i < s.length; i++) {
    for (let j = i; j < s.length; j++) {
      if (allUnique(s, i, j)) {
        maxLength = Math.max(maxLength, j - i + 1);
      }
    }
  }
  
  return maxLength;
}

function allUnique(s, start, end) {
  const set = new Set();
  for (let i = start; i <= end; i++) {
    if (set.has(s[i])) return false;
    set.add(s[i]);
  }
  return true;
}

console.log(lengthOfLongestSubstringBrute("abcabcbb")); // 3
```

### Solution 2: Sliding Window (Optimal)

```javascript
/**
 * Time Complexity: O(n)
 * Space Complexity: O(min(n, m))
 */
function lengthOfLongestSubstring(s) {
  const charSet = new Set();
  let left = 0;
  let maxLength = 0;
  
  for (let right = 0; right < s.length; right++) {
    // If character is duplicate, remove from left
    while (charSet.has(s[right])) {
      charSet.delete(s[left]);
      left++;
    }
    
    // Add current character
    charSet.add(s[right]);
    
    // Update max length
    maxLength = Math.max(maxLength, right - left + 1);
  }
  
  return maxLength;
}

// Detailed version with logging
function lengthOfLongestSubstringDetailed(s) {
  const charSet = new Set();
  let left = 0;
  let maxLength = 0;
  
  console.log(`Finding longest substring without repeating chars in: "${s}"`);
  
  for (let right = 0; right < s.length; right++) {
    console.log(`\nStep ${right + 1}:`);
    console.log(`  Current char: '${s[right]}'`);
    console.log(`  Window: [${left}, ${right}]`);
    
    // Remove duplicates from left
    while (charSet.has(s[right])) {
      console.log(`  ✗ Duplicate! Removing '${s[left]}'`);
      charSet.delete(s[left]);
      left++;
    }
    
    charSet.add(s[right]);
    const currentLength = right - left + 1;
    maxLength = Math.max(maxLength, currentLength);
    
    console.log(`  Current substring: "${s.substring(left, right + 1)}"`);
    console.log(`  Length: ${currentLength}, Max: ${maxLength}`);
  }
  
  console.log(`\nResult: ${maxLength}`);
  return maxLength;
}

// Test
console.log(lengthOfLongestSubstring("abcabcbb")); // 3
console.log(lengthOfLongestSubstring("bbbbb"));    // 1
console.log(lengthOfLongestSubstring("pwwkew"));   // 3
```

**Visual Example:**
```
s = "abcabcbb"

Step 1: right=0, char='a'
  Window: "a", length=1, max=1

Step 2: right=1, char='b'
  Window: "ab", length=2, max=2

Step 3: right=2, char='c'
  Window: "abc", length=3, max=3

Step 4: right=3, char='a'
  Duplicate! Remove 'a' from left
  Window: "bca", length=3, max=3

Step 5: right=4, char='b'
  Duplicate! Remove 'b', 'c' from left
  Window: "ab", length=2, max=3

...and so on
```

### Solution 3: Optimized with Hash Map

```javascript
/**
 * Time Complexity: O(n)
 * Space Complexity: O(min(n, m))
 * Advantage: Single pass, no while loop
 */
function lengthOfLongestSubstringOptimized(s) {
  const charIndex = new Map(); // char -> last seen index
  let left = 0;
  let maxLength = 0;
  
  for (let right = 0; right < s.length; right++) {
    const char = s[right];
    
    // If char exists and is in current window
    if (charIndex.has(char) && charIndex.get(char) >= left) {
      left = charIndex.get(char) + 1;
    }
    
    charIndex.set(char, right);
    maxLength = Math.max(maxLength, right - left + 1);
  }
  
  return maxLength;
}

console.log(lengthOfLongestSubstringOptimized("abcabcbb")); // 3
```

### Edge Cases:

```javascript
// Empty string
console.log(lengthOfLongestSubstring(""));        // 0

// Single character
console.log(lengthOfLongestSubstring("a"));       // 1

// All unique
console.log(lengthOfLongestSubstring("abcdef"));  // 6

// All same
console.log(lengthOfLongestSubstring("aaaaa"));   // 1

// Special characters
console.log(lengthOfLongestSubstring("a b c"));   // 3
```

---

## 3. Reverse Linked List

**Problem:** Reverse a singly linked list.

**Example:**
```
Input:  1 -> 2 -> 3 -> 4 -> 5 -> NULL
Output: 5 -> 4 -> 3 -> 2 -> 1 -> NULL
```

### Linked List Node Structure

```javascript
class ListNode {
  constructor(val = 0, next = null) {
    this.val = val;
    this.next = next;
  }
}

// Helper: Create list from array
function createList(arr) {
  if (!arr.length) return null;
  
  const head = new ListNode(arr[0]);
  let current = head;
  
  for (let i = 1; i < arr.length; i++) {
    current.next = new ListNode(arr[i]);
    current = current.next;
  }
  
  return head;
}

// Helper: Print list
function printList(head) {
  const values = [];
  let current = head;
  
  while (current) {
    values.push(current.val);
    current = current.next;
  }
  
  console.log(values.join(' -> ') + ' -> NULL');
}
```

### Solution 1: Iterative (Most Common)

```javascript
/**
 * Time Complexity: O(n)
 * Space Complexity: O(1)
 */
function reverseList(head) {
  let prev = null;
  let current = head;
  
  while (current !== null) {
    const nextTemp = current.next; // Save next node
    current.next = prev;            // Reverse pointer
    prev = current;                 // Move prev forward
    current = nextTemp;             // Move current forward
  }
  
  return prev; // New head
}

// Detailed version with visualization
function reverseListDetailed(head) {
  let prev = null;
  let current = head;
  let step = 0;
  
  console.log('Initial list:');
  printList(head);
  console.log('');
  
  while (current !== null) {
    step++;
    console.log(`Step ${step}:`);
    console.log(`  Current: ${current.val}`);
    console.log(`  Prev: ${prev ? prev.val : 'null'}`);
    
    const nextTemp = current.next;
    current.next = prev;
    
    console.log(`  Action: Point ${current.val} -> ${prev ? prev.val : 'null'}`);
    
    prev = current;
    current = nextTemp;
    
    if (prev) {
      console.log('  List so far:');
      printList(prev);
    }
    console.log('');
  }
  
  console.log('Final reversed list:');
  printList(prev);
  
  return prev;
}

// Test
const list = createList([1, 2, 3, 4, 5]);
const reversed = reverseList(list);
printList(reversed); // 5 -> 4 -> 3 -> 2 -> 1 -> NULL
```

**Visual Step-by-Step:**
```
Initial: 1 -> 2 -> 3 -> 4 -> 5 -> NULL

Step 1:
  prev = null
  current = 1
  nextTemp = 2
  1.next = null
  Result: null <- 1    2 -> 3 -> 4 -> 5

Step 2:
  prev = 1
  current = 2
  nextTemp = 3
  2.next = 1
  Result: null <- 1 <- 2    3 -> 4 -> 5

Step 3:
  prev = 2
  current = 3
  nextTemp = 4
  3.next = 2
  Result: null <- 1 <- 2 <- 3    4 -> 5

Step 4:
  prev = 3
  current = 4
  nextTemp = 5
  4.next = 3
  Result: null <- 1 <- 2 <- 3 <- 4    5

Step 5:
  prev = 4
  current = 5
  nextTemp = null
  5.next = 4
  Result: null <- 1 <- 2 <- 3 <- 4 <- 5

Final: current = null, return prev = 5
```

### Solution 2: Recursive

```javascript
/**
 * Time Complexity: O(n)
 * Space Complexity: O(n) - call stack
 */
function reverseListRecursive(head) {
  // Base case
  if (head === null || head.next === null) {
    return head;
  }
  
  // Reverse the rest
  const newHead = reverseListRecursive(head.next);
  
  // Reverse current node
  head.next.next = head;
  head.next = null;
  
  return newHead;
}

// Detailed with explanation
function reverseListRecursiveDetailed(head, depth = 0) {
  const indent = '  '.repeat(depth);
  
  console.log(`${indent}Called with: ${head ? head.val : 'null'}`);
  
  if (head === null || head.next === null) {
    console.log(`${indent}Base case reached, returning: ${head ? head.val : 'null'}`);
    return head;
  }
  
  console.log(`${indent}Recursing on: ${head.next.val}`);
  const newHead = reverseListRecursiveDetailed(head.next, depth + 1);
  
  console.log(`${indent}Back from recursion, reversing ${head.val} -> ${head.next.val}`);
  head.next.next = head;
  head.next = null;
  console.log(`${indent}New connection: ${head.next ? head.next.val : 'null'} <- ${head.val}`);
  
  return newHead;
}

// Test
const list2 = createList([1, 2, 3, 4, 5]);
const reversed2 = reverseListRecursive(list2);
printList(reversed2);
```

**Recursive Call Stack:**
```
reverseList(1)
  reverseList(2)
    reverseList(3)
      reverseList(4)
        reverseList(5)
          return 5 (base case)
        5.next = 4, 4.next = null
        return 5
      5 <- 4 <- 3, 3.next = null
      return 5
    5 <- 4 <- 3 <- 2, 2.next = null
    return 5
  5 <- 4 <- 3 <- 2 <- 1, 1.next = null
  return 5

Final: 5 -> 4 -> 3 -> 2 -> 1 -> NULL
```

### Solution 3: Using Stack

```javascript
/**
 * Time Complexity: O(n)
 * Space Complexity: O(n)
 */
function reverseListStack(head) {
  if (!head) return null;
  
  const stack = [];
  let current = head;
  
  // Push all nodes to stack
  while (current) {
    stack.push(current);
    current = current.next;
  }
  
  // Pop and rebuild
  const newHead = stack.pop();
  current = newHead;
  
  while (stack.length > 0) {
    current.next = stack.pop();
    current = current.next;
  }
  
  current.next = null;
  return newHead;
}
```

---

## 4. Detect Cycle in Linked List

**Problem:** Given a linked list, determine if it has a cycle.

**Example:**
```
Input:  1 -> 2 -> 3 -> 4
             ↑         ↓
             └─────────┘
Output: true (cycle exists)
```

### Solution 1: Hash Set

```javascript
/**
 * Time Complexity: O(n)
 * Space Complexity: O(n)
 */
function hasCycleHashSet(head) {
  const visited = new Set();
  let current = head;
  
  while (current !== null) {
    if (visited.has(current)) {
      return true; // Found cycle
    }
    
    visited.add(current);
    current = current.next;
  }
  
  return false; // No cycle
}

// Test helper
function createCyclicList(arr, cyclePos) {
  if (!arr.length) return null;
  
  const head = new ListNode(arr[0]);
  let current = head;
  let cycleNode = null;
  
  if (cyclePos === 0) cycleNode = head;
  
  for (let i = 1; i < arr.length; i++) {
    current.next = new ListNode(arr[i]);
    current = current.next;
    
    if (i === cyclePos) cycleNode = current;
  }
  
  // Create cycle
  if (cycleNode) {
    current.next = cycleNode;
  }
  
  return head;
}

// Test
const cyclicList = createCyclicList([1, 2, 3, 4], 1);
console.log(hasCycleHashSet(cyclicList)); // true
```

### Solution 2: Floyd's Cycle Detection (Two Pointers) ⭐

```javascript
/**
 * Time Complexity: O(n)
 * Space Complexity: O(1) - Best!
 * Also known as "Tortoise and Hare" algorithm
 */
function hasCycle(head) {
  if (!head || !head.next) return false;
  
  let slow = head;      // Moves 1 step
  let fast = head.next; // Moves 2 steps
  
  while (slow !== fast) {
    // If fast reaches end, no cycle
    if (!fast || !fast.next) {
      return false;
    }
    
    slow = slow.next;
    fast = fast.next.next;
  }
  
  return true; // Pointers met, cycle exists
}

// Detailed version
function hasCycleDetailed(head) {
  if (!head || !head.next) return false;
  
  let slow = head;
  let fast = head.next;
  let step = 0;
  
  console.log('Starting cycle detection...');
  
  while (slow !== fast) {
    step++;
    console.log(`\nStep ${step}:`);
    console.log(`  Slow at: ${slow.val}`);
    console.log(`  Fast at: ${fast.val}`);
    
    if (!fast || !fast.next) {
      console.log('  Fast reached end - No cycle!');
      return false;
    }
    
    slow = slow.next;
    fast = fast.next.next;
  }
  
  console.log(`\nPointers met at node ${slow.val} - Cycle detected!`);
  return true;
}
```

**Why does this work?**
```
If there's a cycle:
- Slow pointer moves 1 step at a time
- Fast pointer moves 2 steps at a time
- Eventually, fast will "lap" slow inside the cycle
- They MUST meet

Visual Example:
1 -> 2 -> 3 -> 4
     ↑         ↓
     └─────────┘

Step 1: slow=1, fast=2
Step 2: slow=2, fast=4
Step 3: slow=3, fast=3  ← They meet!
```

### Follow-up: Find Cycle Start

```javascript
/**
 * Find the node where cycle begins
 */
function detectCycleStart(head) {
  if (!head || !head.next) return null;
  
  let slow = head;
  let fast = head;
  
  // Phase 1: Detect cycle
  while (fast && fast.next) {
    slow = slow.next;
    fast = fast.next.next;
    
    if (slow === fast) {
      // Cycle detected, move to phase 2
      break;
    }
  }
  
  // No cycle
  if (!fast || !fast.next) return null;
  
  // Phase 2: Find cycle start
  slow = head;
  while (slow !== fast) {
    slow = slow.next;
    fast = fast.next;
  }
  
  return slow; // Cycle starts here
}

// Mathematical proof:
// If distance to cycle start = x
// Cycle length = y
// Meeting point = k steps into cycle
// Then: 2(x+k) = x+k+ny  where n is laps
// Solving: x = ny - k
// So moving slow from head and fast from meeting point
// will meet at cycle start!
```

---

## 5. Valid Parentheses

**Problem:** Given a string containing just `'(', ')', '{', '}', '[', ']'`, determine if the input string is valid.

**Rules:**
1. Open brackets must be closed by the same type
2. Open brackets must be closed in the correct order

**Example:**
```
Input: "()"     → Output: true
Input: "()[]{}" → Output: true
Input: "(]"     → Output: false
Input: "([)]"   → Output: false
Input: "{[]}"   → Output: true
```

### Solution: Stack

```javascript
/**
 * Time Complexity: O(n)
 * Space Complexity: O(n)
 */
function isValid(s) {
  const stack = [];
  const pairs = {
    ')': '(',
    '}': '{',
    ']': '['
  };
  
  for (let char of s) {
    // If closing bracket
    if (char in pairs) {
      // Check if it matches top of stack
      if (stack.length === 0 || stack.pop() !== pairs[char]) {
        return false;
      }
    } else {
      // Opening bracket - push to stack
      stack.push(char);
    }
  }
  
  // Valid if stack is empty
  return stack.length === 0;
}

// Detailed version with logging
function isValidDetailed(s) {
  const stack = [];
  const pairs = {
    ')': '(',
    '}': '{',
    ']': '['
  };
  
  console.log(`Validating: "${s}"`);
  
  for (let i = 0; i < s.length; i++) {
    const char = s[i];
    console.log(`\nStep ${i + 1}: char = '${char}'`);
    
    if (char in pairs) {
      console.log(`  Closing bracket found`);
      
      if (stack.length === 0) {
        console.log(`  ✗ Stack empty - no matching opening bracket`);
        return false;
      }
      
      const top = stack.pop();
      console.log(`  Popped: '${top}'`);
      
      if (top !== pairs[char]) {
        console.log(`  ✗ Mismatch: expected '${pairs[char]}' but got '${top}'`);
        return false;
      }
      
      console.log(`  ✓ Match found`);
    } else {
      console.log(`  Opening bracket - push to stack`);
      stack.push(char);
    }
    
    console.log(`  Stack: [${stack.join(', ')}]`);
  }
  
  const isValid = stack.length === 0;
  console.log(`\nFinal stack: [${stack.join(', ')}]`);
  console.log(`Result: ${isValid ? '✓ Valid' : '✗ Invalid (unclosed brackets)'}`);
  
  return isValid;
}

// Tests
console.log(isValid("()"));        // true
console.log(isValid("()[]{}"));    // true
console.log(isValid("(]"));        // false
console.log(isValid("([)]"));      // false
console.log(isValid("{[]}"));      // true
console.log(isValid("("));         // false
console.log(isValid("]"));         // false
```

**Visual Example:**
```
Input: "{[()]}"

Step 1: char='{'
  Stack: ['{']

Step 2: char='['
  Stack: ['{', '[']

Step 3: char='('
  Stack: ['{', '[', '(']

Step 4: char=')'
  Pop '(' - Match! ✓
  Stack: ['{', '[']

Step 5: char=']'
  Pop '[' - Match! ✓
  Stack: ['{']

Step 6: char='}'
  Pop '{' - Match! ✓
  Stack: []

Stack empty → Valid! ✓
```

### Edge Cases:

```javascript
// Empty string
console.log(isValid(""));          // true

// Only opening
console.log(isValid("((("));       // false

// Only closing
console.log(isValid(")))"));       // false

// Wrong order
console.log(isValid("(("));        // false

// Interleaved
console.log(isValid("([)]"));      // false

// Nested correctly
console.log(isValid("((()))"));    // true
```

### Alternative: Switch Statement

```javascript
function isValidSwitch(s) {
  const stack = [];
  
  for (let char of s) {
    switch(char) {
      case '(':
      case '{':
      case '[':
        stack.push(char);
        break;
        
      case ')':
        if (stack.pop() !== '(') return false;
        break;
        
      case '}':
        if (stack.pop() !== '{') return false;
        break;
        
      case ']':
        if (stack.pop() !== '[') return false;
        break;
    }
  }
  
  return stack.length === 0;
}
```

---

## 6. Binary Search

**Problem:** Given sorted array of integers, search for a target value. Return its index or -1 if not found.

**Example:**
```
Input: nums = [-1,0,3,5,9,12], target = 9
Output: 4
```

### Solution 1: Iterative

```javascript
/**
 * Time Complexity: O(log n)
 * Space Complexity: O(1)
 */
function binarySearch(nums, target) {
  let left = 0;
  let right = nums.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    
    if (nums[mid] === target) {
      return mid; // Found!
    } else if (nums[mid] < target) {
      left = mid + 1; // Search right half
    } else {
      right = mid - 1; // Search left half
    }
  }
  
  return -1; // Not found
}

// Detailed version
function binarySearchDetailed(nums, target) {
  let left = 0;
  let right = nums.length - 1;
  let iteration = 0;
  
  console.log(`Searching for ${target} in: [${nums.join(', ')}]`);
  
  while (left <= right) {
    iteration++;
    const mid = Math.floor((left + right) / 2);
    
    console.log(`\nIteration ${iteration}:`);
    console.log(`  Range: [${left}, ${right}]`);
    console.log(`  Mid index: ${mid}, value: ${nums[mid]}`);
    console.log(`  Searching in:`, nums.slice(left, right + 1));
    
    if (nums[mid] === target) {
      console.log(`  ✓ Found at index ${mid}!`);
      return mid;
    } else if (nums[mid] < target) {
      console.log(`  ${nums[mid]} < ${target}, search right half`);
      left = mid + 1;
    } else {
      console.log(`  ${nums[mid]} > ${target}, search left half`);
      right = mid - 1;
    }
  }
  
  console.log(`\n✗ Not found`);
  return -1;
}

// Test
console.log(binarySearch([-1, 0, 3, 5, 9, 12], 9));  // 4
console.log(binarySearch([-1, 0, 3, 5, 9, 12], 2));  // -1
```

**Visual Example:**
```
Array: [-1, 0, 3, 5, 9, 12], target = 9

Iteration 1:
  left=0, right=5, mid=2
  nums[2] = 3
  3 < 9, search right half
  
Iteration 2:
  left=3, right=5, mid=4
  nums[4] = 9
  Found! Return 4
```

### Solution 2: Recursive

```javascript
/**
 * Time Complexity: O(log n)
 * Space Complexity: O(log n) - call stack
 */
function binarySearchRecursive(nums, target, left = 0, right = nums.length - 1) {
  if (left > right) {
    return -1; // Base case: not found
  }
  
  const mid = Math.floor((left + right) / 2);
  
  if (nums[mid] === target) {
    return mid; // Found!
  } else if (nums[mid] < target) {
    return binarySearchRecursive(nums, target, mid + 1, right);
  } else {
    return binarySearchRecursive(nums, target, left, mid - 1);
  }
}
```

### Common Variations:

**Find First Occurrence:**
```javascript
function findFirst(nums, target) {
  let left = 0;
  let right = nums.length - 1;
  let result = -1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    
    if (nums[mid] === target) {
      result = mid;
      right = mid - 1; // Continue searching left
    } else if (nums[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  return result;
}

// Test: [1, 2, 2, 2, 3, 4], target=2
// Returns: 1 (first occurrence)
```

**Find Last Occurrence:**
```javascript
function findLast(nums, target) {
  let left = 0;
  let right = nums.length - 1;
  let result = -1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    
    if (nums[mid] === target) {
      result = mid;
      left = mid + 1; // Continue searching right
    } else if (nums[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  return result;
}
```

**Find Insert Position:**
```javascript
function searchInsert(nums, target) {
  let left = 0;
  let right = nums.length - 1;
  
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    
    if (nums[mid] === target) {
      return mid;
    } else if (nums[mid] < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  
  return left; // Insert position
}

// Example: [1,3,5,6], target=2 → return 1
```

### Common Pitfalls:

```javascript
// ❌ WRONG: Can cause integer overflow in other languages
const mid = (left + right) / 2;

// ✓ CORRECT
const mid = left + Math.floor((right - left) / 2);
// Or in JavaScript (no overflow issue):
const mid = Math.floor((left + right) / 2);

// ❌ WRONG: Infinite loop
while (left < right) { // Should be <=
  // ...
}

// ❌ WRONG: Off by one
left = mid;  // Should be mid + 1
right = mid; // Should be mid - 1
```

---

## 7. Merge Intervals

**Problem:** Given array of intervals, merge all overlapping intervals.

**Example:**
```
Input: [[1,3],[2,6],[8,10],[15,18]]
Output: [[1,6],[8,10],[15,18]]
Explanation: [1,3] and [2,6] overlap → merge to [1,6]
```

### Solution:

```javascript
/**
 * Time Complexity: O(n log n) - sorting
 * Space Complexity: O(n)
 */
function merge(intervals) {
  if (intervals.length <= 1) return intervals;
  
  // Step 1: Sort by start time
  intervals.sort((a, b) => a[0] - b[0]);
  
  const result = [intervals[0]];
  
  // Step 2: Merge overlapping intervals
  for (let i = 1; i < intervals.length; i++) {
    const current = intervals[i];
    const lastMerged = result[result.length - 1];
    
    if (current[0] <= lastMerged[1]) {
      // Overlapping - merge
      lastMerged[1] = Math.max(lastMerged[1], current[1]);
    } else {
      // Non-overlapping - add to result
      result.push(current);
    }
  }
  
  return result;
}

// Detailed version
function mergeDetailed(intervals) {
  if (intervals.length <= 1) return intervals;
  
  console.log('Input:', JSON.stringify(intervals));
  
  // Sort
  intervals.sort((a, b) => a[0] - b[0]);
  console.log('After sorting:', JSON.stringify(intervals));
  
  const result = [intervals[0]];
  console.log('\nStarting with:', JSON.stringify(result));
  
  for (let i = 1; i < intervals.length; i++) {
    const current = intervals[i];
    const lastMerged = result[result.length - 1];
    
    console.log(`\nStep ${i}:`);
    console.log(`  Current interval: [${current}]`);
    console.log(`  Last merged: [${lastMerged}]`);
    
    if (current[0] <= lastMerged[1]) {
      console.log(`  ${current[0]} <= ${lastMerged[1]} - Overlapping!`);
      lastMerged[1] = Math.max(lastMerged[1], current[1]);
      console.log(`  Merged to: [${lastMerged}]`);
    } else {
      console.log(`  ${current[0]} > ${lastMerged[1]} - No overlap`);
      result.push(current);
      console.log(`  Added new interval`);
    }
    
    console.log(`  Result so far:`, JSON.stringify(result));
  }
  
  console.log('\nFinal result:', JSON.stringify(result));
  return result;
}

// Tests
console.log(merge([[1,3],[2,6],[8,10],[15,18]]));
// [[1,6],[8,10],[15,18]]

console.log(merge([[1,4],[4,5]]));
// [[1,5]]

console.log(merge([[1,4],[0,4]]));
// [[0,4]]
```

**Visual Example:**
```
Input: [[1,3],[2,6],[8,10],[15,18]]

Step 1: Sort by start
  [[1,3],[2,6],[8,10],[15,18]]
  Already sorted!

Step 2: Merge
  Start with: [[1,3]]
  
  Current: [2,6], Last: [1,3]
    2 <= 3 → Overlap!
    Merge: [1, max(3,6)] = [1,6]
    Result: [[1,6]]
  
  Current: [8,10], Last: [1,6]
    8 > 6 → No overlap
    Add: [[1,6],[8,10]]
  
  Current: [15,18], Last: [8,10]
    15 > 10 → No overlap
    Add: [[1,6],[8,10],[15,18]]

Output: [[1,6],[8,10],[15,18]]
```

### Follow-up: Insert Interval

```javascript
/**
 * Insert new interval and merge if necessary
 */
function insert(intervals, newInterval) {
  const result = [];
  let i = 0;
  
  // Add all intervals before newInterval
  while (i < intervals.length && intervals[i][1] < newInterval[0]) {
    result.push(intervals[i]);
    i++;
  }
  
  // Merge overlapping intervals
  while (i < intervals.length && intervals[i][0] <= newInterval[1]) {
    newInterval[0] = Math.min(newInterval[0], intervals[i][0]);
    newInterval[1] = Math.max(newInterval[1], intervals[i][1]);
    i++;
  }
  result.push(newInterval);
  
  // Add remaining intervals
  while (i < intervals.length) {
    result.push(intervals[i]);
    i++;
  }
  
  return result;
}

// Example
console.log(insert([[1,3],[6,9]], [2,5]));
// [[1,5],[6,9]]
```

### Edge Cases:

```javascript
// Empty array
console.log(merge([]));  // []

// Single interval
console.log(merge([[1,3]]));  // [[1,3]]

// No overlaps
console.log(merge([[1,2],[3,4],[5,6]]));  // [[1,2],[3,4],[5,6]]

// All overlap
console.log(merge([[1,4],[2,5],[3,6]]));  // [[1,6]]

// Fully contained
console.log(merge([[1,10],[2,3],[4,5]]));  // [[1,10]]
```

---

## 8. Tree Traversals

**Problem:** Traverse a binary tree in different orders.

### Tree Node Structure

```javascript
class TreeNode {
  constructor(val = 0, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}

// Helper: Create tree from array (level-order)
function createTree(arr) {
  if (!arr.length || arr[0] === null) return null;
  
  const root = new TreeNode(arr[0]);
  const queue = [root];
  let i = 1;
  
  while (queue.length > 0 && i < arr.length) {
    const node = queue.shift();
    
    if (i < arr.length && arr[i] !== null) {
      node.left = new TreeNode(arr[i]);
      queue.push(node.left);
    }
    i++;
    
    if (i < arr.length && arr[i] !== null) {
      node.right = new TreeNode(arr[i]);
      queue.push(node.right);
    }
    i++;
  }
  
  return root;
}
```

### 1. Inorder Traversal (Left → Root → Right)

```javascript
/**
 * Recursive
 * Time: O(n), Space: O(h) where h is height
 */
function inorderTraversal(root) {
  const result = [];
  
  function traverse(node) {
    if (!node) return;
    
    traverse(node.left);   // Left
    result.push(node.val);  // Root
    traverse(node.right);   // Right
  }
  
  traverse(root);
  return result;
}

/**
 * Iterative (using stack)
 * Time: O(n), Space: O(h)
 */
function inorderTraversalIterative(root) {
  const result = [];
  const stack = [];
  let current = root;
  
  while (current || stack.length > 0) {
    // Go to leftmost node
    while (current) {
      stack.push(current);
      current = current.left;
    }
    
    // Process node
    current = stack.pop();
    result.push(current.val);
    
    // Go to right subtree
    current = current.right;
  }
  
  return result;
}

// Test
const tree = createTree([1, null, 2, 3]);
/*
    1
     \
      2
     /
    3
*/
console.log(inorderTraversal(tree));  // [1, 3, 2]
```

### 2. Preorder Traversal (Root → Left → Right)

```javascript
/**
 * Recursive
 */
function preorderTraversal(root) {
  const result = [];
  
  function traverse(node) {
    if (!node) return;
    
    result.push(node.val);  // Root
    traverse(node.left);    // Left
    traverse(node.right);   // Right
  }
  
  traverse(root);
  return result;
}

/**
 * Iterative
 */
function preorderTraversalIterative(root) {
  if (!root) return [];
  
  const result = [];
  const stack = [root];
  
  while (stack.length > 0) {
    const node = stack.pop();
    result.push(node.val);
    
    // Push right first (so left is processed first)
    if (node.right) stack.push(node.right);
    if (node.left) stack.push(node.left);
  }
  
  return result;
}

console.log(preorderTraversal(tree));  // [1, 2, 3]
```

### 3. Postorder Traversal (Left → Right → Root)

```javascript
/**
 * Recursive
 */
function postorderTraversal(root) {
  const result = [];
  
  function traverse(node) {
    if (!node) return;
    
    traverse(node.left);    // Left
    traverse(node.right);   // Right
    result.push(node.val);  // Root
  }
  
  traverse(root);
  return result;
}

/**
 * Iterative
 */
function postorderTraversalIterative(root) {
  if (!root) return [];
  
  const result = [];
  const stack = [root];
  
  while (stack.length > 0) {
    const node = stack.pop();
    result.unshift(node.val); // Add to front
    
    // Push left first (opposite of preorder)
    if (node.left) stack.push(node.left);
    if (node.right) stack.push(node.right);
  }
  
  return result;
}

console.log(postorderTraversal(tree));  // [3, 2, 1]
```

### 4. Level Order Traversal (BFS)

```javascript
/**
 * Breadth-First Search
 * Time: O(n), Space: O(w) where w is max width
 */
function levelOrder(root) {
  if (!root) return [];
  
  const result = [];
  const queue = [root];
  
  while (queue.length > 0) {
    const levelSize = queue.length;
    const currentLevel = [];
    
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift();
      currentLevel.push(node.val);
      
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    
    result.push(currentLevel);
  }
  
  return result;
}

const tree2 = createTree([3, 9, 20, null, null, 15, 7]);
/*
      3
     / \
    9  20
       / \
      15  7
*/
console.log(levelOrder(tree2));
// [[3], [9, 20], [15, 7]]
```

### Visual Comparison:

```
Tree:
      1
     / \
    2   3
   / \
  4   5

Inorder (Left-Root-Right):    [4, 2, 5, 1, 3]
Preorder (Root-Left-Right):   [1, 2, 4, 5, 3]
Postorder (Left-Right-Root):  [4, 5, 2, 3, 1]
Level Order:                  [[1], [2, 3], [4, 5]]
```

### Detailed Example with Logging:

```javascript
function inorderDetailed(root, depth = 0) {
  const indent = '  '.repeat(depth);
  
  if (!root) {
    console.log(`${indent}null`);
    return [];
  }
  
  const result = [];
  
  console.log(`${indent}Visit ${root.val}:`);
  
  console.log(`${indent}  Going LEFT...`);
  result.push(...inorderDetailed(root.left, depth + 1));
  
  console.log(`${indent}  Process ${root.val}`);
  result.push(root.val);
  
  console.log(`${indent}  Going RIGHT...`);
  result.push(...inorderDetailed(root.right, depth + 1));
  
  return result;
}
```

---

## 9. Bonus Problems

### 9.1. Maximum Subarray (Kadane's Algorithm)

**Problem:** Find contiguous subarray with largest sum.

```javascript
/**
 * Time: O(n), Space: O(1)
 */
function maxSubArray(nums) {
  let maxSoFar = nums[0];
  let maxEndingHere = nums[0];
  
  for (let i = 1; i < nums.length; i++) {
    // Either extend existing subarray or start new
    maxEndingHere = Math.max(nums[i], maxEndingHere + nums[i]);
    maxSoFar = Math.max(maxSoFar, maxEndingHere);
  }
  
  return maxSoFar;
}

// Example: [-2,1,-3,4,-1,2,1,-5,4]
// Output: 6 (subarray [4,-1,2,1])
```

### 9.2. Climbing Stairs (Dynamic Programming)

**Problem:** Climbing n stairs, can take 1 or 2 steps. How many distinct ways?

```javascript
/**
 * Time: O(n), Space: O(1)
 */
function climbStairs(n) {
  if (n <= 2) return n;
  
  let prev2 = 1; // n=1
  let prev1 = 2; // n=2
  
  for (let i = 3; i <= n; i++) {
    const current = prev1 + prev2;
    prev2 = prev1;
    prev1 = current;
  }
  
  return prev1;
}

// It's actually Fibonacci!
// n=1: 1 way
// n=2: 2 ways
// n=3: 3 ways (1+1+1, 1+2, 2+1)
// n=4: 5 ways
```

### 9.3. Contains Duplicate

**Problem:** Return true if any value appears twice.

```javascript
/**
 * Time: O(n), Space: O(n)
 */
function containsDuplicate(nums) {
  const seen = new Set();
  
  for (let num of nums) {
    if (seen.has(num)) {
      return true;
    }
    seen.add(num);
  }
  
  return false;
}

// Alternative: Set size check
function containsDuplicateShort(nums) {
  return new Set(nums).size !== nums.length;
}
```

### 9.4. Move Zeroes

**Problem:** Move all 0's to end, maintain order of non-zero elements.

```javascript
/**
 * Time: O(n), Space: O(1)
 */
function moveZeroes(nums) {
  let writePos = 0;
  
  // Move all non-zero elements to front
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] !== 0) {
      nums[writePos] = nums[i];
      writePos++;
    }
  }
  
  // Fill rest with zeros
  while (writePos < nums.length) {
    nums[writePos] = 0;
    writePos++;
  }
  
  return nums;
}

// Example: [0,1,0,3,12] → [1,3,12,0,0]
```

---

## 📊 Complexity Cheat Sheet

| Problem | Time | Space | Technique |
|---------|------|-------|-----------|
| Two Sum | O(n) | O(n) | Hash Map |
| Longest Substring | O(n) | O(min(n,m)) | Sliding Window |
| Reverse List | O(n) | O(1) | Two Pointers |
| Detect Cycle | O(n) | O(1) | Floyd's Algorithm |
| Valid Parentheses | O(n) | O(n) | Stack |
| Binary Search | O(log n) | O(1) | Divide & Conquer |
| Merge Intervals | O(n log n) | O(n) | Sorting |
| Tree Traversal | O(n) | O(h) | Recursion/Stack |

---

## 🎯 Interview Tips

1. **Clarify Requirements**
   - Ask about input size
   - Edge cases
   - Can I modify input?
   - Time/space constraints

2. **Think Out Loud**
   - Explain your approach
   - Discuss trade-offs
   - Mention alternatives

3. **Start Simple**
   - Brute force first
   - Then optimize
   - Code working solution before perfect one

4. **Test Your Code**
   - Walk through with example
   - Consider edge cases
   - Fix bugs systematically

5. **Analyze Complexity**
   - Always state time & space
   - Both worst and average case

---

## 🚀 Next Steps

1. Practice these problems on:
   - LeetCode
   - HackerRank
   - CodeSignal

2. Master patterns:
   - Sliding Window
   - Two Pointers
   - Fast & Slow Pointers
   - Hash Maps
   - Stack/Queue
   - DFS/BFS
   - Dynamic Programming basics

3. Focus on understanding WHY solutions work, not just memorizing code!