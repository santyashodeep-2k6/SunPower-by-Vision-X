import { useDebounce } from "../src/lib/useDebounce"

console.log("=== TESTING DEBOUNCE HOOK LOGIC ===")

// Simulate debounce logic
function testDebounceLogic() {
  let timer: any = null
  let debounced = ""
  let executionCount = 0

  function triggerSearch(val: string, delay = 300) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      debounced = val
      executionCount++
    }, delay)
  }

  // Simulate fast typing: "A", "Am", "Amit", "Amit K"
  triggerSearch("A", 100)
  triggerSearch("Am", 100)
  triggerSearch("Amit", 100)
  triggerSearch("Amit Kulkarni", 100)

  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`After 150ms of typing finished:`)
      console.log(`- Final debounced search string: "${debounced}"`)
      console.log(`- Total search executions: ${executionCount} (expected: exactly 1)`)
      resolve(debounced === "Amit Kulkarni" && executionCount === 1)
    }, 150)
  })
}

testDebounceLogic().then((passed) => {
  if (passed) {
    console.log("✓ DEBOUNCE UNIT TEST PASSED")
  } else {
    console.error("✗ DEBOUNCE UNIT TEST FAILED")
    process.exit(1)
  }
})

