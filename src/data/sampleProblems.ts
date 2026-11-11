export interface SampleProblem {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  problemDescription: string;
  buggyCode: string;
  expectedBehavior: string;
  bugType: string;
}

export const SAMPLE_PROBLEMS: SampleProblem[] = [
  {
    id: 'off-by-one',
    title: 'Find Maximum in List (Off-By-One)',
    difficulty: 'Easy',
    category: 'Array / Logic',
    bugType: 'IndexError / Logic Flaw',
    problemDescription: 'Write a Python function find_max(numbers) that returns the largest number in a list of integers. Do not use the built-in max() function.',
    expectedBehavior: 'Returns the maximum number from the list without crashing on index boundaries.',
    buggyCode: `def find_max(numbers):
    if not numbers:
        return None
    
    current_max = numbers[0]
    # Bug: Off-by-one error using <= instead of < or range(len(numbers))
    for i in range(1, len(numbers) + 1):
        if numbers[i] > current_max:
            current_max = numbers[i]
            
    return current_max

# Test execution:
test_list = [14, 3, 27, 8, 42, 19]
print("Testing with list:", test_list)
result = find_max(test_list)
print("Maximum found:", result)
`
  },
  {
    id: 'zero-division',
    title: 'Calculate Average Score (ZeroDivisionError)',
    difficulty: 'Easy',
    category: 'Math / Edge Case',
    bugType: 'ZeroDivisionError',
    problemDescription: 'Create a function calculate_average(scores) that computes the average score of students. It should safely return 0.0 when given an empty list.',
    expectedBehavior: 'Computes average correctly, handles empty input gracefully without ZeroDivisionError.',
    buggyCode: `def calculate_average(scores):
    total = sum(scores)
    # Bug: Does not check for empty list before division!
    average = total / len(scores)
    return round(average, 2)

# Test with valid scores
print("Scores [85, 90, 78]:", calculate_average([85, 90, 78]))

# Test with empty scores (will trigger ZeroDivisionError)
print("Testing empty scores list:")
print("Empty list result:", calculate_average([]))
`
  },
  {
    id: 'infinite-recursion',
    title: 'Factorial Calculator (Recursion Bug)',
    difficulty: 'Medium',
    category: 'Recursion',
    bugType: 'RecursionError / Timeout',
    problemDescription: 'Write a recursive function factorial(n) that computes n! for non-negative integers.',
    expectedBehavior: 'Calculates factorial using base cases for 0 and 1, handles negative inputs or invalid cases.',
    buggyCode: `def factorial(n):
    # Bug: Base condition check is flawed (checks n == 1 but fails on 0 or negative)
    # And calls factorial(n) instead of factorial(n - 1)
    if n == 1:
        return 1
    return n * factorial(n)

print("Calculating factorial of 5:")
print(factorial(5))
`
  },
  {
    id: 'syntax-indentation',
    title: 'Palindrome Checker (Syntax & Indentation)',
    difficulty: 'Easy',
    category: 'Strings / Syntax',
    bugType: 'SyntaxError / IndentationError',
    problemDescription: 'Write a function is_palindrome(text) that checks whether a given string is a palindrome (ignoring casing and spaces).',
    expectedBehavior: 'Returns True if palindrome, False otherwise, with valid Python syntax.',
    buggyCode: `def is_palindrome(text)
    # Bug: Missing colon on def above!
    cleaned = "".join(ch.lower() for ch in text if ch.isalnum())
    
   # Bug: Inconsistent indentation below
   return cleaned == cleaned[::-1]

print("Is 'Racecar' palindrome?", is_palindrome("Racecar"))
print("Is 'Hello' palindrome?", is_palindrome("Hello"))
`
  },
  {
    id: 'two-sum-logic',
    title: 'Two Sum Target Pairs (Logic Flaw)',
    difficulty: 'Medium',
    category: 'Hash Map / Search',
    bugType: 'Logical Flaw / Wrong Index',
    problemDescription: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may not use the same element twice.',
    expectedBehavior: 'Returns [index1, index2] using single pass hash map.',
    buggyCode: `def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        # Bug: Saves current index before checking complement, allowing same element twice!
        seen[num] = i
        if complement in seen:
            return [seen[complement], i]
    return []

# Test with target = 6 and nums = [3, 2, 4]
# Target pair is 2 + 4 = 6 (indices 1, 2)
# But bug returns [0, 0] because 3 + 3 = 6 using element 0 twice!
print("Two Sum [3, 2, 4], target 6:")
print("Result indices:", two_sum([3, 2, 4], 6))
`
  }
];
