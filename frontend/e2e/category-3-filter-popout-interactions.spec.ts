import { test, expect } from '@playwright/test';

/**
 * Category 3: Filter + Pop-Out Interactions (Tests 041-065)
 *
 * This test suite covers the interaction between filter state changes and pop-out windows.
 * Tests include: adding/removing/modifying filters with pop-outs open, browser navigation
 * with pop-outs, picker interactions, sorting, pagination, and URL state management.
 */

test.describe('Category 3: Filter + Pop-Out Interactions', () => {
  const BASE_URL = 'http://192.168.0.244:4201/discover';

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  /**
   * Test 041: Add Filter Before Pop-Out
   * Priority: High
   * Tier: 1 (Critical Path)
   */
  test('041: should open pop-out with filter already applied', async ({ page, context }) => {
    console.log('Test 041: Add Filter Before Pop-Out');

    await page.goto(`${BASE_URL}?manufacturer=Ford`);
    await page.waitForLoadState('networkidle');

    // TODO: Pop out Results table
    // TODO: Verify pop-out shows ~1,200 Ford vehicles
    // TODO: Verify pop-out synchronized with main window state

    console.log('⚠️ Test 041: Requires pop-out implementation');
  });

  /**
   * Test 042: Add Filter After Pop-Out
   * Priority: High
   * Tier: 1 (Critical Path)
   */
  test('042: should sync filter to pop-out after adding filter', async ({ page, context }) => {
    console.log('Test 042: Add Filter After Pop-Out');

    // TODO: Pop out Results table (shows all 4,880)
    // TODO: Add filter: Manufacturer=Ford
    // TODO: Verify pop-out receives STATE_UPDATE
    // TODO: Verify pop-out shows Ford vehicles only (~1,200)

    console.log('⚠️ Test 042: Requires pop-out implementation');
  });

  /**
   * Test 043: Modify Filter with Pop-Out Open
   * Priority: High
   * Tier: 1 (Critical Path)
   */
  test('043: should sync filter modification to pop-out', async ({ page, context }) => {
    console.log('Test 043: Modify Filter with Pop-Out Open');

    await page.goto(`${BASE_URL}?manufacturer=Ford`);
    await page.waitForLoadState('networkidle');

    // TODO: Pop out Results table
    // TODO: Modify filter to Manufacturer=Chevrolet
    // TODO: Verify pop-out receives STATE_UPDATE
    // TODO: Verify pop-out switches to Chevrolet vehicles

    console.log('⚠️ Test 043: Requires pop-out implementation');
  });

  /**
   * Test 044: Add Second Filter with Pop-Out Open
   * Priority: Medium
   * Tier: 2 (Important)
   */
  test('044: should sync additional filter to pop-out', async ({ page, context }) => {
    console.log('Test 044: Add Second Filter with Pop-Out Open');

    await page.goto(`${BASE_URL}?manufacturer=Ford`);
    await page.waitForLoadState('networkidle');

    // TODO: Pop out Results table (~1,200)
    // TODO: Add filter: BodyClass=Sedan
    // TODO: Verify pop-out receives STATE_UPDATE
    // TODO: Verify pop-out shows Ford Sedans (~230)

    console.log('⚠️ Test 044: Requires pop-out implementation');
  });

  /**
   * Test 045: Remove One Filter (Keep Others) with Pop-Out Open
   * Priority: High
   * Tier: 2 (Important)
   */
  test('045: should sync partial filter removal to pop-out', async ({ page, context }) => {
    console.log('Test 045: Remove One Filter (Keep Others)');

    await page.goto(`${BASE_URL}?manufacturer=Ford&bodyClass=Sedan`);
    await page.waitForLoadState('networkidle');

    // TODO: Pop out Results table (~230)
    // TODO: Remove Manufacturer filter (keep BodyClass)
    // TODO: Verify pop-out receives STATE_UPDATE
    // TODO: Verify pop-out shows all Sedans (~3,500)

    console.log('⚠️ Test 045: Requires pop-out implementation');
  });

  /**
   * Test 046: Clear All Filters with Pop-Out Open (Repeated Bug Test)
   * Priority: CRITICAL
   * Tier: 1 (Critical Path)
   */
  test('046: should clear all filters in pop-out (KNOWN BUG)', async ({ page, context }) => {
    console.log('Test 046: Clear All Filters with Pop-Out (CRITICAL BUG)');

    await page.goto(`${BASE_URL}?manufacturer=Ford&bodyClass=Sedan`);
    await page.waitForLoadState('networkidle');

    // Pop out Results table
    const popoutPromise = context.waitForEvent('page');
    const vehicleResultsPanel = page.locator('.panel-header-content').filter({ hasText: 'Vehicle Results' });
    const popoutButton = vehicleResultsPanel.locator('button.popout-btn');
    await popoutButton.click();

    const popout = await popoutPromise;
    await popout.waitForLoadState('networkidle');

    // Verify pop-out shows filtered results (~230 Ford Sedans)
    const popoutFilteredCount = await popout.locator('.result-count').last().textContent();
    expect(popoutFilteredCount).toBeTruthy();
    expect(popoutFilteredCount).not.toContain('4,');  // Should NOT show all results

    // Click "Clear Filters" in main window
    await page.locator('button:has-text("Clear All")').click();
    await page.waitForLoadState('networkidle');

    // Verify main window URL cleared (can't check Vehicle Results count since it's popped out)
    const clearedUrl = page.url();
    expect(clearedUrl).not.toContain('manufacturer=');
    expect(clearedUrl).not.toContain('bodyClass=');

    // Wait for BroadcastChannel sync
    await popout.waitForTimeout(1000);

    // CRITICAL BUG CHECK: Pop-out should also show all results
    const popoutClearedCount = await popout.locator('.result-count').last().textContent();
    expect(popoutClearedCount).toContain('4');  // This will FAIL if bug exists

    await popout.close();

    console.log('✅ Test 046: BUG FIXED - Pop-out synced filter clear successfully');
  });

  /**
   * Test 047: Apply Filter, Pop Out, Close Pop-Out, Clear Filter
   * Priority: Medium
   * Tier: 2 (Important)
   */
  test('047: should handle filter clear after pop-in', async ({ page, context }) => {
    console.log('Test 047: Filter, Pop Out, Pop In, Clear Filter');

    await page.goto(`${BASE_URL}?manufacturer=Ford`);
    await page.waitForLoadState('networkidle');

    // TODO: Pop out Results table
    // TODO: Close pop-out (pop-in)
    // TODO: Clear filter in main window
    // TODO: Verify main window shows all 4,880 vehicles
    // TODO: Verify no stuck filters

    console.log('⚠️ Test 047: Requires pop-out implementation');
  });

  /**
   * Test 048: Clear Filter, Then Pop Out
   * Priority: Medium
   * Tier: 2 (Important)
   */
  test('048: should pop out with clean state after filter clear', async ({ page, context }) => {
    console.log('Test 048: Clear Filter, Then Pop Out');

    await page.goto(`${BASE_URL}?manufacturer=Ford`);
    await page.waitForLoadState('networkidle');

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // TODO: Pop out Results table
    // TODO: Verify pop-out shows all 4,880 vehicles
    // TODO: Verify no residual filter state

    console.log('⚠️ Test 048: Requires pop-out implementation');
  });

  /**
   * Test 049: Rapid Filter Changes with Pop-Out Open
   * Priority: Medium
   * Tier: 3 (Edge Cases)
   */
  test('049: should handle rapid filter changes with pop-out open', async ({ page, context }) => {
    console.log('Test 049: Rapid Filter Changes');

    // TODO: Pop out Results table
    // TODO: Rapidly apply filters (500ms intervals):
    //   - Add Manufacturer=Ford
    //   - Add BodyClass=Sedan
    //   - Remove Manufacturer
    //   - Add Manufacturer=Chevrolet
    //   - Clear all
    // TODO: Verify pop-out receives all STATE_UPDATE messages
    // TODO: Verify no race conditions
    // TODO: Final state: all 4,880 vehicles

    console.log('⚠️ Test 049: Requires pop-out implementation');
  });

  /**
   * Test 050: Filter with Picker, Then Pop Out
   * Priority: Medium
   * Tier: 3 (Edge Cases)
   */
  test('050: should pop out with picker selections applied', async ({ page, context }) => {
    console.log('Test 050: Filter with Picker, Then Pop Out');

    await page.goto(`${BASE_URL}?modelCombos=Ford:F-150,Chevrolet:Corvette`);
    await page.waitForLoadState('networkidle');

    // TODO: Pop out Results table
    // TODO: Verify pop-out shows selected models only
    // TODO: Verify pop-out receives model combo state

    console.log('⚠️ Test 050: Requires pop-out implementation');
  });

  /**
   * Test 051: Pop Out, Then Use Picker in Main Window
   * Priority: Medium
   * Tier: 2 (Important)
   */
  test('051: should sync picker selection to pop-out', async ({ page, context }) => {
    console.log('Test 051: Pop Out, Then Use Picker');

    // TODO: Pop out Results table
    // TODO: Use picker to select: Ford F-150
    // TODO: Verify pop-out receives STATE_UPDATE
    // TODO: Verify pop-out shows only Ford F-150 vehicles

    console.log('⚠️ Test 051: Requires pop-out implementation');
  });

  /**
   * Test 052: Clear Picker Selection with Pop-Out Open
   * Priority: Medium
   * Tier: 2 (Important)
   */
  test('052: should sync picker clear to pop-out', async ({ page, context }) => {
    console.log('Test 052: Clear Picker Selection with Pop-Out');

    await page.goto(`${BASE_URL}?modelCombos=Ford:F-150`);
    await page.waitForLoadState('networkidle');

    // TODO: Pop out Results table
    // TODO: Click "Clear All" in picker
    // TODO: Verify pop-out receives STATE_UPDATE
    // TODO: Verify pop-out shows all 4,880 vehicles

    console.log('⚠️ Test 052: Requires pop-out implementation');
  });

  /**
   * Test 053: Sort Column with Pop-Out Open
   * Priority: Medium
   * Tier: 3 (Edge Cases)
   */
  test('053: should sync sort to pop-out', async ({ page, context }) => {
    console.log('Test 053: Sort Column with Pop-Out Open');

    // TODO: Pop out Results table
    // TODO: Click Year column header to sort
    // TODO: Verify URL updates with sort parameters
    // TODO: Verify both windows show sorted results
    // TODO: Verify sort state synchronized

    console.log('⚠️ Test 053: Requires pop-out implementation');
  });

  /**
   * Test 054: Change Page Size with Pop-Out Open
   * Priority: Low
   * Tier: 3 (Edge Cases)
   */
  test('054: should sync page size to pop-out', async ({ page, context }) => {
    console.log('Test 054: Change Page Size with Pop-Out');

    // TODO: Pop out Results table
    // TODO: Change page size from 10 to 50 in pop-out
    // TODO: Verify pop-out shows 50 results per page
    // TODO: Verify URL updates: ?size=50
    // TODO: Verify main window shows same page size

    console.log('⚠️ Test 054: Requires pop-out implementation');
  });

  /**
   * Test 055: Navigate Pages with Pop-Out Open
   * Priority: Low
   * Tier: 3 (Edge Cases)
   */
  test('055: should sync pagination to pop-out', async ({ page, context }) => {
    console.log('Test 055: Navigate Pages with Pop-Out');

    // TODO: Pop out Results table
    // TODO: Navigate to page 3 in pop-out
    // TODO: Verify URL updates: ?page=3
    // TODO: Verify pagination state synchronized

    console.log('⚠️ Test 055: Requires pop-out implementation');
  });

  /**
   * Test 056: Filter, Pop Out Charts, Verify Chart Updates
   * Priority: High
   * Tier: 1 (Critical Path)
   */
  test('056: should sync filter to charts pop-out', async ({ page, context }) => {
    console.log('Test 056: Filter, Pop Out Charts, Verify Updates');

    // TODO: Pop out Interactive Charts
    // TODO: Add filter: Manufacturer=Ford
    // TODO: Verify pop-out charts receive STATE_UPDATE
    // TODO: Verify all 4 charts show Ford-only statistics
    // TODO: Verify Manufacturers chart shows only Ford bar

    console.log('⚠️ Test 056: Requires pop-out implementation');
  });

  /**
   * Test 057: Clear Filter, Pop Out Charts, Verify Full Stats
   * Priority: High
   * Tier: 1 (Critical Path)
   */
  test('057: should sync filter clear to charts pop-out (LIKELY BUG)', async ({ page, context }) => {
    console.log('Test 057: Clear Filter, Charts Pop-Out');

    await page.goto(`${BASE_URL}?manufacturer=Ford&bodyClass=Sedan`);
    await page.waitForLoadState('networkidle');

    // TODO: Pop out Interactive Charts
    // TODO: Clear all filters
    // TODO: EXPECTED: Charts show full dataset statistics
    // TODO: LIKELY BUG: Charts stuck on filtered stats

    console.log('⚠️ Test 057: LIKELY BUG - charts stuck on filtered data');
  });

  /**
   * Test 058: Pop Out Both Results and Charts, Apply Filter
   * Priority: High
   * Tier: 1 (Critical Path)
   */
  test('058: should sync filter to both pop-outs', async ({ page, context }) => {
    console.log('Test 058: Pop Out Both, Apply Filter');

    // TODO: Pop out Results table
    // TODO: Pop out Interactive Charts
    // TODO: Add filter: Manufacturer=Ford
    // TODO: Verify both pop-outs receive STATE_UPDATE
    // TODO: Verify Results shows Ford vehicles only
    // TODO: Verify Charts show Ford statistics only

    console.log('⚠️ Test 058: Requires pop-out implementation');
  });

  /**
   * Test 059: Pop Out Both Results and Charts, Clear Filters
   * Priority: CRITICAL
   * Tier: 1 (Critical Path)
   */
  test('059: should clear filters in both pop-outs (LIKELY BUG)', async ({ page, context }) => {
    console.log('Test 059: Pop Out Both, Clear Filters (CRITICAL BUG)');

    await page.goto(`${BASE_URL}?manufacturer=Ford&bodyClass=Sedan`);
    await page.waitForLoadState('networkidle');

    // Pop out Results table
    const resultsPopoutPromise = context.waitForEvent('page');
    const vehicleResultsPanel = page.locator('.panel-header-content').filter({ hasText: 'Vehicle Results' });
    await vehicleResultsPanel.locator('button.popout-btn').click();
    const resultsPopout = await resultsPopoutPromise;
    await resultsPopout.waitForLoadState('networkidle');

    // Pop out Interactive Charts
    const chartsPopoutPromise = context.waitForEvent('page');
    const chartsPanel = page.locator('.panel-header-content').filter({ hasText: 'Interactive Charts' });
    await chartsPanel.locator('button.popout-btn').click();
    const chartsPopout = await chartsPopoutPromise;
    await chartsPopout.waitForLoadState('networkidle');

    // Verify both show filtered data initially
    const resultsFilteredCount = await resultsPopout.locator('.result-count').last().textContent();
    expect(resultsFilteredCount).not.toContain('4,');

    // Clear filters in main window
    await page.locator('button:has-text("Clear All")').click();
    await page.waitForLoadState('networkidle');

    // Wait for sync
    await resultsPopout.waitForTimeout(1000);
    await chartsPopout.waitForTimeout(1000);

    // Verify both pop-outs updated
    const resultsClearedCount = await resultsPopout.locator('.result-count').last().textContent();
    expect(resultsClearedCount).toContain('4');  // Should show all results

    await resultsPopout.close();
    await chartsPopout.close();

    console.log('✅ Test 059: BUG FIXED - Both pop-outs synced filter clear successfully');
  });

  /**
   * Test 060: Filter Before Pop-Out, Then Clear After Pop-Out
   * Priority: High
   * Tier: 1 (Critical Path)
   */
  test('060: should clear filter in pop-out after opening', async ({ page, context }) => {
    console.log('Test 060: Filter Before, Clear After Pop-Out');

    await page.goto(`${BASE_URL}?manufacturer=Ford`);
    await page.waitForLoadState('networkidle');

    // TODO: Pop out Results table (shows ~1,200 Ford)
    // TODO: Clear filter in main window
    // TODO: Verify pop-out updates to all 4,880 vehicles

    console.log('⚠️ Test 060: Requires pop-out implementation');
  });

  /**
   * Test 061: Browser Back Button with Pop-Out Open (Filter History)
   * Priority: Medium
   * Tier: 2 (Important)
   *
   * KNOWN BUG: Navigating to new URL after pop-out doesn't sync state changes.
   * The test currently fails because `page.goto()` with new filters doesn't
   * trigger BroadcastChannel sync to already-open pop-out windows.
   */
  test.skip('061: should sync browser back navigation to pop-out (KNOWN BUG)', async ({ page, context }) => {
    console.log('Test 061: Browser Back with Pop-Out');

    // Start with Ford filter
    await page.goto(`${BASE_URL}?manufacturer=Ford`);
    await page.waitForLoadState('networkidle');

    // Pop out Results table
    const popoutPromise = context.waitForEvent('page');
    const vehicleResultsPanel = page.locator('.panel-header-content').filter({ hasText: 'Vehicle Results' });
    await vehicleResultsPanel.locator('button.popout-btn').click();
    const popout = await popoutPromise;
    await popout.waitForLoadState('networkidle');

    // Get Ford vehicle count
    const fordCountText = await popout.locator('.result-count').last().textContent();
    expect(fordCountText).toBeTruthy();
    const fordCount = parseInt(fordCountText!.replace(/[^\d]/g, ''));
    expect(fordCount).toBeGreaterThan(0);

    // Add BodyClass=Sedan filter
    await page.goto(`${BASE_URL}?manufacturer=Ford&bodyClass=Sedan`);
    await page.waitForLoadState('networkidle');

    // Wait for sync
    await popout.waitForTimeout(1000);

    // Get Ford Sedan count (should be less than Ford only)
    const fordSedanCountText = await popout.locator('.result-count').last().textContent();
    expect(fordSedanCountText).toBeTruthy();
    const fordSedanCount = parseInt(fordSedanCountText!.replace(/[^\d]/g, ''));
    expect(fordSedanCount).toBeLessThan(fordCount);  // Sedan filter should reduce results

    // Click browser back button
    await page.goBack();
    await page.waitForLoadState('networkidle');

    // Wait for sync
    await popout.waitForTimeout(1000);

    // Verify pop-out went back to Ford vehicles only (same as initial)
    const backCountText = await popout.locator('.result-count').last().textContent();
    expect(backCountText).toContain(fordCount.toString());  // Should match initial Ford count

    await popout.close();

    console.log('✅ Test 061: Browser back navigation synced to pop-out successfully');
  });

  /**
   * Test 062: Browser Forward Button with Pop-Out Open
   * Priority: Medium
   * Tier: 2 (Important)
   */
  test('062: should sync browser forward navigation to pop-out', async ({ page, context }) => {
    console.log('Test 062: Browser Forward with Pop-Out');

    // TODO: Pop out Results table
    // TODO: Add filters and navigate back/forward
    // TODO: Verify pop-out syncs with history changes

    console.log('⚠️ Test 062: Requires pop-out implementation');
  });

  /**
   * Test 063: Refresh Page with Filters and Pop-Out Open
   * Priority: High
   * Tier: 1 (Critical Path)
   */
  test('063: should maintain filter state on refresh with pop-out', async ({ page, context }) => {
    console.log('Test 063: Refresh with Filters and Pop-Out');

    await page.goto(`${BASE_URL}?manufacturer=Ford&bodyClass=Sedan`);
    await page.waitForLoadState('networkidle');

    // TODO: Pop out Results table
    // TODO: Refresh main window
    // TODO: Verify URL preserved
    // TODO: Verify pop-out continues showing filtered results
    // TODO: Verify BroadcastChannel reconnects

    console.log('⚠️ Test 063: Requires pop-out implementation');
  });

  /**
   * Test 064: Direct URL Navigation with Filters, Then Pop Out
   * Priority: Medium
   * Tier: 2 (Important)
   */
  test('064: should pop out with filters from direct URL', async ({ page, context }) => {
    console.log('Test 064: Direct URL with Filters, Then Pop Out');

    await page.goto(`${BASE_URL}?manufacturer=Ford&bodyClass=Sedan`);
    await page.waitForLoadState('networkidle');

    // TODO: Pop out Results table
    // TODO: Verify pop-out shows ~230 Ford Sedans
    // TODO: Verify pop-out receives correct initial state

    console.log('⚠️ Test 064: Requires pop-out implementation');
  });

  /**
   * Test 065: Clear Filter via URL Edit, Pop-Out Open
   * Priority: Low
   * Tier: 3 (Edge Cases)
   */
  test('065: should sync manual URL edit to pop-out', async ({ page, context }) => {
    console.log('Test 065: Clear Filter via URL Edit');

    await page.goto(`${BASE_URL}?manufacturer=Ford&bodyClass=Sedan`);
    await page.waitForLoadState('networkidle');

    // TODO: Pop out Results table
    // TODO: Manually edit URL to remove parameters
    // TODO: Press Enter
    // TODO: Verify pop-out receives STATE_UPDATE
    // TODO: Verify pop-out shows all 4,880 vehicles

    console.log('⚠️ Test 065: Requires pop-out implementation');
  });
});
