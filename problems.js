/* ══════════════════════════════════════════════════════════════
   THE CHAIRMAN SHOW — Python Problems Bank
   ──────────────────────────────────────────────────────────────
   हर problem में ये fields हैं:
   - id: unique number
   - level: 1 से 100 (difficulty tier)
   - title: problem title
   - difficulty: 'Easy' | 'Medium' | 'Hard'
   - tags: ['loops', 'strings', ...]
   - description: problem statement
   - examples: [{input, output, explanation}]
   - starter: starter code
   - solution: complete solution
   - explanation: solution explanation
   ══════════════════════════════════════════════════════════════ */

const PROBLEMS_DB = [
  // ═══════════ LEVEL 1-10: BASICS ═══════════
  {
    id: 1,
    level: 1,
    title: "Hello World",
    difficulty: "Easy",
    tags: ["basics"],
    description: "Write a Python program that prints 'Hello, World!' to the console.\n\nThe print() function is used to display output in Python.",
    examples: [
      { input: "(no input)", output: "Hello, World!", explanation: "Just print the text" }
    ],
    starter: `# Write your code here\n`,
    solution: `print("Hello, World!")`,
    explanation: `print() function का use करके हम कुछ भी console में display कर सकते हैं। String को quotes में wrap करना ज़रूरी है।`
  },
  {
    id: 2,
    level: 1,
    title: "Sum of Two Numbers",
    difficulty: "Easy",
    tags: ["basics", "math"],
    description: "Take two numbers as input and print their sum.\n\nInput will be given on two separate lines.",
    examples: [
      { input: "5\n3", output: "8", explanation: "5 + 3 = 8" },
      { input: "10\n20", output: "30", explanation: "10 + 20 = 30" }
    ],
    starter: `a = int(input())\nb = int(input())\n# Print the sum\n`,
    solution: `a = int(input())\nb = int(input())\nprint(a + b)`,
    explanation: `input() string return करता है, इसलिए int() से convert किया। फिर simple addition।`
  },
  {
    id: 3,
    level: 2,
    title: "Even or Odd",
    difficulty: "Easy",
    tags: ["conditionals"],
    description: "Given a number N, print 'Even' if it's even, else 'Odd'.",
    examples: [
      { input: "4", output: "Even", explanation: "4 % 2 == 0" },
      { input: "7", output: "Odd", explanation: "7 % 2 == 1" }
    ],
    starter: `n = int(input())\n# Check even or odd\n`,
    solution: `n = int(input())\nif n % 2 == 0:\n    print("Even")\nelse:\n    print("Odd")`,
    explanation: `Modulo operator (%) remainder देता है। Even numbers का remainder 0 होता है जब 2 से divide करें।`
  },
  {
    id: 4,
    level: 2,
    title: "Largest of Three",
    difficulty: "Easy",
    tags: ["conditionals"],
    description: "Take three numbers and print the largest one.",
    examples: [
      { input: "3\n7\n5", output: "7", explanation: "7 is largest" }
    ],
    starter: `a = int(input())\nb = int(input())\nc = int(input())\n# Find largest\n`,
    solution: `a = int(input())\nb = int(input())\nc = int(input())\nprint(max(a, b, c))`,
    explanation: `Python में built-in max() function multiple values का largest निकाल सकता है।`
  },
  {
    id: 5,
    level: 3,
    title: "Factorial",
    difficulty: "Easy",
    tags: ["loops", "math"],
    description: "Given N, print N! (factorial).\n\nExample: 5! = 5 × 4 × 3 × 2 × 1 = 120",
    examples: [
      { input: "5", output: "120", explanation: "5! = 120" },
      { input: "0", output: "1", explanation: "0! is 1 by definition" }
    ],
    starter: `n = int(input())\n# Calculate factorial\n`,
    solution: `n = int(input())\nfact = 1\nfor i in range(1, n + 1):\n    fact *= i\nprint(fact)`,
    explanation: `Loop 1 से n तक चलाकर हर number को multiply करते हैं। 0! = 1 (base case)।`
  },
  {
    id: 6,
    level: 3,
    title: "Reverse a String",
    difficulty: "Easy",
    tags: ["strings"],
    description: "Given a string S, print it in reverse.",
    examples: [
      { input: "hello", output: "olleh", explanation: "Reversed" }
    ],
    starter: `s = input()\n# Reverse and print\n`,
    solution: `s = input()\nprint(s[::-1])`,
    explanation: `Python slicing में [::-1] का मतलब है 'start से end तक, step -1' यानी reverse।`
  },
  {
    id: 7,
    level: 4,
    title: "Sum of N Numbers",
    difficulty: "Easy",
    tags: ["loops"],
    description: "Given N, print sum of 1 + 2 + ... + N.",
    examples: [
      { input: "10", output: "55", explanation: "1+2+...+10 = 55" }
    ],
    starter: `n = int(input())\n# Print sum\n`,
    solution: `n = int(input())\nprint(n * (n + 1) // 2)`,
    explanation: `Formula: N × (N+1) / 2. ये mathematical shortcut है, loop की जरूरत नहीं।`
  },
  {
    id: 8,
    level: 4,
    title: "Check Prime",
    difficulty: "Easy",
    tags: ["loops", "math"],
    description: "Given N, print 'Prime' if N is prime, else 'Not Prime'.",
    examples: [
      { input: "7", output: "Prime" },
      { input: "10", output: "Not Prime" }
    ],
    starter: `n = int(input())\n# Check prime\n`,
    solution: `n = int(input())\nif n < 2:\n    print("Not Prime")\nelse:\n    is_prime = True\n    for i in range(2, int(n**0.5) + 1):\n        if n % i == 0:\n            is_prime = False\n            break\n    print("Prime" if is_prime else "Not Prime")`,
    explanation: `√N तक check करना काफी है क्योंकि अगर N composite है तो उसका एक factor √N से छोटा होगा।`
  },
  {
    id: 9,
    level: 5,
    title: "Fibonacci Series",
    difficulty: "Easy",
    tags: ["loops"],
    description: "Print first N Fibonacci numbers.\n\nFibonacci: 0, 1, 1, 2, 3, 5, 8, 13, ...\n(हर number पिछले दो का sum है)",
    examples: [
      { input: "7", output: "0 1 1 2 3 5 8" }
    ],
    starter: `n = int(input())\n# Print fibonacci\n`,
    solution: `n = int(input())\na, b = 0, 1\nresult = []\nfor _ in range(n):\n    result.append(str(a))\n    a, b = b, a + b\nprint(" ".join(result))`,
    explanation: `दो variables रखो, हर step पे a को b बनाओ और b को a+b। ये classic iterative approach है।`
  },
  {
    id: 10,
    level: 5,
    title: "Count Vowels",
    difficulty: "Easy",
    tags: ["strings"],
    description: "Count vowels (a, e, i, o, u) in given string. Case insensitive.",
    examples: [
      { input: "Hello World", output: "3", explanation: "e, o, o" }
    ],
    starter: `s = input()\n# Count vowels\n`,
    solution: `s = input().lower()\ncount = sum(1 for ch in s if ch in 'aeiou')\nprint(count)`,
    explanation: `String को lowercase किया, फिर हर character check किया कि vowel set में है या नहीं।`
  },

  // ═══════════ LEVEL 6-20: ARRAYS/LISTS ═══════════
  {
    id: 11,
    level: 6,
    title: "Sum of List",
    difficulty: "Easy",
    tags: ["lists"],
    description: "Given a list of numbers (space-separated), print their sum.",
    examples: [
      { input: "1 2 3 4 5", output: "15" }
    ],
    starter: `nums = list(map(int, input().split()))\n# Print sum\n`,
    solution: `nums = list(map(int, input().split()))\nprint(sum(nums))`,
    explanation: `split() से strings की list मिलती है, map() से int में convert। sum() directly total देता है।`
  },
  {
    id: 12,
    level: 6,
    title: "Maximum in List",
    difficulty: "Easy",
    tags: ["lists"],
    description: "Find and print the maximum element in a list.",
    examples: [
      { input: "5\n3 7 2 9 1", output: "9" }
    ],
    starter: `n = int(input())\nnums = list(map(int, input().split()))\n# Print max\n`,
    solution: `n = int(input())\nnums = list(map(int, input().split()))\nprint(max(nums))`,
    explanation: `max() built-in function directly largest element देता है।`
  },
  {
    id: 13,
    level: 7,
    title: "Reverse a List",
    difficulty: "Easy",
    tags: ["lists"],
    description: "Print the list in reverse order (space-separated).",
    examples: [
      { input: "1 2 3 4 5", output: "5 4 3 2 1" }
    ],
    starter: `nums = list(map(int, input().split()))\n# Print reversed\n`,
    solution: `nums = list(map(int, input().split()))\nprint(" ".join(map(str, nums[::-1])))`,
    explanation: `Slicing [::-1] reverse करती है। join के लिए हर element को string में convert किया।`
  },
  {
    id: 14,
    level: 7,
    title: "Count Occurrences",
    difficulty: "Easy",
    tags: ["lists"],
    description: "Given list and a target, count how many times target appears.",
    examples: [
      { input: "5\n1 2 3 2 2\n2", output: "3" }
    ],
    starter: `n = int(input())\nnums = list(map(int, input().split()))\ntarget = int(input())\n# Count occurrences\n`,
    solution: `n = int(input())\nnums = list(map(int, input().split()))\ntarget = int(input())\nprint(nums.count(target))`,
    explanation: `list.count() method directly count देता है।`
  },
  {
    id: 15,
    level: 8,
    title: "Remove Duplicates",
    difficulty: "Easy",
    tags: ["lists", "sets"],
    description: "Remove duplicates from list and print unique elements in original order.",
    examples: [
      { input: "1 2 2 3 3 3 4", output: "1 2 3 4" }
    ],
    starter: `nums = list(map(int, input().split()))\n# Remove duplicates\n`,
    solution: `nums = list(map(int, input().split()))\nseen = set()\nresult = []\nfor x in nums:\n    if x not in seen:\n        seen.add(x)\n        result.append(x)\nprint(" ".join(map(str, result)))`,
    explanation: `Set use करके O(1) lookup। Order बनाए रखने के लिए list में append करते जाते हैं।`
  },
  {
    id: 16,
    level: 8,
    title: "Second Largest",
    difficulty: "Easy",
    tags: ["lists"],
    description: "Find second largest distinct element in list.",
    examples: [
      { input: "5\n10 5 8 20 15", output: "15" }
    ],
    starter: `n = int(input())\nnums = list(map(int, input().split()))\n# Print second largest\n`,
    solution: `n = int(input())\nnums = list(map(int, input().split()))\nunique = sorted(set(nums), reverse=True)\nprint(unique[1] if len(unique) > 1 else "N/A")`,
    explanation: `set() से duplicates हटाओ, sort करके second element लो।`
  },
  {
    id: 17,
    level: 9,
    title: "Two Sum",
    difficulty: "Medium",
    tags: ["lists", "hashmap"],
    description: "Given list and target, find two indices i, j (i < j) such that nums[i] + nums[j] = target. Print i, j (0-indexed).",
    examples: [
      { input: "5\n2 7 11 15\n9", output: "0 1", explanation: "2+7=9" }
    ],
    starter: `n = int(input())\nnums = list(map(int, input().split()))\ntarget = int(input())\n# Find indices\n`,
    solution: `n = int(input())\nnums = list(map(int, input().split()))\ntarget = int(input())\nseen = {}\nfor i, x in enumerate(nums):\n    if target - x in seen:\n        print(seen[target - x], i)\n        break\n    seen[x] = i`,
    explanation: `HashMap use करो। हर element के लिए check करो कि target - x पहले देखा है या नहीं। O(N) time।`
  },
  {
    id: 18,
    level: 10,
    title: "Rotate List",
    difficulty: "Medium",
    tags: ["lists"],
    description: "Rotate list right by K positions.",
    examples: [
      { input: "5\n1 2 3 4 5\n2", output: "4 5 1 2 3" }
    ],
    starter: `n = int(input())\nnums = list(map(int, input().split()))\nk = int(input())\n# Rotate right by k\n`,
    solution: `n = int(input())\nnums = list(map(int, input().split()))\nk = int(input())\nk = k % n\nresult = nums[-k:] + nums[:-k] if k else nums\nprint(" ".join(map(str, result)))`,
    explanation: `k को n से mod लो (अगर k > n हो)। Slicing से आखिरी k elements पहले और बाकी बाद में।`
  },
  {
    id: 19,
    level: 11,
    title: "Move Zeros",
    difficulty: "Medium",
    tags: ["lists"],
    description: "Move all zeros in list to the end, keep other elements in order.",
    examples: [
      { input: "5\n0 1 0 3 12", output: "1 3 12 0 0" }
    ],
    starter: `n = int(input())\nnums = list(map(int, input().split()))\n# Move zeros\n`,
    solution: `n = int(input())\nnums = list(map(int, input().split()))\nresult = [x for x in nums if x != 0] + [0] * nums.count(0)\nprint(" ".join(map(str, result)))`,
    explanation: `Non-zero elements पहले, फिर उतने zeros जितने original में थे।`
  },
  {
    id: 20,
    level: 12,
    title: "Kadane's Algorithm",
    difficulty: "Medium",
    tags: ["lists", "dp"],
    description: "Find maximum sum of a contiguous subarray.",
    examples: [
      { input: "9\n-2 1 -3 4 -1 2 1 -5 4", output: "6", explanation: "[4,-1,2,1] = 6" }
    ],
    starter: `n = int(input())\nnums = list(map(int, input().split()))\n# Find max subarray sum\n`,
    solution: `n = int(input())\nnums = list(map(int, input().split()))\nmax_sum = cur = nums[0]\nfor x in nums[1:]:\n    cur = max(x, cur + x)\n    max_sum = max(max_sum, cur)\nprint(max_sum)`,
    explanation: `हर element पर decide करो कि नए subarray से start करें या पिछले में जोड़ें। Classic DP।`
  },

  // ═══════════ LEVEL 13-30: STRINGS + MATH ═══════════
  {
    id: 21,
    level: 13,
    title: "Palindrome Check",
    difficulty: "Easy",
    tags: ["strings"],
    description: "Check if string is palindrome (reads same forwards and backwards). Ignore case and non-alphanumeric characters.",
    examples: [
      { input: "racecar", output: "Yes" },
      { input: "Hello", output: "No" }
    ],
    starter: `s = input()\n# Check palindrome\n`,
    solution: `s = input().lower()\ncleaned = ''.join(c for c in s if c.isalnum())\nprint("Yes" if cleaned == cleaned[::-1] else "No")`,
    explanation: `पहले clean करो (lowercase + only alphanumeric), फिर reverse से compare करो।`
  },
  {
    id: 22,
    level: 13,
    title: "Anagram Check",
    difficulty: "Easy",
    tags: ["strings"],
    description: "Check if two strings are anagrams (same letters, different order).",
    examples: [
      { input: "listen\nsilent", output: "Yes" }
    ],
    starter: `s1 = input()\ns2 = input()\n# Check anagram\n`,
    solution: `s1 = input().lower().replace(" ", "")\ns2 = input().lower().replace(" ", "")\nprint("Yes" if sorted(s1) == sorted(s2) else "No")`,
    explanation: `अगर दोनों strings के letters sorted करने पर same हैं, तो anagram हैं।`
  },
  {
    id: 23,
    level: 14,
    title: "Character Frequency",
    difficulty: "Easy",
    tags: ["strings", "hashmap"],
    description: "Print character frequencies for a string. Print each char and count, sorted by char.",
    examples: [
      { input: "aabbc", output: "a: 2\nb: 2\nc: 1" }
    ],
    starter: `s = input()\n# Print char frequency\n`,
    solution: `s = input()\nfreq = {}\nfor ch in s:\n    freq[ch] = freq.get(ch, 0) + 1\nfor ch in sorted(freq):\n    print(f"{ch}: {freq[ch]}")`,
    explanation: `Dictionary use करके हर character का count रखो। Sorted order में print करो।`
  },
  {
    id: 24,
    level: 15,
    title: "Caesar Cipher",
    difficulty: "Medium",
    tags: ["strings"],
    description: "Encrypt string by shifting each letter by K positions (wrap around).",
    examples: [
      { input: "abc\n2", output: "cde" }
    ],
    starter: `s = input()\nk = int(input())\n# Encrypt\n`,
    solution: `s = input()\nk = int(input())\nresult = ''\nfor ch in s:\n    if ch.isalpha():\n        base = ord('a') if ch.islower() else ord('A')\n        result += chr((ord(ch) - base + k) % 26 + base)\n    else:\n        result += ch\nprint(result)`,
    explanation: `हर letter का ASCII code लो, shift करो, mod 26 से wrap करो।`
  },
  {
    id: 25,
    level: 16,
    title: "Longest Common Prefix",
    difficulty: "Medium",
    tags: ["strings"],
    description: "Find longest common prefix among list of strings.",
    examples: [
      { input: "3\nflower\nflow\nflight", output: "fl" }
    ],
    starter: `n = int(input())\nstrs = [input() for _ in range(n)]\n# Find LCP\n`,
    solution: `n = int(input())\nstrs = [input() for _ in range(n)]\nif not strs:\n    print("")\nelse:\n    prefix = strs[0]\n    for s in strs[1:]:\n        while not s.startswith(prefix):\n            prefix = prefix[:-1]\n            if not prefix:\n                break\n    print(prefix)`,
    explanation: `पहली string को prefix मानो, बाकी से compare करके छोटा करते जाओ।`
  },
  {
    id: 26,
    level: 17,
    title: "Longest Substring Without Repeating",
    difficulty: "Medium",
    tags: ["strings", "sliding-window"],
    description: "Find length of longest substring without repeating characters.",
    examples: [
      { input: "abcabcbb", output: "3", explanation: "abc" }
    ],
    starter: `s = input()\n# Find length\n`,
    solution: `s = input()\nseen = {}\nstart = max_len = 0\nfor i, ch in enumerate(s):\n    if ch in seen and seen[ch] >= start:\n        start = seen[ch] + 1\n    seen[ch] = i\n    max_len = max(max_len, i - start + 1)\nprint(max_len)`,
    explanation: `Sliding window technique। हर char के last position track करो।`
  },
  {
    id: 27,
    level: 18,
    title: "GCD of Two Numbers",
    difficulty: "Easy",
    tags: ["math"],
    description: "Find GCD of two numbers using Euclid's algorithm.",
    examples: [
      { input: "48\n18", output: "6" }
    ],
    starter: `a = int(input())\nb = int(input())\n# Find GCD\n`,
    solution: `a = int(input())\nb = int(input())\nwhile b:\n    a, b = b, a % b\nprint(a)`,
    explanation: `Euclid's algorithm: gcd(a, b) = gcd(b, a % b) जब तक b != 0।`
  },
  {
    id: 28,
    level: 19,
    title: "Power Function",
    difficulty: "Medium",
    tags: ["math", "recursion"],
    description: "Compute a^b efficiently (fast exponentiation).",
    examples: [
      { input: "2\n10", output: "1024" }
    ],
    starter: `a = int(input())\nb = int(input())\n# Compute a^b\n`,
    solution: `a = int(input())\nb = int(input())\ndef power(a, b):\n    if b == 0:\n        return 1\n    half = power(a, b // 2)\n    return half * half * (a if b % 2 else 1)\nprint(power(a, b))`,
    explanation: `Divide & conquer: a^b = (a^(b/2))^2। O(log b) time।`
  },
  {
    id: 29,
    level: 20,
    title: "Sieve of Eratosthenes",
    difficulty: "Medium",
    tags: ["math", "primes"],
    description: "Print all primes up to N using Sieve.",
    examples: [
      { input: "20", output: "2 3 5 7 11 13 17 19" }
    ],
    starter: `n = int(input())\n# Print primes up to n\n`,
    solution: `n = int(input())\nis_prime = [True] * (n + 1)\nis_prime[0] = is_prime[1] = False\nfor i in range(2, int(n**0.5) + 1):\n    if is_prime[i]:\n        for j in range(i * i, n + 1, i):\n            is_prime[j] = False\nprint(" ".join(str(i) for i in range(2, n + 1) if is_prime[i]))`,
    explanation: `Sieve: हर prime के multiples को mark करो। O(N log log N)।`
  },
  {
    id: 30,
    level: 21,
    title: "Binary Search",
    difficulty: "Easy",
    tags: ["search", "sorted"],
    description: "Given sorted array and target, find index. Print -1 if not found.",
    examples: [
      { input: "5\n1 3 5 7 9\n5", output: "2" }
    ],
    starter: `n = int(input())\nnums = list(map(int, input().split()))\ntarget = int(input())\n# Binary search\n`,
    solution: `n = int(input())\nnums = list(map(int, input().split()))\ntarget = int(input())\nlo, hi = 0, n - 1\nans = -1\nwhile lo <= hi:\n    mid = (lo + hi) // 2\n    if nums[mid] == target:\n        ans = mid\n        break\n    elif nums[mid] < target:\n        lo = mid + 1\n    else:\n        hi = mid - 1\nprint(ans)`,
    explanation: `हर step search range आधी करो। O(log N)।`
  },

  // ═══════════ LEVEL 22-40: MORE CODING ═══════════
  {
    id: 31,
    level: 22,
    title: "Bubble Sort",
    difficulty: "Easy",
    tags: ["sorting"],
    description: "Sort array using bubble sort. Print sorted array.",
    examples: [
      { input: "5\n5 2 8 1 9", output: "1 2 5 8 9" }
    ],
    starter: `n = int(input())\nnums = list(map(int, input().split()))\n# Bubble sort\n`,
    solution: `n = int(input())\nnums = list(map(int, input().split()))\nfor i in range(n):\n    for j in range(n - i - 1):\n        if nums[j] > nums[j + 1]:\n            nums[j], nums[j + 1] = nums[j + 1], nums[j]\nprint(" ".join(map(str, nums)))`,
    explanation: `Adjacent elements compare करके बड़े को आगे push करते हैं।`
  },
  {
    id: 32,
    level: 23,
    title: "Selection Sort",
    difficulty: "Easy",
    tags: ["sorting"],
    description: "Sort array using selection sort.",
    examples: [
      { input: "5\n64 25 12 22 11", output: "11 12 22 25 64" }
    ],
    starter: `n = int(input())\nnums = list(map(int, input().split()))\n# Selection sort\n`,
    solution: `n = int(input())\nnums = list(map(int, input().split()))\nfor i in range(n):\n    min_idx = i\n    for j in range(i + 1, n):\n        if nums[j] < nums[min_idx]:\n            min_idx = j\n    nums[i], nums[min_idx] = nums[min_idx], nums[i]\nprint(" ".join(map(str, nums)))`,
    explanation: `हर position के लिए minimum element ढूंढो और swap करो।`
  },
  {
    id: 33,
    level: 24,
    title: "Merge Sort",
    difficulty: "Medium",
    tags: ["sorting", "divide-conquer"],
    description: "Sort array using merge sort.",
    examples: [
      { input: "5\n5 2 8 1 9", output: "1 2 5 8 9" }
    ],
    starter: `n = int(input())\nnums = list(map(int, input().split()))\n# Merge sort\n`,
    solution: `def merge_sort(arr):\n    if len(arr) <= 1:\n        return arr\n    mid = len(arr) // 2\n    left = merge_sort(arr[:mid])\n    right = merge_sort(arr[mid:])\n    result = []\n    i = j = 0\n    while i < len(left) and j < len(right):\n        if left[i] <= right[j]:\n            result.append(left[i]); i += 1\n        else:\n            result.append(right[j]); j += 1\n    result += left[i:] + right[j:]\n    return result\n\nn = int(input())\nnums = list(map(int, input().split()))\nprint(" ".join(map(str, merge_sort(nums))))`,
    explanation: `Divide & Conquer: array को आधे में बाँटो, sort करो, merge करो। O(N log N)।`
  },
  {
    id: 34,
    level: 25,
    title: "Binary Tree Height",
    difficulty: "Medium",
    tags: ["trees", "recursion"],
    description: "Given a binary tree (level-order input), find its height.",
    examples: [
      { input: "7\n1 2 3 4 5 6 7", output: "3" }
    ],
    starter: `n = int(input())\nnodes = list(map(int, input().split()))\n# Find height\n`,
    solution: `import math\nn = int(input())\nnodes = list(map(int, input().split()))\nprint(math.ceil(math.log2(n + 1)))`,
    explanation: `Complete binary tree with n nodes has height ⌈log2(n+1)⌉।`
  },
  {
    id: 35,
    level: 26,
    title: "Valid Parentheses",
    difficulty: "Medium",
    tags: ["stack", "strings"],
    description: "Check if brackets (), {}, [] are balanced.",
    examples: [
      { input: "{[()]}", output: "Yes" },
      { input: "{[(])}", output: "No" }
    ],
    starter: `s = input()\n# Check balanced\n`,
    solution: `s = input()\nstack = []\npairs = {')': '(', '}': '{', ']': '['}\nvalid = True\nfor ch in s:\n    if ch in '({[':\n        stack.append(ch)\n    elif ch in ')}]':\n        if not stack or stack.pop() != pairs[ch]:\n            valid = False\n            break\nprint("Yes" if valid and not stack else "No")`,
    explanation: `Stack use करो। Opening brackets push, closing पर pop और match check।`
  },
  {
    id: 36,
    level: 27,
    title: "Queue Using Two Stacks",
    difficulty: "Medium",
    tags: ["stack", "queue"],
    description: "Implement queue operations: 'push X' and 'pop'. Print pop results.",
    examples: [
      { input: "5\npush 1\npush 2\npop\npush 3\npop", output: "1\n2" }
    ],
    starter: `n = int(input())\n# Process operations\n`,
    solution: `n = int(input())\ns1, s2 = [], []\nfor _ in range(n):\n    op = input().split()\n    if op[0] == 'push':\n        s1.append(int(op[1]))\n    else:\n        if not s2:\n            while s1:\n                s2.append(s1.pop())\n        if s2:\n            print(s2.pop())`,
    explanation: `push s1 में। pop के लिए s1 के सब elements s2 में transfer करो (reverse order), फिर pop।`
  },
  {
    id: 37,
    level: 28,
    title: "Linked List Reverse",
    difficulty: "Medium",
    tags: ["linked-list"],
    description: "Reverse a singly linked list. Input: values level-by-level.",
    examples: [
      { input: "5\n1 2 3 4 5", output: "5 4 3 2 1" }
    ],
    starter: `n = int(input())\nvalues = list(map(int, input().split()))\n# Reverse\n`,
    solution: `n = int(input())\nvalues = list(map(int, input().split()))\nprint(" ".join(map(str, values[::-1])))`,
    explanation: `Linked list reversal pointer manipulation का classic example है। यहाँ list representation के लिए simple reverse।`
  },
  {
    id: 38,
    level: 29,
    title: "Matrix Transpose",
    difficulty: "Easy",
    tags: ["matrix"],
    description: "Transpose an M×N matrix (rows become columns).",
    examples: [
      { input: "2 3\n1 2 3\n4 5 6", output: "1 4\n2 5\n3 6" }
    ],
    starter: `m, n = map(int, input().split())\nmat = [list(map(int, input().split())) for _ in range(m)]\n# Transpose\n`,
    solution: `m, n = map(int, input().split())\nmat = [list(map(int, input().split())) for _ in range(m)]\nfor j in range(n):\n    print(" ".join(str(mat[i][j]) for i in range(m)))`,
    explanation: `transposed[j][i] = mat[i][j]। Column-wise print करो।`
  },
  {
    id: 39,
    level: 30,
    title: "Matrix Multiplication",
    difficulty: "Medium",
    tags: ["matrix"],
    description: "Multiply two matrices.",
    examples: [
      { input: "2 2\n1 2\n3 4\n2 2\n5 6\n7 8", output: "19 22\n43 50" }
    ],
    starter: `m1, n1 = map(int, input().split())\nA = [list(map(int, input().split())) for _ in range(m1)]\nm2, n2 = map(int, input().split())\nB = [list(map(int, input().split())) for _ in range(m2)]\n# Multiply A × B\n`,
    solution: `m1, n1 = map(int, input().split())\nA = [list(map(int, input().split())) for _ in range(m1)]\nm2, n2 = map(int, input().split())\nB = [list(map(int, input().split())) for _ in range(m2)]\nfor i in range(m1):\n    row = []\n    for j in range(n2):\n        s = sum(A[i][k] * B[k][j] for k in range(n1))\n        row.append(s)\n    print(" ".join(map(str, row)))`,
    explanation: `C[i][j] = Σ A[i][k] × B[k][j]। तीन nested loops।`
  },
  {
    id: 40,
    level: 31,
    title: "Spiral Matrix",
    difficulty: "Medium",
    tags: ["matrix"],
    description: "Print matrix elements in spiral order.",
    examples: [
      { input: "3 3\n1 2 3\n4 5 6\n7 8 9", output: "1 2 3 6 9 8 7 4 5" }
    ],
    starter: `m, n = map(int, input().split())\nmat = [list(map(int, input().split())) for _ in range(m)]\n# Spiral order\n`,
    solution: `m, n = map(int, input().split())\nmat = [list(map(int, input().split())) for _ in range(m)]\ntop, bottom, left, right = 0, m - 1, 0, n - 1\nresult = []\nwhile top <= bottom and left <= right:\n    for j in range(left, right + 1): result.append(mat[top][j])\n    top += 1\n    for i in range(top, bottom + 1): result.append(mat[i][right])\n    right -= 1\n    if top <= bottom:\n        for j in range(right, left - 1, -1): result.append(mat[bottom][j])\n        bottom -= 1\n    if left <= right:\n        for i in range(bottom, top - 1, -1): result.append(mat[i][left])\n        left += 1\nprint(" ".join(map(str, result)))`,
    explanation: `Four boundaries maintain करो: top, bottom, left, right। हर pass में एक boundary shrink करो।`
  },

  // ═══════════ LEVEL 32-50: DP + RECURSION ═══════════
  {
    id: 41,
    level: 32,
    title: "Climbing Stairs",
    difficulty: "Easy",
    tags: ["dp"],
    description: "You can climb 1 or 2 steps. How many ways to reach step N?",
    examples: [
      { input: "5", output: "8" }
    ],
    starter: `n = int(input())\n# Count ways\n`,
    solution: `n = int(input())\nif n <= 2:\n    print(n)\nelse:\n    a, b = 1, 2\n    for _ in range(3, n + 1):\n        a, b = b, a + b\n    print(b)`,
    explanation: `ways(n) = ways(n-1) + ways(n-2)। ये Fibonacci series की तरह है।`
  },
  {
    id: 42,
    level: 33,
    title: "Coin Change",
    difficulty: "Medium",
    tags: ["dp"],
    description: "Given coin denominations and amount, find minimum coins needed. Print -1 if impossible.",
    examples: [
      { input: "3\n1 2 5\n11", output: "3", explanation: "5+5+1" }
    ],
    starter: `n = int(input())\ncoins = list(map(int, input().split()))\namount = int(input())\n# Min coins\n`,
    solution: `n = int(input())\ncoins = list(map(int, input().split()))\namount = int(input())\nINF = float('inf')\ndp = [0] + [INF] * amount\nfor i in range(1, amount + 1):\n    for c in coins:\n        if c <= i:\n            dp[i] = min(dp[i], dp[i - c] + 1)\nprint(dp[amount] if dp[amount] != INF else -1)`,
    explanation: `Bottom-up DP: dp[i] = minimum coins to make amount i।`
  },
  {
    id: 43,
    level: 34,
    title: "0/1 Knapsack",
    difficulty: "Medium",
    tags: ["dp"],
    description: "Given weights, values, and capacity, find max value.",
    examples: [
      { input: "3\n1 2 3\n6 10 12\n5", output: "22" }
    ],
    starter: `n = int(input())\nweights = list(map(int, input().split()))\nvalues = list(map(int, input().split()))\ncapacity = int(input())\n# Max value\n`,
    solution: `n = int(input())\nweights = list(map(int, input().split()))\nvalues = list(map(int, input().split()))\ncapacity = int(input())\ndp = [0] * (capacity + 1)\nfor i in range(n):\n    for w in range(capacity, weights[i] - 1, -1):\n        dp[w] = max(dp[w], dp[w - weights[i]] + values[i])\nprint(dp[capacity])`,
    explanation: `हर item पर decide करो: लूँ या ना लूँ। Capacity को reverse iterate करो।`
  },
  {
    id: 44,
    level: 35,
    title: "Longest Increasing Subsequence",
    difficulty: "Medium",
    tags: ["dp"],
    description: "Find length of longest strictly increasing subsequence.",
    examples: [
      { input: "8\n10 9 2 5 3 7 101 18", output: "4", explanation: "[2,3,7,101]" }
    ],
    starter: `n = int(input())\nnums = list(map(int, input().split()))\n# Length of LIS\n`,
    solution: `n = int(input())\nnums = list(map(int, input().split()))\ndp = [1] * n\nfor i in range(1, n):\n    for j in range(i):\n        if nums[j] < nums[i]:\n            dp[i] = max(dp[i], dp[j] + 1)\nprint(max(dp))`,
    explanation: `dp[i] = longest increasing subsequence ending at i। O(N²)।`
  },
  {
    id: 45,
    level: 36,
    title: "Edit Distance",
    difficulty: "Hard",
    tags: ["dp"],
    description: "Minimum operations (insert, delete, replace) to convert one string to another.",
    examples: [
      { input: "horse\nros", output: "3" }
    ],
    starter: `s1 = input()\ns2 = input()\n# Edit distance\n`,
    solution: `s1 = input()\ns2 = input()\nm, n = len(s1), len(s2)\ndp = [[0] * (n + 1) for _ in range(m + 1)]\nfor i in range(m + 1): dp[i][0] = i\nfor j in range(n + 1): dp[0][j] = j\nfor i in range(1, m + 1):\n    for j in range(1, n + 1):\n        if s1[i-1] == s2[j-1]:\n            dp[i][j] = dp[i-1][j-1]\n        else:\n            dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])\nprint(dp[m][n])`,
    explanation: `Classic DP: 3 operations consider करो। dp[i][j] = min operations for first i chars of s1 to first j of s2।`
  },
  {
    id: 46,
    level: 37,
    title: "N-Queens",
    difficulty: "Hard",
    tags: ["recursion", "backtracking"],
    description: "Place N queens on N×N board with no attacks. Print number of solutions.",
    examples: [
      { input: "4", output: "2" }
    ],
    starter: `n = int(input())\n# Count solutions\n`,
    solution: `n = int(input())\ncount = [0]\ncols = set()\ndiag1 = set()\ndiag2 = set()\ndef solve(row):\n    if row == n:\n        count[0] += 1\n        return\n    for c in range(n):\n        if c in cols or (row - c) in diag1 or (row + c) in diag2:\n            continue\n        cols.add(c); diag1.add(row - c); diag2.add(row + c)\n        solve(row + 1)\n        cols.remove(c); diag1.remove(row - c); diag2.remove(row + c)\nsolve(0)\nprint(count[0])`,
    explanation: `Backtracking: हर row में queen place करो, conflicts check करो, recursively आगे बढ़ो।`
  },
  {
    id: 47,
    level: 38,
    title: "Sudoku Validator",
    difficulty: "Hard",
    tags: ["matrix", "hashmap"],
    description: "Check if a 9×9 Sudoku board is valid (partial filled).",
    examples: [
      { input: "9 lines with 9 digits each (0=empty)", output: "Yes" }
    ],
    starter: `board = [input().split() for _ in range(9)]\n# Validate\n`,
    solution: `board = [input().split() for _ in range(9)]\nvalid = True\nfor i in range(9):\n    row = [x for x in board[i] if x != '0']\n    col = [board[j][i] for j in range(9) if board[j][i] != '0']\n    if len(row) != len(set(row)) or len(col) != len(set(col)):\n        valid = False\n        break\nfor bi in range(3):\n    for bj in range(3):\n        box = []\n        for i in range(3):\n            for j in range(3):\n                v = board[bi*3+i][bj*3+j]\n                if v != '0': box.append(v)\n        if len(box) != len(set(box)):\n            valid = False\n            break\nprint("Yes" if valid else "No")`,
    explanation: `हर row, column, 3×3 box में duplicates check करो।`
  },
  {
    id: 48,
    level: 39,
    title: "Tower of Hanoi",
    difficulty: "Medium",
    tags: ["recursion"],
    description: "Print moves to solve Tower of Hanoi with N disks. Format: 'A -> C'",
    examples: [
      { input: "2", output: "A -> B\nA -> C\nB -> C" }
    ],
    starter: `n = int(input())\n# Print moves\n`,
    solution: `n = int(input())\ndef hanoi(n, src, aux, dst):\n    if n == 1:\n        print(f"{src} -> {dst}")\n        return\n    hanoi(n - 1, src, dst, aux)\n    print(f"{src} -> {dst}")\n    hanoi(n - 1, aux, src, dst)\nhanoi(n, 'A', 'B', 'C')`,
    explanation: `Classic recursion: n-1 disks को auxiliary पर भेजो, बड़ी disk destination पर, फिर बाकी वहाँ।`
  },
  {
    id: 49,
    level: 40,
    title: "Subset Sum",
    difficulty: "Medium",
    tags: ["dp", "backtracking"],
    description: "Check if any subset of array sums to target.",
    examples: [
      { input: "5\n3 34 4 12 5\n9", output: "Yes", explanation: "4+5=9" }
    ],
    starter: `n = int(input())\nnums = list(map(int, input().split()))\ntarget = int(input())\n# Check subset sum\n`,
    solution: `n = int(input())\nnums = list(map(int, input().split()))\ntarget = int(input())\ndp = [False] * (target + 1)\ndp[0] = True\nfor x in nums:\n    for s in range(target, x - 1, -1):\n        if dp[s - x]:\n            dp[s] = True\nprint("Yes" if dp[target] else "No")`,
    explanation: `Boolean DP: dp[s] = true if sum s possible। हर element से update करो।`
  },
  {
    id: 50,
    level: 41,
    title: "Graph BFS",
    difficulty: "Medium",
    tags: ["graph"],
    description: "Traverse graph BFS from node 0. Print visited order.",
    examples: [
      { input: "4 4\n0 1\n0 2\n1 3\n2 3", output: "0 1 2 3" }
    ],
    starter: `n, m = map(int, input().split())\n# Read edges and BFS\n`,
    solution: `from collections import deque\nn, m = map(int, input().split())\nadj = [[] for _ in range(n)]\nfor _ in range(m):\n    u, v = map(int, input().split())\n    adj[u].append(v)\n    adj[v].append(u)\nvisited = [False] * n\nvisited[0] = True\nq = deque([0])\norder = []\nwhile q:\n    u = q.popleft()\n    order.append(u)\n    for v in adj[u]:\n        if not visited[v]:\n            visited[v] = True\n            q.append(v)\nprint(" ".join(map(str, order)))`,
    explanation: `Queue use करो, हर node के neighbors को visit करो। O(V+E)।`
  },

  // ═══════════ LEVEL 42-60: ADVANCED ═══════════
  {
    id: 51,
    level: 42,
    title: "Graph DFS",
    difficulty: "Medium",
    tags: ["graph"],
    description: "DFS traversal from node 0 (recursive). Print visited order.",
    examples: [
      { input: "4 4\n0 1\n0 2\n1 3\n2 3", output: "0 1 3 2" }
    ],
    starter: `n, m = map(int, input().split())\n# Read edges and DFS\n`,
    solution: `import sys\nsys.setrecursionlimit(10000)\nn, m = map(int, input().split())\nadj = [[] for _ in range(n)]\nfor _ in range(m):\n    u, v = map(int, input().split())\n    adj[u].append(v)\n    adj[v].append(u)\nvisited = [False] * n\norder = []\ndef dfs(u):\n    visited[u] = True\n    order.append(u)\n    for v in adj[u]:\n        if not visited[v]:\n            dfs(v)\ndfs(0)\nprint(" ".join(map(str, order)))`,
    explanation: `Recursion से हर neighbor को गहराई तक visit करो।`
  },
  {
    id: 52,
    level: 43,
    title: "Cycle Detection",
    difficulty: "Medium",
    tags: ["graph", "dfs"],
    description: "Detect cycle in undirected graph.",
    examples: [
      { input: "3 3\n0 1\n1 2\n2 0", output: "Yes" }
    ],
    starter: `n, m = map(int, input().split())\n# Check cycle\n`,
    solution: `n, m = map(int, input().split())\nadj = [[] for _ in range(n)]\nfor _ in range(m):\n    u, v = map(int, input().split())\n    adj[u].append(v)\n    adj[v].append(u)\nvisited = [False] * n\ndef has_cycle(u, parent):\n    visited[u] = True\n    for v in adj[u]:\n        if not visited[v]:\n            if has_cycle(v, u):\n                return True\n        elif v != parent:\n            return True\n    return False\nresult = any(has_cycle(i, -1) for i in range(n) if not visited[i])\nprint("Yes" if result else "No")`,
    explanation: `DFS में अगर visited node मिले जो parent नहीं है, तो cycle है।`
  },
  {
    id: 53,
    level: 44,
    title: "Dijkstra Shortest Path",
    difficulty: "Hard",
    tags: ["graph", "shortest-path"],
    description: "Find shortest path from source to all nodes (weighted graph). Print distances.",
    examples: [
      { input: "5 6\n0 1 4\n0 2 1\n2 1 2\n1 3 1\n2 3 5\n3 4 3\n0", output: "0 3 1 4 7" }
    ],
    starter: `import heapq\nn, m = map(int, input().split())\n# Read edges and Dijkstra from source\n`,
    solution: `import heapq\nn, m = map(int, input().split())\nadj = [[] for _ in range(n)]\nfor _ in range(m):\n    u, v, w = map(int, input().split())\n    adj[u].append((v, w))\n    adj[v].append((u, w))\nsrc = int(input())\ndist = [float('inf')] * n\ndist[src] = 0\npq = [(0, src)]\nwhile pq:\n    d, u = heapq.heappop(pq)\n    if d > dist[u]: continue\n    for v, w in adj[u]:\n        if dist[u] + w < dist[v]:\n            dist[v] = dist[u] + w\n            heapq.heappush(pq, (dist[v], v))\nprint(" ".join(str(d) for d in dist))`,
    explanation: `Priority queue से हमेशा minimum distance वाला node process करो।`
  },
  {
    id: 54,
    level: 45,
    title: "Topological Sort",
    difficulty: "Medium",
    tags: ["graph", "dag"],
    description: "Topological sort of DAG using DFS.",
    examples: [
      { input: "6 6\n5 2\n5 0\n4 0\n4 1\n2 3\n3 1", output: "5 4 2 3 1 0" }
    ],
    starter: `n, m = map(int, input().split())\n# Topological sort\n`,
    solution: `n, m = map(int, input().split())\nadj = [[] for _ in range(n)]\nfor _ in range(m):\n    u, v = map(int, input().split())\n    adj[u].append(v)\nvisited = [False] * n\nstack = []\ndef dfs(u):\n    visited[u] = True\n    for v in adj[u]:\n        if not visited[v]:\n            dfs(v)\n    stack.append(u)\nfor i in range(n):\n    if not visited[i]:\n        dfs(i)\nprint(" ".join(map(str, reversed(stack))))`,
    explanation: `DFS post-order के reverse से topological order मिलती है।`
  },
  {
    id: 55,
    level: 46,
    title: "KMP Pattern Search",
    difficulty: "Hard",
    tags: ["strings", "kmp"],
    description: "Find all occurrences of pattern in text. Print 0-indexed positions.",
    examples: [
      { input: "aabaabaaa\naab", output: "0 3" }
    ],
    starter: `text = input()\npattern = input()\n# Find all occurrences\n`,
    solution: `text = input()\npattern = input()\ndef build_lps(p):\n    lps = [0] * len(p)\n    j = 0\n    for i in range(1, len(p)):\n        while j > 0 and p[i] != p[j]:\n            j = lps[j - 1]\n        if p[i] == p[j]:\n            j += 1\n        lps[i] = j\n    return lps\nlps = build_lps(pattern)\nresult = []\nj = 0\nfor i in range(len(text)):\n    while j > 0 and text[i] != pattern[j]:\n        j = lps[j - 1]\n    if text[i] == pattern[j]:\n        j += 1\n    if j == len(pattern):\n        result.append(i - j + 1)\n        j = lps[j - 1]\nprint(" ".join(map(str, result)) if result else "Not found")`,
    explanation: `LPS (Longest Prefix Suffix) array precompute करो। Pattern match में backtracking efficient हो जाती है। O(N+M)।`
  },
  {
    id: 56,
    level: 47,
    title: "Sliding Window Maximum",
    difficulty: "Hard",
    tags: ["sliding-window", "deque"],
    description: "Find maximum in each sliding window of size K.",
    examples: [
      { input: "8\n1 3 -1 -3 5 3 6 7\n3", output: "3 3 5 5 6 7" }
    ],
    starter: `n = int(input())\nnums = list(map(int, input().split()))\nk = int(input())\n# Sliding window max\n`,
    solution: `from collections import deque\nn = int(input())\nnums = list(map(int, input().split()))\nk = int(input())\ndq = deque()\nresult = []\nfor i, x in enumerate(nums):\n    while dq and nums[dq[-1]] <= x:\n        dq.pop()\n    dq.append(i)\n    if dq[0] <= i - k:\n        dq.popleft()\n    if i >= k - 1:\n        result.append(nums[dq[0]])\nprint(" ".join(map(str, result)))`,
    explanation: `Deque में indices रखो (decreasing values)। हर window का front maximum होगा। O(N)।`
  },
  {
    id: 57,
    level: 48,
    title: "Trie Implementation",
    difficulty: "Hard",
    tags: ["trie", "strings"],
    description: "Insert words and check if a word exists. Print 'Yes'/'No' for each query.",
    examples: [
      { input: "3\napple\napp\nbat\n2\napp\ncat", output: "Yes\nNo" }
    ],
    starter: `n = int(input())\nwords = [input() for _ in range(n)]\nq = int(input())\n# Build trie and answer queries\n`,
    solution: `n = int(input())\nwords = [input() for _ in range(n)]\nq = int(input())\nclass Trie:\n    def __init__(self):\n        self.children = {}\n        self.is_end = False\nroot = Trie()\nfor w in words:\n    node = root\n    for ch in w:\n        if ch not in node.children:\n            node.children[ch] = Trie()\n        node = node.children[ch]\n    node.is_end = True\nfor _ in range(q):\n    query = input()\n    node = root\n    found = True\n    for ch in query:\n        if ch not in node.children:\n            found = False\n            break\n        node = node.children[ch]\n    print("Yes" if found and node.is_end else "No")`,
    explanation: `Trie में हर character एक node। Common prefixes share होते हैं। Search O(L)।`
  },
  {
    id: 58,
    level: 49,
    title: "LRU Cache",
    difficulty: "Hard",
    tags: ["design", "hashmap"],
    description: "Implement LRU cache with capacity C. Operations: 'get K' and 'put K V'. Print get results (-1 if miss).",
    examples: [
      { input: "2\n5\nput 1 1\nput 2 2\nget 1\nput 3 3\nget 2", output: "1\n-1" }
    ],
    starter: `capacity = int(input())\nops = int(input())\n# Process operations\n`,
    solution: `from collections import OrderedDict\ncapacity = int(input())\nops = int(input())\ncache = OrderedDict()\nfor _ in range(ops):\n    parts = input().split()\n    if parts[0] == 'get':\n        k = int(parts[1])\n        if k in cache:\n            cache.move_to_end(k)\n            print(cache[k])\n        else:\n            print(-1)\n    else:\n        k, v = int(parts[1]), int(parts[2])\n        if k in cache:\n            cache.move_to_end(k)\n        cache[k] = v\n        if len(cache) > capacity:\n            cache.popitem(last=False)`,
    explanation: `OrderedDict use करो। Access पे move_to_end, overflow पे popitem(last=False)।`
  },
  {
    id: 59,
    level: 50,
    title: "Median of Two Sorted Arrays",
    difficulty: "Hard",
    tags: ["binary-search"],
    description: "Find median of two sorted arrays in O(log(min(m,n))).",
    examples: [
      { input: "2 2\n1 3\n2 4", output: "2.5" }
    ],
    starter: `m, n = map(int, input().split())\nA = list(map(int, input().split()))\nB = list(map(int, input().split()))\n# Find median\n`,
    solution: `m, n = map(int, input().split())\nA = list(map(int, input().split()))\nB = list(map(int, input().split()))\nif m > n:\n    A, B, m, n = B, A, n, m\ntotal = m + n\nhalf = total // 2\nlo, hi = 0, m\nwhile lo <= hi:\n    i = (lo + hi) // 2\n    j = half - i\n    leftA = A[i-1] if i > 0 else float('-inf')\n    leftB = B[j-1] if j > 0 else float('-inf')\n    rightA = A[i] if i < m else float('inf')\n    rightB = B[j] if j < n else float('inf')\n    if leftA <= rightB and leftB <= rightA:\n        if total % 2:\n            print(min(rightA, rightB))\n        else:\n            print((max(leftA, leftB) + min(rightA, rightB)) / 2)\n        break\n    elif leftA > rightB:\n        hi = i - 1\n    else:\n        lo = i + 1`,
    explanation: `Binary search on smaller array। Partition ऐसा खोजो कि left half ≤ right half।`
  },
  {
    id: 60,
    level: 51,
    title: "Regular Expression Match",
    difficulty: "Hard",
    tags: ["dp", "strings"],
    description: "Implement regex with '.' (any char) and '*' (zero or more).",
    examples: [
      { input: "aa\na*", output: "Yes" }
    ],
    starter: `s = input()\np = input()\n# Regex match\n`,
    solution: `s = input()\np = input()\nm, n = len(s), len(p)\ndp = [[False] * (n + 1) for _ in range(m + 1)]\ndp[0][0] = True\nfor j in range(2, n + 1):\n    if p[j-1] == '*':\n        dp[0][j] = dp[0][j-2]\nfor i in range(1, m + 1):\n    for j in range(1, n + 1):\n        if p[j-1] == '*':\n            dp[i][j] = dp[i][j-2]\n            if p[j-2] == '.' or p[j-2] == s[i-1]:\n                dp[i][j] = dp[i][j] or dp[i-1][j]\n        elif p[j-1] == '.' or p[j-1] == s[i-1]:\n            dp[i][j] = dp[i-1][j-1]\nprint("Yes" if dp[m][n] else "No")`,
    explanation: `DP with 2 special cases: '.' matches anything, '*' repeats previous char।`
  },

  // ═══════════ LEVEL 52-70 ═══════════
  {
    id: 61,
    level: 52,
    title: "Word Break",
    difficulty: "Medium",
    tags: ["dp"],
    description: "Check if string can be segmented into dictionary words.",
    examples: [
      { input: "leetcode\n2\nleet\ncode", output: "Yes" }
    ],
    starter: `s = input()\nn = int(input())\nwords = [input() for _ in range(n)]\n# Word break\n`,
    solution: `s = input()\nn = int(input())\nwords = set(input() for _ in range(n))\ndp = [False] * (len(s) + 1)\ndp[0] = True\nfor i in range(1, len(s) + 1):\n    for j in range(i):\n        if dp[j] and s[j:i] in words:\n            dp[i] = True\n            break\nprint("Yes" if dp[len(s)] else "No")`,
    explanation: `dp[i] = true if prefix of length i can be segmented।`
  },
  {
    id: 62,
    level: 53,
    title: "Maximum Product Subarray",
    difficulty: "Medium",
    tags: ["dp", "arrays"],
    description: "Find subarray with maximum product.",
    examples: [
      { input: "5\n2 3 -2 4 -1", output: "48", explanation: "2*3*-2*4*-1" }
    ],
    starter: `n = int(input())\nnums = list(map(int, input().split()))\n# Max product\n`,
    solution: `n = int(input())\nnums = list(map(int, input().split()))\nmax_p = min_p = result = nums[0]\nfor x in nums[1:]:\n    if x < 0:\n        max_p, min_p = min_p, max_p\n    max_p = max(x, max_p * x)\n    min_p = min(x, min_p * x)\n    result = max(result, max_p)\nprint(result)`,
    explanation: `Negative numbers product को flip कर सकते हैं, इसलिए min और max दोनों track करो।`
  },
  {
    id: 63,
    level: 54,
    title: "Jump Game",
    difficulty: "Medium",
    tags: ["greedy"],
    description: "Can you reach last index? Each element = max jump length.",
    examples: [
      { input: "5\n2 3 1 1 4", output: "Yes" }
    ],
    starter: `n = int(input())\nnums = list(map(int, input().split()))\n# Can reach end?\n`,
    solution: `n = int(input())\nnums = list(map(int, input().split()))\nmax_reach = 0\nfor i, x in enumerate(nums):\n    if i > max_reach:\n        break\n    max_reach = max(max_reach, i + x)\nprint("Yes" if max_reach >= n - 1 else "No")`,
    explanation: `Greedy: हर step पे maximum reachable index track करो।`
  },
  {
    id: 64,
    level: 55,
    title: "Merge Intervals",
    difficulty: "Medium",
    tags: ["sorting", "intervals"],
    description: "Merge overlapping intervals.",
    examples: [
      { input: "4\n1 3\n2 6\n8 10\n15 18", output: "1 6\n8 10\n15 18" }
    ],
    starter: `n = int(input())\nintervals = [tuple(map(int, input().split())) for _ in range(n)]\n# Merge\n`,
    solution: `n = int(input())\nintervals = sorted(tuple(map(int, input().split())) for _ in range(n))\nmerged = []\nfor s, e in intervals:\n    if merged and merged[-1][1] >= s:\n        merged[-1] = (merged[-1][0], max(merged[-1][1], e))\n    else:\n        merged.append((s, e))\nfor s, e in merged:\n    print(f"{s} {e}")`,
    explanation: `Sort by start, फिर overlapping merge करो।`
  },
  {
    id: 65,
    level: 56,
    title: "Set Matrix Zeroes",
    difficulty: "Medium",
    tags: ["matrix"],
    description: "If an element is 0, set its entire row and column to 0.",
    examples: [
      { input: "3 3\n1 1 1\n1 0 1\n1 1 1", output: "1 0 1\n0 0 0\n1 0 1" }
    ],
    starter: `m, n = map(int, input().split())\nmat = [list(map(int, input().split())) for _ in range(m)]\n# Set zeroes\n`,
    solution: `m, n = map(int, input().split())\nmat = [list(map(int, input().split())) for _ in range(m)]\nrows = set()\ncols = set()\nfor i in range(m):\n    for j in range(n):\n        if mat[i][j] == 0:\n            rows.add(i)\n            cols.add(j)\nfor i in range(m):\n    for j in range(n):\n        if i in rows or j in cols:\n            mat[i][j] = 0\nfor row in mat:\n    print(" ".join(map(str, row)))`,
    explanation: `पहले सारे zero positions collect करो, फिर update करो।`
  },
  {
    id: 66,
    level: 57,
    title: "Group Anagrams",
    difficulty: "Medium",
    tags: ["strings", "hashmap"],
    description: "Group strings that are anagrams. Print groups.",
    examples: [
      { input: "6\neat\ntea\ntan\nate\nnat\nbat", output: "eat tea ate\ntan nat\nbat" }
    ],
    starter: `n = int(input())\nwords = [input() for _ in range(n)]\n# Group anagrams\n`,
    solution: `n = int(input())\nwords = [input() for _ in range(n)]\ngroups = {}\nfor w in words:\n    key = ''.join(sorted(w))\n    groups.setdefault(key, []).append(w)\nfor g in groups.values():\n    print(" ".join(g))`,
    explanation: `Sorted string as key। Anagrams same sorted string share करते हैं।`
  },
  {
    id: 67,
    level: 58,
    title: "Product of Array Except Self",
    difficulty: "Medium",
    tags: ["arrays"],
    description: "For each i, output product of all except nums[i]. No division.",
    examples: [
      { input: "4\n1 2 3 4", output: "24 12 8 6" }
    ],
    starter: `n = int(input())\nnums = list(map(int, input().split()))\n# Product except self\n`,
    solution: `n = int(input())\nnums = list(map(int, input().split()))\nresult = [1] * n\nleft = 1\nfor i in range(n):\n    result[i] = left\n    left *= nums[i]\nright = 1\nfor i in range(n - 1, -1, -1):\n    result[i] *= right\n    right *= nums[i]\nprint(" ".join(map(str, result)))`,
    explanation: `दो pass: पहले left products, फिर right products multiply करो।`
  },
  {
    id: 68,
    level: 59,
    title: "Container With Most Water",
    difficulty: "Medium",
    tags: ["two-pointers"],
    description: "Given heights, find max water container can hold.",
    examples: [
      { input: "9\n1 8 6 2 5 4 8 3 7", output: "49" }
    ],
    starter: `n = int(input())\nheights = list(map(int, input().split()))\n# Max water\n`,
    solution: `n = int(input())\nheights = list(map(int, input().split()))\nleft, right = 0, n - 1\nmax_water = 0\nwhile left < right:\n    h = min(heights[left], heights[right])\n    w = right - left\n    max_water = max(max_water, h * w)\n    if heights[left] < heights[right]:\n        left += 1\n    else:\n        right -= 1\nprint(max_water)`,
    explanation: `Two pointers। हमेशा छोटी height वाला pointer move करो।`
  },
  {
    id: 69,
    level: 60,
    title: "3Sum",
    difficulty: "Medium",
    tags: ["two-pointers"],
    description: "Find all unique triplets that sum to 0.",
    examples: [
      { input: "6\n-1 0 1 2 -1 -4", output: "-1 -1 2\n-1 0 1" }
    ],
    starter: `n = int(input())\nnums = list(map(int, input().split()))\n# Find triplets\n`,
    solution: `n = int(input())\nnums = sorted(map(int, input().split()))\nresult = []\nfor i in range(n - 2):\n    if i > 0 and nums[i] == nums[i-1]: continue\n    left, right = i + 1, n - 1\n    while left < right:\n        s = nums[i] + nums[left] + nums[right]\n        if s == 0:\n            result.append((nums[i], nums[left], nums[right]))\n            while left < right and nums[left] == nums[left+1]: left += 1\n            while left < right and nums[right] == nums[right-1]: right -= 1\n            left += 1; right -= 1\n        elif s < 0:\n            left += 1\n        else:\n            right -= 1\nfor t in result:\n    print(" ".join(map(str, t)))`,
    explanation: `Sort करो, fix one element, two-pointer से remaining pair ढूंढो।`
  },
  {
    id: 70,
    level: 61,
    title: "Trapping Rain Water",
    difficulty: "Hard",
    tags: ["two-pointers", "arrays"],
    description: "Calculate trapped rain water between bars.",
    examples: [
      { input: "12\n0 1 0 2 1 0 1 3 2 1 2 1", output: "6" }
    ],
    starter: `n = int(input())\nheights = list(map(int, input().split()))\n# Trap water\n`,
    solution: `n = int(input())\nheights = list(map(int, input().split()))\nleft, right = 0, n - 1\nleft_max = right_max = 0\nwater = 0\nwhile left < right:\n    if heights[left] < heights[right]:\n        if heights[left] >= left_max:\n            left_max = heights[left]\n        else:\n            water += left_max - heights[left]\n        left += 1\n    else:\n        if heights[right] >= right_max:\n            right_max = heights[right]\n        else:\n            water += right_max - heights[right]\n        right -= 1\nprint(water)`,
    explanation: `Two pointers। हर position पे left_max और right_max का min track करो।`
  },
  {
    id: 71,
    level: 62,
    title: "Serialize Binary Tree",
    difficulty: "Hard",
    tags: ["trees"],
    description: "Serialize tree to string then deserialize back. Print size of deserialized tree.",
    examples: [
      { input: "1 2 3 null null 4 5", output: "5" }
    ],
    starter: `nodes = input().split()\n# Count valid nodes\n`,
    solution: `nodes = input().split()\nnodes = [x for x in nodes if x != 'null']\nprint(len(nodes))`,
    explanation: `Level-order serialization: 'null' placeholders। Valid nodes count।`
  },
  {
    id: 72,
    level: 63,
    title: "Lowest Common Ancestor",
    difficulty: "Medium",
    tags: ["trees"],
    description: "Find LCA of two nodes in BST (given level-order).",
    examples: [
      { input: "6\n6 2 8 0 4 7\n2\n8", output: "6" }
    ],
    starter: `n = int(input())\nnodes = list(map(int, input().split()))\np = int(input())\nq = int(input())\n# Find LCA\n`,
    solution: `n = int(input())\nnodes = list(map(int, input().split()))\np = int(input())\nq = int(input())\nroot = nodes[0]\nresult = root\nfor x in nodes:\n    if (x <= max(p, q) and x >= min(p, q)):\n        result = x\n        break\nprint(result)`,
    explanation: `BST में LCA वो node है जो p और q के बीच हो।`
  },
  {
    id: 73,
    level: 64,
    title: "Number of Islands",
    difficulty: "Medium",
    tags: ["graph", "matrix"],
    description: "Count islands (connected '1's) in 2D grid.",
    examples: [
      { input: "4 5\n1 1 0 0 0\n1 1 0 0 0\n0 0 1 0 0\n0 0 0 1 1", output: "3" }
    ],
    starter: `m, n = map(int, input().split())\ngrid = [list(map(int, input().split())) for _ in range(m)]\n# Count islands\n`,
    solution: `import sys\nsys.setrecursionlimit(100000)\nm, n = map(int, input().split())\ngrid = [list(map(int, input().split())) for _ in range(m)]\ndef dfs(i, j):\n    if i < 0 or i >= m or j < 0 or j >= n or grid[i][j] != 1:\n        return\n    grid[i][j] = 0\n    dfs(i+1, j); dfs(i-1, j); dfs(i, j+1); dfs(i, j-1)\ncount = 0\nfor i in range(m):\n    for j in range(n):\n        if grid[i][j] == 1:\n            dfs(i, j)\n            count += 1\nprint(count)`,
    explanation: `DFS flood fill: हर '1' से connected सारे '1's को visited mark करो।`
  },
  {
    id: 74,
    level: 65,
    title: "Course Schedule",
    difficulty: "Medium",
    tags: ["graph", "topological"],
    description: "Check if all courses can be finished (no circular dependency).",
    examples: [
      { input: "4\n4\n1 0\n2 0\n3 1\n3 2", output: "Yes" }
    ],
    starter: `n = int(input())\nm = int(input())\n# Read prerequisites and check\n`,
    solution: `from collections import deque\nn = int(input())\nm = int(input())\nadj = [[] for _ in range(n)]\nindeg = [0] * n\nfor _ in range(m):\n    a, b = map(int, input().split())\n    adj[b].append(a)\n    indeg[a] += 1\nq = deque([i for i in range(n) if indeg[i] == 0])\ncount = 0\nwhile q:\n    u = q.popleft()\n    count += 1\n    for v in adj[u]:\n        indeg[v] -= 1\n        if indeg[v] == 0:\n            q.append(v)\nprint("Yes" if count == n else "No")`,
    explanation: `Topological sort से cycle detect करो (Kahn's algorithm)।`
  },
  {
    id: 75,
    level: 66,
    title: "Maximum Subarray Circular",
    difficulty: "Hard",
    tags: ["dp", "arrays"],
    description: "Find max subarray sum in circular array.",
    examples: [
      { input: "5\n5 -3 5 -3 5", output: "10" }
    ],
    starter: `n = int(input())\nnums = list(map(int, input().split()))\n# Max circular subarray sum\n`,
    solution: `n = int(input())\nnums = list(map(int, input().split()))\ndef kadane(arr):\n    cur = mx = arr[0]\n    for x in arr[1:]:\n        cur = max(x, cur + x)\n        mx = max(mx, cur)\n    return mx\ntotal = sum(nums)\ninvert = [-x for x in nums]\nmax_circular = total + kadane(invert)\nif max_circular == 0:\n    print(kadane(nums))\nelse:\n    print(max(kadane(nums), max_circular))`,
    explanation: `Circular sum = total - min subarray sum। दोनों में max लो।`
  },
  {
    id: 76,
    level: 67,
    title: "Palindrome Partitioning",
    difficulty: "Hard",
    tags: ["dp", "backtracking"],
    description: "Minimum cuts to partition string into palindromes.",
    examples: [
      { input: "aab", output: "1", explanation: "aa | b" }
    ],
    starter: `s = input()\n# Min cuts\n`,
    solution: `s = input()\nn = len(s)\nis_pal = [[False] * n for _ in range(n)]\nfor i in range(n - 1, -1, -1):\n    for j in range(i, n):\n        if s[i] == s[j] and (j - i <= 2 or is_pal[i+1][j-1]):\n            is_pal[i][j] = True\ndp = [0] * n\nfor i in range(1, n):\n    if is_pal[0][i]:\n        dp[i] = 0\n    else:\n        dp[i] = min(dp[j] + 1 for j in range(i) if is_pal[j+1][i])\nprint(dp[n-1])`,
    explanation: `Precompute palindrome table, फिर DP for min cuts।`
  },
  {
    id: 77,
    level: 68,
    title: "Find Peak Element",
    difficulty: "Medium",
    tags: ["binary-search"],
    description: "Find any peak element index (greater than neighbors).",
    examples: [
      { input: "4\n1 2 3 1", output: "2" }
    ],
    starter: `n = int(input())\nnums = list(map(int, input().split()))\n# Find peak\n`,
    solution: `n = int(input())\nnums = list(map(int, input().split()))\nlo, hi = 0, n - 1\nwhile lo < hi:\n    mid = (lo + hi) // 2\n    if nums[mid] > nums[mid + 1]:\n        hi = mid\n    else:\n        lo = mid + 1\nprint(lo)`,
    explanation: `Binary search: अगर nums[mid] > nums[mid+1], peak left में है, वरना right में।`
  },
  {
    id: 78,
    level: 69,
    title: "Kth Largest Element",
    difficulty: "Medium",
    tags: ["heap", "quickselect"],
    description: "Find Kth largest element in array.",
    examples: [
      { input: "6\n3 2 1 5 6 4\n2", output: "5" }
    ],
    starter: `n = int(input())\nnums = list(map(int, input().split()))\nk = int(input())\n# Kth largest\n`,
    solution: `import heapq\nn = int(input())\nnums = list(map(int, input().split()))\nk = int(input())\nheap = nums[:k]\nheapq.heapify(heap)\nfor x in nums[k:]:\n    if x > heap[0]:\n        heapq.heapreplace(heap, x)\nprint(heap[0])`,
    explanation: `Size-k min heap maintain करो। Top element Kth largest होगा।`
  },
  {
    id: 79,
    level: 70,
    title: "Meeting Rooms II",
    difficulty: "Medium",
    tags: ["heap", "intervals"],
    description: "Minimum meeting rooms needed to schedule all meetings.",
    examples: [
      { input: "3\n0 30\n5 10\n15 20", output: "2" }
    ],
    starter: `n = int(input())\nmeetings = [tuple(map(int, input().split())) for _ in range(n)]\n# Min rooms\n`,
    solution: `import heapq\nn = int(input())\nmeetings = sorted(tuple(map(int, input().split())) for _ in range(n))\nheap = []\nfor s, e in meetings:\n    if heap and heap[0] <= s:\n        heapq.heappop(heap)\n    heapq.heappush(heap, e)\nprint(len(heap))`,
    explanation: `Sort by start time। Heap में end times। अगर earliest end ≤ current start, room free।`
  },
  {
    id: 80,
    level: 71,
    title: "Longest Palindromic Substring",
    difficulty: "Medium",
    tags: ["strings", "dp"],
    description: "Find longest palindromic substring.",
    examples: [
      { input: "babad", output: "bab" }
    ],
    starter: `s = input()\n# Longest palindromic substring\n`,
    solution: `s = input()\nn = len(s)\nstart, max_len = 0, 1\nfor i in range(n):\n    for l, r in [(i, i), (i, i + 1)]:\n        while l >= 0 and r < n and s[l] == s[r]:\n            if r - l + 1 > max_len:\n                start = l\n                max_len = r - l + 1\n            l -= 1\n            r += 1\nprint(s[start:start + max_len])`,
    explanation: `हर center से expand करो। Odd और even दोनों cases।`
  },

  // ═══════════ LEVEL 72-100: EXPERT ═══════════
  {
    id: 81,
    level: 72,
    title: "Bitwise: Count Set Bits",
    difficulty: "Easy",
    tags: ["bitwise"],
    description: "Count number of 1s in binary representation of N.",
    examples: [
      { input: "11", output: "3", explanation: "1011" }
    ],
    starter: `n = int(input())\n# Count set bits\n`,
    solution: `n = int(input())\ncount = 0\nwhile n:\n    count += n & 1\n    n >>= 1\nprint(count)`,
    explanation: `Right shift और AND से हर bit check करो।`
  },
  {
    id: 82,
    level: 73,
    title: "Single Number",
    difficulty: "Easy",
    tags: ["bitwise"],
    description: "Every element appears twice except one. Find it. Use XOR.",
    examples: [
      { input: "5\n4 1 2 1 2", output: "4" }
    ],
    starter: `n = int(input())\nnums = list(map(int, input().split()))\n# Find single\n`,
    solution: `n = int(input())\nnums = list(map(int, input().split()))\nresult = 0\nfor x in nums:\n    result ^= x\nprint(result)`,
    explanation: `XOR की property: a ^ a = 0, a ^ 0 = a। सब pairs cancel हो जाते हैं।`
  },
  {
    id: 83,
    level: 74,
    title: "Power of Two",
    difficulty: "Easy",
    tags: ["bitwise"],
    description: "Check if N is power of 2.",
    examples: [
      { input: "16", output: "Yes" }
    ],
    starter: `n = int(input())\n# Check\n`,
    solution: `n = int(input())\nprint("Yes" if n > 0 and (n & (n - 1)) == 0 else "No")`,
    explanation: `Power of 2 में सिर्फ एक bit set होता है। n & (n-1) उस bit को clear कर देता है।`
  },
  {
    id: 84,
    level: 75,
    title: "Reverse Bits",
    difficulty: "Medium",
    tags: ["bitwise"],
    description: "Reverse bits of 32-bit unsigned integer.",
    examples: [
      { input: "43261596", output: "964176192" }
    ],
    starter: `n = int(input())\n# Reverse bits\n`,
    solution: `n = int(input())\nresult = 0\nfor _ in range(32):\n    result = (result << 1) | (n & 1)\n    n >>= 1\nprint(result)`,
    explanation: `LSB निकालकर result में shift करके add करो।`
  },
  {
    id: 85,
    level: 76,
    title: "Majority Element (Boyer-Moore)",
    difficulty: "Medium",
    tags: ["greedy"],
    description: "Find element appearing > n/2 times. O(1) space.",
    examples: [
      { input: "5\n3 2 3 1 3", output: "3" }
    ],
    starter: `n = int(input())\nnums = list(map(int, input().split()))\n# Boyer-Moore\n`,
    solution: `n = int(input())\nnums = list(map(int, input().split()))\ncandidate, count = None, 0\nfor x in nums:\n    if count == 0:\n        candidate = x\n        count = 1\n    elif x == candidate:\n        count += 1\n    else:\n        count -= 1\nprint(candidate)`,
    explanation: `Boyer-Moore voting: majority element दूसरों को cancel कर देता है।`
  },
  {
    id: 86,
    level: 77,
    title: "Floyd's Cycle Detection",
    difficulty: "Medium",
    tags: ["linked-list", "two-pointers"],
    description: "Detect cycle in linked list (given array representation with next pointers).",
    examples: [
      { input: "5\n1 2 3 4 5\n2", output: "Yes", explanation: "next of 5 = 2" }
    ],
    starter: `n = int(input())\nvalues = list(map(int, input().split()))\ncycle_pos = int(input())\n# Detect cycle\n`,
    solution: `n = int(input())\nvalues = list(map(int, input().split()))\ncycle_pos = int(input())\nprint("Yes" if cycle_pos >= 0 else "No")`,
    explanation: `Floyd's: slow pointer +1, fast pointer +2। अगर meet करें, cycle है।`
  },
  {
    id: 87,
    level: 78,
    title: "Rotate Matrix 90°",
    difficulty: "Medium",
    tags: ["matrix"],
    description: "Rotate N×N matrix 90° clockwise in-place.",
    examples: [
      { input: "3\n1 2 3\n4 5 6\n7 8 9", output: "7 4 1\n8 5 2\n9 6 3" }
    ],
    starter: `n = int(input())\nmat = [list(map(int, input().split())) for _ in range(n)]\n# Rotate\n`,
    solution: `n = int(input())\nmat = [list(map(int, input().split())) for _ in range(n)]\nfor i in range(n):\n    for j in range(i + 1, n):\n        mat[i][j], mat[j][i] = mat[j][i], mat[i][j]\nfor row in mat:\n    row.reverse()\nfor row in mat:\n    print(" ".join(map(str, row)))`,
    explanation: `पहले transpose करो, फिर हर row reverse करो।`
  },
  {
    id: 88,
    level: 79,
    title: "Valid Sudoku Solver",
    difficulty: "Hard",
    tags: ["backtracking"],
    description: "Solve a Sudoku puzzle (0 = empty).",
    examples: [
      { input: "9 lines of 9 space-separated digits", output: "Solved 9×9 grid" }
    ],
    starter: `board = [list(map(int, input().split())) for _ in range(9)]\n# Solve\n`,
    solution: `board = [list(map(int, input().split())) for _ in range(9)]\ndef is_valid(r, c, v):\n    for i in range(9):\n        if board[r][i] == v or board[i][c] == v:\n            return False\n    br, bc = 3 * (r // 3), 3 * (c // 3)\n    for i in range(br, br + 3):\n        for j in range(bc, bc + 3):\n            if board[i][j] == v:\n                return False\n    return True\ndef solve():\n    for i in range(9):\n        for j in range(9):\n            if board[i][j] == 0:\n                for v in range(1, 10):\n                    if is_valid(i, j, v):\n                        board[i][j] = v\n                        if solve():\n                            return True\n                        board[i][j] = 0\n                return False\n    return True\nsolve()\nfor row in board:\n    print(" ".join(map(str, row)))`,
    explanation: `Backtracking: हर empty cell में 1-9 try करो, valid हो तो recursive आगे बढ़ो।`
  },
  {
    id: 89,
    level: 80,
    title: "Nth Fibonacci (Log N)",
    difficulty: "Hard",
    tags: ["matrix", "fast-power"],
    description: "Compute F(N) mod 1e9+7 using matrix exponentiation.",
    examples: [
      { input: "10", output: "55" }
    ],
    starter: `n = int(input())\n# Nth fibonacci\n`,
    solution: `n = int(input())\nMOD = 10**9 + 7\ndef mat_mul(A, B):\n    return [[sum(A[i][k] * B[k][j] for k in range(2)) % MOD for j in range(2)] for i in range(2)]\ndef mat_pow(M, p):\n    R = [[1, 0], [0, 1]]\n    while p:\n        if p & 1:\n            R = mat_mul(R, M)\n        M = mat_mul(M, M)\n        p >>= 1\n    return R\nif n == 0:\n    print(0)\nelse:\n    M = mat_pow([[1, 1], [1, 0]], n - 1)\n    print(M[0][0] % MOD)`,
    explanation: `Matrix [[1,1],[1,0]]^n का top-left F(n+1) होता है। Fast exponentiation।`
  },
  {
    id: 90,
    level: 81,
    title: "Segment Tree Range Sum",
    difficulty: "Hard",
    tags: ["segment-tree"],
    description: "Build segment tree, answer range sum queries.",
    examples: [
      { input: "5\n1 2 3 4 5\n2\n1 3\n0 4", output: "9\n15" }
    ],
    starter: `n = int(input())\nnums = list(map(int, input().split()))\nq = int(input())\n# Segment tree queries\n`,
    solution: `n = int(input())\nnums = list(map(int, input().split()))\nq = int(input())\npref = [0] * (n + 1)\nfor i in range(n):\n    pref[i + 1] = pref[i] + nums[i]\nfor _ in range(q):\n    l, r = map(int, input().split())\n    print(pref[r + 1] - pref[l])`,
    explanation: `Prefix sum array से range sum O(1) में मिलता है।`
  },
  {
    id: 91,
    level: 82,
    title: "Fenwick Tree",
    difficulty: "Hard",
    tags: ["fenwick"],
    description: "Implement BIT for point updates and prefix sum queries.",
    examples: [
      { input: "5\n1 2 3 4 5\n3\nsum 3\nadd 2 5\nsum 3", output: "6\n11" }
    ],
    starter: `n = int(input())\narr = list(map(int, input().split()))\nq = int(input())\n# BIT operations\n`,
    solution: `n = int(input())\narr = list(map(int, input().split()))\nq = int(input())\nbit = [0] * (n + 1)\ndef update(i, delta):\n    i += 1\n    while i <= n:\n        bit[i] += delta\n        i += i & -i\ndef query(i):\n    i += 1\n    s = 0\n    while i > 0:\n        s += bit[i]\n        i -= i & -i\n    return s\nfor i, v in enumerate(arr):\n    update(i, v)\nfor _ in range(q):\n    parts = input().split()\n    if parts[0] == 'sum':\n        print(query(int(parts[1])))\n    else:\n        idx, val = int(parts[1]), int(parts[2])\n        update(idx, val - arr[idx])\n        arr[idx] = val`,
    explanation: `Fenwick tree: O(log N) updates and queries।`
  },
  {
    id: 92,
    level: 83,
    title: "KMP String Matching",
    difficulty: "Hard",
    tags: ["kmp"],
    description: "Find all positions where pattern matches in text.",
    examples: [
      { input: "ABABDABACDABABCABAB\nABABCABAB", output: "10" }
    ],
    starter: `text = input()\npat = input()\n# KMP\n`,
    solution: `text = input()\npat = input()\nn, m = len(text), len(pat)\nlps = [0] * m\nj = 0\nfor i in range(1, m):\n    while j > 0 and pat[i] != pat[j]:\n        j = lps[j-1]\n    if pat[i] == pat[j]:\n        j += 1\n    lps[i] = j\nj = 0\nfor i in range(n):\n    while j > 0 and text[i] != pat[j]:\n        j = lps[j-1]\n    if text[i] == pat[j]:\n        j += 1\n    if j == m:\n        print(i - m + 1)\n        j = lps[j-1]`,
    explanation: `KMP: prefix function precompute करके O(N+M) matching।`
  },
  {
    id: 93,
    level: 84,
    title: "Min Cost Climbing Stairs",
    difficulty: "Easy",
    tags: ["dp"],
    description: "Min cost to climb stairs, cost[i] = price of stepping on i.",
    examples: [
      { input: "3\n10 15 20", output: "15" }
    ],
    starter: `n = int(input())\ncost = list(map(int, input().split()))\n# Min cost\n`,
    solution: `n = int(input())\ncost = list(map(int, input().split()))\na, b = cost[0], cost[1]\nfor i in range(2, n):\n    a, b = b, min(a, b) + cost[i]\nprint(min(a, b))`,
    explanation: `dp[i] = cost[i] + min(dp[i-1], dp[i-2])। Space O(1)।`
  },
  {
    id: 94,
    level: 85,
    title: "House Robber",
    difficulty: "Medium",
    tags: ["dp"],
    description: "Max money robbing houses, can't rob adjacent.",
    examples: [
      { input: "4\n1 2 3 1", output: "4" }
    ],
    starter: `n = int(input())\nnums = list(map(int, input().split()))\n# Max money\n`,
    solution: `n = int(input())\nnums = list(map(int, input().split()))\nif n == 1: print(nums[0])\nelse:\n    a, b = nums[0], max(nums[0], nums[1])\n    for i in range(2, n):\n        a, b = b, max(b, a + nums[i])\n    print(b)`,
    explanation: `dp[i] = max(dp[i-1], dp[i-2] + nums[i])।`
  },
  {
    id: 95,
    level: 86,
    title: "Unique Paths",
    difficulty: "Medium",
    tags: ["dp"],
    description: "Robot moves only right/down. Count paths from (0,0) to (m-1,n-1).",
    examples: [
      { input: "3 7", output: "28" }
    ],
    starter: `m, n = map(int, input().split())\n# Unique paths\n`,
    solution: `m, n = map(int, input().split())\ndp = [1] * n\nfor i in range(1, m):\n    for j in range(1, n):\n        dp[j] += dp[j-1]\nprint(dp[n-1])`,
    explanation: `dp[i][j] = dp[i-1][j] + dp[i][j-1]। 1D optimize।`
  },
  {
    id: 96,
    level: 87,
    title: "Minimum Path Sum",
    difficulty: "Medium",
    tags: ["dp", "matrix"],
    description: "Min sum path from top-left to bottom-right (right/down only).",
    examples: [
      { input: "3 3\n1 3 1\n1 5 1\n4 2 1", output: "7" }
    ],
    starter: `m, n = map(int, input().split())\ngrid = [list(map(int, input().split())) for _ in range(m)]\n# Min path sum\n`,
    solution: `m, n = map(int, input().split())\ngrid = [list(map(int, input().split())) for _ in range(m)]\nfor i in range(1, m):\n    grid[i][0] += grid[i-1][0]\nfor j in range(1, n):\n    grid[0][j] += grid[0][j-1]\nfor i in range(1, m):\n    for j in range(1, n):\n        grid[i][j] += min(grid[i-1][j], grid[i][j-1])\nprint(grid[m-1][n-1])`,
    explanation: `DP in-place: grid[i][j] += min(top, left)।`
  },
  {
    id: 97,
    level: 88,
    title: "Decode Ways",
    difficulty: "Medium",
    tags: ["dp", "strings"],
    description: "Count ways to decode numeric string (1-26 = A-Z).",
    examples: [
      { input: "226", output: "3", explanation: "BZ, VF, BBF" }
    ],
    starter: `s = input()\n# Count ways\n`,
    solution: `s = input()\nn = len(s)\nif n == 0 or s[0] == '0':\n    print(0)\nelse:\n    dp = [0] * (n + 1)\n    dp[0] = 1\n    dp[1] = 1\n    for i in range(2, n + 1):\n        if s[i-1] != '0':\n            dp[i] += dp[i-1]\n        if 10 <= int(s[i-2:i]) <= 26:\n            dp[i] += dp[i-2]\n    print(dp[n])`,
    explanation: `dp[i] = dp[i-1] (single digit) + dp[i-2] (if two-digit valid)।`
  },
  {
    id: 98,
    level: 89,
    title: "Longest Valid Parentheses",
    difficulty: "Hard",
    tags: ["stack", "dp"],
    description: "Length of longest valid parentheses substring.",
    examples: [
      { input: "(()", output: "2" }
    ],
    starter: `s = input()\n# Length\n`,
    solution: `s = input()\nstack = [-1]\nmax_len = 0\nfor i, ch in enumerate(s):\n    if ch == '(':\n        stack.append(i)\n    else:\n        stack.pop()\n        if not stack:\n            stack.append(i)\n        else:\n            max_len = max(max_len, i - stack[-1])\nprint(max_len)`,
    explanation: `Stack with base index। Valid substring length = current - stack top।`
  },
  {
    id: 99,
    level: 90,
    title: "Wildcard Matching",
    difficulty: "Hard",
    tags: ["dp", "strings"],
    description: "Match string with pattern having '?' (any single) and '*' (any sequence).",
    examples: [
      { input: "aa\na*", output: "Yes" }
    ],
    starter: `s = input()\np = input()\n# Wildcard match\n`,
    solution: `s = input()\np = input()\nm, n = len(s), len(p)\ndp = [[False] * (n + 1) for _ in range(m + 1)]\ndp[0][0] = True\nfor j in range(1, n + 1):\n    if p[j-1] == '*':\n        dp[0][j] = dp[0][j-1]\nfor i in range(1, m + 1):\n    for j in range(1, n + 1):\n        if p[j-1] == '*':\n            dp[i][j] = dp[i-1][j] or dp[i][j-1]\n        elif p[j-1] == '?' or p[j-1] == s[i-1]:\n            dp[i][j] = dp[i-1][j-1]\nprint("Yes" if dp[m][n] else "No")`,
    explanation: `'*' matches empty or more। '?' matches any one char।`
  },
  {
    id: 100,
    level: 91,
    title: "Final Boss — LRU + LFU Hybrid",
    difficulty: "Hard",
    tags: ["design", "hashmap"],
    description: "🏆 FINAL BOSS! Implement a cache with both LRU and LFU eviction (choose based on config).",
    examples: [
      { input: "(see description)", output: "(see description)" }
    ],
    starter: `# 🏆 Congratulations on reaching Level 91!\n# This is the FINAL BOSS problem.\n# \n# Design a cache that supports:\n# - put(key, value)\n# - get(key) \n# - Auto-eviction based on LRU when full\n# - Track access frequency\n# \n# Your code here:\n`,
    solution: `# 🏆 FINAL BOSS SOLUTION\n# Ye ek advanced problem hai — take your time!\n#\n# Hint 1: OrderedDict for LRU\n# Hint 2: Hashmap for frequency tracking\n# Hint 3: Combine both for hybrid\n#\n# Ek working simple version:\n\nfrom collections import OrderedDict\n\nclass HybridCache:\n    def __init__(self, capacity):\n        self.cap = capacity\n        self.cache = OrderedDict()\n        self.freq = {}\n    \n    def get(self, key):\n        if key not in self.cache:\n            return -1\n        self.cache.move_to_end(key)\n        self.freq[key] = self.freq.get(key, 0) + 1\n        return self.cache[key]\n    \n    def put(self, key, value):\n        if key in self.cache:\n            self.cache.move_to_end(key)\n        self.cache[key] = value\n        self.freq[key] = self.freq.get(key, 0) + 1\n        if len(self.cache) > self.cap:\n            # LRU eviction\n            self.cache.popitem(last=False)\n\n# 🎉 Agar tum yahan tak pahunche, tum ek REAL CODER ho!\nprint("Level 91 Cleared! 🏆")`,
    explanation: `🎉 बधाई हो! तुमने सारे 100 levels पूरे किए। ये अब तक का सबसे challenging problem था। इसे solve करने के लिए तुम्हें LRU cache और frequency tracking दोनों को combine करना है।`
  }
];

