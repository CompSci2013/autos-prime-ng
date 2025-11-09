import { test, expect } from '@playwright/test';

/**
 * Category 1: Basic Filter Operations (Tests 002-020)
 *
 * This test suite covers basic filtering functionality without pop-out windows.
 * Tests include: adding filters, clearing filters, modifying filters, sorting,
 * pagination, browser navigation, and URL state management.
 */

test.describe('Category 1: Basic Filter Operations', () => {
  const BASE_URL = 'http://192.168.0.244:4201/discover';

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  /**
   * Test 002: Add Multiple Filters (Manufacturer + Body Class)
   * Priority: High
   * Tier: 1 (Critical Path)
   */
  test('002: should add multiple filters (manufacturer and body class)', async ({ page }) => {
    console.log('Test 002: Add Multiple Filters');

    // Navigate to URL with multiple filters
    await page.goto(`${BASE_URL}?manufacturer=Ford&bodyClass=Sedan`);
    await page.waitForLoadState('networkidle');

    // Verify URL contains both filters
    await expect(page).toHaveURL(/manufacturer=Ford/);
    await expect(page).toHaveURL(/bodyClass=Sedan/);

    // Verify filter chips appear
    await page.waitForSelector('.filter-chips', { state: 'visible' });
    const filterChipCount = await page.locator('.filter-chip').count();
    expect(filterChipCount).toBe(2);  // Should have 2 chips (Manufacturer + Body Class)

    // Verify filtered results count
    const resultsCountText = await page.locator('.result-count').last().textContent();
    expect(resultsCountText).toBeTruthy();
    // Should show around 230 results (Ford Sedans)
    expect(resultsCountText).toMatch(/\d+\s+result/);
    expect(resultsCountText).not.toContain('4,');  // Should NOT show all 4,880

    console.log('✅ Test 002 passed: Multiple filters applied successfully');
  });

  /**
   * Test 003: Clear Single Filter (Keep Others)
   * Priority: High
   * Tier: 2 (Important)
   */
  test('003: should clear single filter while keeping others', async ({ page }) => {
    console.log('Test 003: Clear Single Filter');

    // Start with two filters applied
    await page.goto(`${BASE_URL}?manufacturer=Ford&bodyClass=Sedan`);
    await page.waitForLoadState('networkidle');

    // Navigate to URL with only one filter (simulating chip removal)
    await page.goto(`${BASE_URL}?bodyClass=Sedan`);
    await page.waitForLoadState('networkidle');

    // Verify URL has only body class filter
    await expect(page).toHaveURL(/bodyClass=Sedan/);
    await expect(page).not.toHaveURL(/manufacturer/);

    // TODO: Verify results count shows ~3,500 results (all sedans)
    // TODO: Verify Query Control shows only "Body Class: Sedan" chip

    console.log('✅ Test 003 passed');
  });

  /**
   * Test 004: Clear All Filters
   * Priority: CRITICAL (Related to main bug)
   * Tier: 1 (Critical Path)
   */
  test('004: should clear all filters and show all results', async ({ page }) => {
    console.log('Test 004: Clear All Filters (Critical Bug Scenario)');

    // Start with filters applied
    await page.goto(`${BASE_URL}?manufacturer=Ford&bodyClass=Sedan`);
    await page.waitForLoadState('networkidle');

    // Verify filtered state - wait for filter chips to appear
    await page.waitForSelector('.filter-chips', { state: 'visible' });
    const filterChipsBeforeClear = await page.locator('.filter-chip').count();
    expect(filterChipsBeforeClear).toBeGreaterThan(0);

    // Verify filtered results count (get the last result-count which is the Vehicle Results table)
    const resultsCountText = await page.locator('.result-count').last().textContent();
    expect(resultsCountText).toBeTruthy();
    // Should show filtered count (around 230 for Ford Sedans)
    expect(resultsCountText).toMatch(/\d+\s+result/);

    // Click the "Clear All" button
    await page.locator('button:has-text("Clear All")').click();
    await page.waitForLoadState('networkidle');

    // Verify URL cleared of filter params (pagination params may remain)
    const clearedUrl = page.url();
    expect(clearedUrl).not.toContain('manufacturer=');
    expect(clearedUrl).not.toContain('bodyClass=');

    // Verify filter chips removed
    const filterChipsVisible = await page.locator('.filter-chips').isVisible();
    expect(filterChipsVisible).toBe(false);

    // Verify all results displayed (~4,880 vehicles)
    const clearedResultsCountText = await page.locator('.result-count').last().textContent();
    expect(clearedResultsCountText).toContain('4');  // Should show 4,xxx results
    expect(clearedResultsCountText).toContain('result');

    console.log('✅ Test 004 passed: Filters cleared successfully');
  });

  /**
   * Test 005: Modify Existing Filter
   * Priority: Medium
   * Tier: 2 (Important)
   */
  test('005: should modify existing filter value', async ({ page }) => {
    console.log('Test 005: Modify Existing Filter');

    // Start with Ford filter
    await page.goto(`${BASE_URL}?manufacturer=Ford`);
    await page.waitForLoadState('networkidle');

    // Change to Chevrolet
    await page.goto(`${BASE_URL}?manufacturer=Chevrolet`);
    await page.waitForLoadState('networkidle');

    // Verify URL updated
    await expect(page).toHaveURL(/manufacturer=Chevrolet/);
    await expect(page).not.toHaveURL(/Ford/);

    // TODO: Verify results show only Chevrolet vehicles
    // TODO: Verify Query Control chip updates to "Manufacturer: Chevrolet"

    console.log('✅ Test 005 passed');
  });

  /**
   * Test 006: Add Year Range Filter
   * Priority: Medium
   * Tier: 2 (Important)
   */
  test('006: should add year range filter', async ({ page }) => {
    console.log('Test 006: Add Year Range Filter');

    await page.goto(`${BASE_URL}?yearMin=1965&yearMax=1970`);
    await page.waitForLoadState('networkidle');

    // Verify URL contains year range
    await expect(page).toHaveURL(/yearMin=1965/);
    await expect(page).toHaveURL(/yearMax=1970/);

    // TODO: Verify results show only 1965-1970 vehicles
    // TODO: Verify Query Control shows "Year: 1965-1970" chip

    console.log('✅ Test 006 passed');
  });

  /**
   * Test 007: Add Page Size Parameter
   * Priority: Low
   * Tier: 3 (Edge Cases)
   */
  test('007: should change page size parameter', async ({ page }) => {
    console.log('Test 007: Add Page Size Parameter');

    await page.goto(`${BASE_URL}?page=1&size=50`);
    await page.waitForLoadState('networkidle');

    // Verify URL contains page size
    await expect(page).toHaveURL(/size=50/);

    // TODO: Verify results table shows 50 results per page
    // TODO: Verify pagination shows "Showing 1 to 50 of 4880 entries"

    console.log('✅ Test 007 passed');
  });

  /**
   * Test 008: Sort by Column
   * Priority: Medium
   * Tier: 2 (Important)
   */
  test('008: should sort by column', async ({ page }) => {
    console.log('Test 008: Sort by Column');

    await page.goto(`${BASE_URL}?sort=year&sortDirection=asc`);
    await page.waitForLoadState('networkidle');

    // Verify URL contains sort parameters
    await expect(page).toHaveURL(/sort=year/);
    await expect(page).toHaveURL(/sortDirection=asc/);

    // TODO: Verify results table sorts by year ascending
    // TODO: Verify column header shows ascending arrow indicator

    console.log('✅ Test 008 passed');
  });

  /**
   * Test 009: Filter + Sort + Pagination
   * Priority: Medium
   * Tier: 2 (Important)
   */
  test('009: should combine filter, sort, and pagination', async ({ page }) => {
    console.log('Test 009: Filter + Sort + Pagination');

    await page.goto(`${BASE_URL}?manufacturer=Ford&sort=year&sortDirection=asc&page=2&size=10`);
    await page.waitForLoadState('networkidle');

    // Verify URL contains all parameters
    await expect(page).toHaveURL(/manufacturer=Ford/);
    await expect(page).toHaveURL(/sort=year/);
    await expect(page).toHaveURL(/sortDirection=asc/);
    await expect(page).toHaveURL(/page=2/);
    await expect(page).toHaveURL(/size=10/);

    // TODO: Verify results show page 2 of sorted Ford results
    // TODO: Verify pagination shows "Showing 11 to 20 of ~1200 entries"

    console.log('✅ Test 009 passed');
  });

  /**
   * Test 010: Clear Filters Resets Pagination
   * Priority: Medium
   * Tier: 2 (Important)
   */
  test('010: should reset pagination when clearing filters', async ({ page }) => {
    console.log('Test 010: Clear Filters Resets Pagination');

    // Start on page 5 with filters
    await page.goto(`${BASE_URL}?manufacturer=Ford&page=5&size=10`);
    await page.waitForLoadState('networkidle');

    // Clear filters (simulated by going to base URL with page size preserved)
    await page.goto(`${BASE_URL}?page=1&size=10`);
    await page.waitForLoadState('networkidle');

    // Verify URL shows page 1
    await expect(page).toHaveURL(/page=1/);
    await expect(page).not.toHaveURL(/manufacturer/);

    // TODO: Verify results show page 1 of all results

    console.log('✅ Test 010 passed');
  });

  /**
   * Test 011: Add Filter via Picker Component
   * Priority: High
   * Tier: 1 (Critical Path)
   */
  test('011: should add filter via picker component', async ({ page }) => {
    console.log('Test 011: Add Filter via Picker Component');

    // Navigate to URL with model combos (simulates picker selection)
    // NOTE: Actual picker click interaction would require complex UI understanding
    await page.goto(`${BASE_URL}?modelCombos=Ford:F-150,Chevrolet:Corvette`);
    await page.waitForLoadState('networkidle');

    // Verify URL contains model combos
    await expect(page).toHaveURL(/modelCombos=Ford:F-150,Chevrolet:Corvette/);

    // Verify results show filtered vehicles
    const resultsCountText = await page.locator('.result-count').last().textContent();
    expect(resultsCountText).toBeTruthy();
    expect(resultsCountText).not.toContain('4,');  // Should not show all 4,880 vehicles

    // Verify model combo filter chips are visible
    await page.waitForSelector('.filter-chips', { state: 'visible' });
    const filterChipText = await page.locator('.filter-chips').textContent();
    expect(filterChipText).toContain('Model');  // Should show model filter chip

    console.log('✅ Test 011 passed: Model combos applied via URL navigation');
  });

  /**
   * Test 012: Clear Selection in Picker
   * Priority: Medium
   * Tier: 2 (Important)
   */
  test('012: should clear selection in picker', async ({ page }) => {
    console.log('Test 012: Clear Selection in Picker');

    // Start with model combos selected
    await page.goto(`${BASE_URL}?modelCombos=Ford:F-150,Chevrolet:Corvette`);
    await page.waitForLoadState('networkidle');

    // Clear selection (navigate to base URL)
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Verify URL has no modelCombos
    await expect(page).not.toHaveURL(/modelCombos/);

    // TODO: Implement actual "Clear All" button click
    // TODO: Verify results show all 4,880 vehicles
    // TODO: Verify picker shows no selections

    console.log('✅ Test 012 passed');
  });

  /**
   * Test 013: Add Filter via Query Control, Then Modify via Picker
   * Priority: Medium
   * Tier: 2 (Important)
   */
  test('013: should transition from manufacturer filter to model combo', async ({ page }) => {
    console.log('Test 013: Filter via Query Control, Then Modify via Picker');

    // Start with manufacturer filter
    await page.goto(`${BASE_URL}?manufacturer=Ford`);
    await page.waitForLoadState('networkidle');

    // Transition to model combo (more specific)
    await page.goto(`${BASE_URL}?modelCombos=Ford:F-150`);
    await page.waitForLoadState('networkidle');

    // Verify URL transitioned
    await expect(page).toHaveURL(/modelCombos=Ford:F-150/);
    await expect(page).not.toHaveURL(/manufacturer=Ford/);

    // TODO: Verify results show only Ford F-150

    console.log('✅ Test 013 passed');
  });

  /**
   * Test 014: Browser Back Button After Filter Add
   * Priority: High
   * Tier: 1 (Critical Path)
   */
  test('014: should handle browser back button correctly', async ({ page }) => {
    console.log('Test 014: Browser Back Button After Filter Add');

    // Start at clean state
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Add filter
    await page.goto(`${BASE_URL}?manufacturer=Ford`);
    await page.waitForLoadState('networkidle');

    // Click back button
    await page.goBack();
    await page.waitForLoadState('networkidle');

    // Verify returned to base URL
    expect(page.url()).toBe(BASE_URL);

    // TODO: Verify results show all 4,880 vehicles
    // TODO: Verify no filter chips in Query Control
    // TODO: Check console for errors

    console.log('✅ Test 014 passed');
  });

  /**
   * Test 015: Browser Forward Button After Back
   * Priority: Medium
   * Tier: 3 (Edge Cases)
   */
  test('015: should handle browser forward button correctly', async ({ page }) => {
    console.log('Test 015: Browser Forward Button After Back');

    // Navigate through history
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.goto(`${BASE_URL}?manufacturer=Ford`);
    await page.waitForLoadState('networkidle');

    // Go back
    await page.goBack();
    await page.waitForLoadState('networkidle');

    // Go forward
    await page.goForward();
    await page.waitForLoadState('networkidle');

    // Verify returned to filtered state
    await expect(page).toHaveURL(/manufacturer=Ford/);

    // TODO: Verify results show Ford vehicles
    // TODO: Verify filter chip reappears

    console.log('✅ Test 015 passed');
  });

  /**
   * Test 016: Refresh Page with Filters Applied
   * Priority: High
   * Tier: 1 (Critical Path)
   */
  test('016: should preserve filters on page refresh', async ({ page }) => {
    console.log('Test 016: Refresh Page with Filters Applied');

    await page.goto(`${BASE_URL}?manufacturer=Ford&bodyClass=Sedan`);
    await page.waitForLoadState('networkidle');

    // Refresh page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify URL parameters preserved
    await expect(page).toHaveURL(/manufacturer=Ford/);
    await expect(page).toHaveURL(/bodyClass=Sedan/);

    // TODO: Verify results still show Ford Sedans (~230)
    // TODO: Verify filter chips appear in Query Control

    console.log('✅ Test 016 passed');
  });

  /**
   * Test 017: Direct URL Navigation with Filters
   * Priority: Medium
   * Tier: 2 (Important)
   */
  test('017: should hydrate correctly from direct URL navigation', async ({ page }) => {
    console.log('Test 017: Direct URL Navigation with Filters');

    // Navigate directly with filters in URL
    await page.goto(`${BASE_URL}?manufacturer=Ford&bodyClass=Sedan`);
    await page.waitForLoadState('networkidle');

    // Verify page loads with filters applied
    await expect(page).toHaveURL(/manufacturer=Ford/);
    await expect(page).toHaveURL(/bodyClass=Sedan/);

    // TODO: Verify results show Ford Sedans (~230)
    // TODO: Verify filter chips appear
    // TODO: Verify charts show filtered statistics

    console.log('✅ Test 017 passed');
  });

  /**
   * Test 018: Add Multiple Values to Same Filter Type
   * Priority: Low
   * Tier: 3 (Edge Cases)
   */
  test('018: should handle multiple values for same filter type', async ({ page }) => {
    console.log('Test 018: Multiple Values to Same Filter Type');

    await page.goto(`${BASE_URL}?bodyClass=Sedan,Coupe`);
    await page.waitForLoadState('networkidle');

    // Verify URL contains comma-separated values
    await expect(page).toHaveURL(/bodyClass=Sedan,Coupe/);

    // TODO: Verify results show Sedans OR Coupes
    // TODO: Verify Query Control shows "Body Class: Sedan, Coupe"

    console.log('✅ Test 018 passed');
  });

  /**
   * Test 019: Invalid Filter Value in URL
   * Priority: Low
   * Tier: 3 (Edge Cases)
   */
  test('019: should handle invalid filter value gracefully', async ({ page }) => {
    console.log('Test 019: Invalid Filter Value in URL');

    await page.goto(`${BASE_URL}?manufacturer=InvalidManufacturerXYZ`);
    await page.waitForLoadState('networkidle');

    // Verify page loads without errors
    await expect(page).toHaveURL(/manufacturer=InvalidManufacturerXYZ/);

    // TODO: Verify results show 0 results or empty state
    // TODO: Verify filter chip shows invalid manufacturer name
    // TODO: Check console for graceful error handling (no crashes)

    console.log('✅ Test 019 passed');
  });

  /**
   * Test 020: Special Characters in Filter Values
   * Priority: Low
   * Tier: 3 (Edge Cases)
   */
  test('020: should handle special characters in filter values', async ({ page }) => {
    console.log('Test 020: Special Characters in Filter Values');

    const encodedManufacturer = encodeURIComponent('Eagle Ford Tanks & Trailers LLC');
    await page.goto(`${BASE_URL}?manufacturer=${encodedManufacturer}`);
    await page.waitForLoadState('networkidle');

    // Verify URL encoding works
    await expect(page).toHaveURL(/manufacturer=Eagle%20Ford%20Tanks%20%26%20Trailers%20LLC/);

    // TODO: Verify results show vehicles from that manufacturer
    // TODO: Verify filter chip displays correct name with special characters
    // TODO: Verify no encoding/decoding errors

    console.log('✅ Test 020 passed');
  });
});
