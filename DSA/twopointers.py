"""Two-pointer examples.

Two pointers use two indexes to walk through an array or string together.
For a sorted array, this reduces the two-sum search from O(n^2) to O(n).
"""


def two_sum_sorted(nums, target):
    """Return indexes of two values in sorted ``nums`` that add to ``target``.

    Returns an empty list when no pair exists. The input must be sorted in
    ascending order; moving the left pointer increases the sum, while moving
    the right pointer decreases it.
    """
    left, right = 0, len(nums) - 1

    while left < right:
        current_sum = nums[left] + nums[right]

        if current_sum == target:
            return [left, right]
        if current_sum < target:
            left += 1      # need a bigger sum
        else:
            right -= 1     # need a smaller sum

    return []


def main():
    nums = [1, 3, 4, 6, 8, 11]
    target = 10
    result = two_sum_sorted(nums, target)

    assert result == [2, 3]  # nums[2] + nums[3] == 4 + 6
    assert two_sum_sorted([1, 2, 4, 9], 8) == []
    assert two_sum_sorted([], 10) == []

    print(f"Numbers: {nums}")
    print(f"Target: {target}")
    print(f"Indexes: {result}; values: {nums[result[0]]} + {nums[result[1]]}")


if __name__ == "__main__":
    main()