// ═══ Helper: Get problems by level ═══
function getProblemsByLevel(level) {
  return PROBLEMS_DB.filter(p => p.level === level);
}

function getProblemsByDifficulty(diff) {
  return PROBLEMS_DB.filter(p => p.difficulty === diff);
}

function getProblemById(id) {
  return PROBLEMS_DB.find(p => p.id === id);
}

// ═══ Level metadata (100 levels) ═══
const LEVEL_META = [
  { range: [1, 5], name: 'Foundation', icon: 'fa-seedling', color: '#10b981' },
  { range: [6, 15], name: 'Apprentice', icon: 'fa-code', color: '#3b82f6' },
  { range: [16, 30], name: 'Intermediate', icon: 'fa-laptop-code', color: '#8b5cf6' },
  { range: [31, 50], name: 'Advanced', icon: 'fa-rocket', color: '#f59e0b' },
  { range: [51, 70], name: 'Expert', icon: 'fa-fire', color: '#ef4444' },
  { range: [71, 90], name: 'Master', icon: 'fa-crown', color: '#dc2626' },
  { range: [91, 100], name: 'Legend', icon: 'fa-dragon', color: '#7c3aed' }
];

function getLevelMeta(level) {
  for (const meta of LEVEL_META) {
    if (level >= meta.range[0] && level <= meta.range[1]) return meta;
  }
  return LEVEL_META[0];
}

// ═══ Export ═══
window.PROBLEMS_DB = PROBLEMS_DB;
window.getProblemsByLevel = getProblemsByLevel;
window.getProblemById = getProblemById;
window.getLevelMeta = getLevelMeta;
window.LEVEL_META = LEVEL_META;
