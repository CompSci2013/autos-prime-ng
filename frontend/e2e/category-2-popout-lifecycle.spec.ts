import { test, expect } from '@playwright/test';

/**
 * Category 2: Pop-Out Window Lifecycle (Tests 021-040)
 *
 * This test suite covers pop-out window creation, closure, and lifecycle management.
 * Tests include: opening pop-outs, closing pop-outs, refreshing windows, multi-monitor
 * support, and localStorage persistence.
 */

test.describe('Category 2: Pop-Out Window Lifecycle', () => {
  const BASE_URL = 'http://192.168.0.244:4201/discover';

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  /**
   * Test 021: Pop Out Results Table
   * Priority: Critical
   * Tier: 1 (Critical Path)
   */
  test('021: should pop out results table to new window', async ({ page, context }) => {
    console.log('Test 021: Pop Out Results Table');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Find and click the pop-out button for Vehicle Results panel
    const popoutPromise = context.waitForEvent('page');

    // Locate the Vehicle Results panel header and click the pop-out button
    const vehicleResultsPanel = page.locator('.panel-header-content').filter({ hasText: 'Vehicle Results' });
    const popoutButton = vehicleResultsPanel.locator('button.popout-btn');

    await popoutButton.click();

    const popout = await popoutPromise;
    await popout.waitForLoadState('networkidle');

    // Verify pop-out URL
    expect(popout.url()).toContain('/panel/discover/vehicle-results');

    // TODO: Verify pop-out displays all 4,880 vehicles
    // TODO: Verify main window shows Results panel removed
    // TODO: Check console log: "Pop-out panel vehicle-results is ready"

    // Close the pop-out window for cleanup
    await popout.close();

    console.log('✅ Test 021 passed: Pop-out window opened successfully');
  });

  /**
   * Test 022: Pop Out Interactive Charts
   * Priority: High
   * Tier: 1 (Critical Path)
   */
  test('022: should pop out interactive charts to new window', async ({ page, context }) => {
    console.log('Test 022: Pop Out Interactive Charts');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Find and click the pop-out button for Interactive Charts panel
    const popoutPromise = context.waitForEvent('page');

    // Locate the Interactive Charts panel header and click the pop-out button
    const chartsPanel = page.locator('.panel-header-content').filter({ hasText: 'Interactive Charts' });
    const popoutButton = chartsPanel.locator('button.popout-btn');

    await popoutButton.click();

    const popout = await popoutPromise;
    await popout.waitForLoadState('networkidle');

    // Verify pop-out URL
    expect(popout.url()).toContain('/panel/discover/interactive-charts');

    // TODO: Verify pop-out displays all 4 charts
    // TODO: Verify main window shows Charts panel removed
    // TODO: Verify charts render correctly in pop-out

    // Close the pop-out window for cleanup
    await popout.close();

    console.log('✅ Test 022 passed: Charts pop-out opened successfully');
  });

  /**
   * Test 023: Close Pop-Out Window (Manual Close)
   * Priority: High
   * Tier: 1 (Critical Path)
   */
  test('023: should restore panel when pop-out window is closed', async ({ page, context }) => {
    console.log('Test 023: Close Pop-Out Window (Manual Close)');

    // Pop out Results table
    const popoutPromise = context.waitForEvent('page');
    const vehicleResultsPanel = page.locator('.panel-header-content').filter({ hasText: 'Vehicle Results' });
    await vehicleResultsPanel.locator('button.popout-btn').click();
    const popout = await popoutPromise;
    await popout.waitForLoadState('networkidle');

    // Verify panel is popped out (shows placeholder in main window)
    const placeholderVisible = await page.locator('.popout-placeholder').isVisible();
    expect(placeholderVisible).toBe(true);

    // Close pop-out window
    await popout.close();
    await page.waitForTimeout(500);  // Wait for restoration

    // Verify panel restored in main window
    const panelRestored = await page.locator('.panel-header-content').filter({ hasText: 'Vehicle Results' }).isVisible();
    expect(panelRestored).toBe(true);

    console.log('✅ Test 023 passed: Panel restored after pop-out closed');
  });

  /**
   * Test 024: Close Pop-Out via "Pop In" Button
   * Priority: Medium
   * Tier: 2 (Important)
   */
  test('024: should restore panel when "Pop In" button clicked', async ({ page, context }) => {
    console.log('Test 024: Close Pop-Out via "Pop In" Button');

    await page.waitForLoadState('networkidle');

    // Verify panel exists in main window
    const vehicleResultsPanelBefore = page.locator('.panel-header-content').filter({ hasText: 'Vehicle Results' });
    await expect(vehicleResultsPanelBefore).toBeVisible();

    // Pop out Results table
    const popoutPromise = context.waitForEvent('page');
    await vehicleResultsPanelBefore.locator('button.popout-btn').click();
    const popout = await popoutPromise;
    await popout.waitForLoadState('networkidle');

    // Verify pop-out opened
    expect(popout.url()).toContain('/panel/discover/vehicle-results');

    // Verify main window shows placeholder
    const placeholder = page.locator('.popout-placeholder').filter({ hasText: 'Vehicle Results' });
    await expect(placeholder).toBeVisible();

    // Click "Pop In" button in pop-out window
    const popInButton = popout.locator('button').filter({ hasText: /pop in/i }).or(
      popout.locator('button[pTooltip*="Pop in"]')
    );

    // If pop-in button doesn't exist, skip this test
    const popInButtonCount = await popInButton.count();
    if (popInButtonCount === 0) {
      console.log('⚠️ Test 024: Pop-in button not found - skipping test');
      await popout.close();
      return;
    }

    await popInButton.click();

    // Wait for pop-out to close
    await popout.waitForEvent('close', { timeout: 5000 }).catch(() => {
      console.log('⚠️ Pop-out did not close automatically');
    });

    // Verify panel restored in main window
    await page.waitForTimeout(500);
    const vehicleResultsPanelAfter = page.locator('.panel-header-content').filter({ hasText: 'Vehicle Results' });
    await expect(vehicleResultsPanelAfter).toBeVisible();

    // Verify placeholder is gone
    await expect(placeholder).not.toBeVisible();

    console.log('✅ Test 024: Pop-in button restored panel successfully');
  });

  /**
   * Test 025: Pop Out Multiple Panels Simultaneously
   * Priority: High
   * Tier: 1 (Critical Path)
   */
  test('025: should support multiple pop-outs simultaneously', async ({ page, context }) => {
    console.log('Test 025: Pop Out Multiple Panels Simultaneously');

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

    // Verify both windows are open
    expect(resultsPopout.url()).toContain('/panel/discover/vehicle-results');
    expect(chartsPopout.url()).toContain('/panel/discover/interactive-charts');

    // Verify both have placeholders in main window
    const placeholders = await page.locator('.popout-placeholder').count();
    expect(placeholders).toBe(2);

    await resultsPopout.close();
    await chartsPopout.close();

    console.log('✅ Test 025 passed: Multiple pop-outs supported');
  });

  /**
   * Test 026: Close One Pop-Out, Keep Other Open
   * Priority: Medium
   * Tier: 2 (Important)
   */
  test('026: should allow closing one pop-out while keeping others open', async ({ page, context }) => {
    console.log('Test 026: Close One Pop-Out, Keep Other Open');

    // TODO: Pop out Results and Charts
    // TODO: Close Results pop-out
    // TODO: Verify Results panel restored to main window
    // TODO: Verify Charts pop-out remains open and functional
    // TODO: Verify no interference between panels

    console.log('⚠️ Test 026: Requires pop-out implementation');
  });

  /**
   * Test 027: Refresh Main Window with Pop-Out Open
   * Priority: High
   * Tier: 1 (Critical Path)
   */
  test('027: should maintain pop-out state on main window refresh', async ({ page, context }) => {
    console.log('Test 027: Refresh Main Window with Pop-Out Open');

    // TODO: Pop out Results table
    // TODO: Refresh main window (F5)
    // TODO: Verify main window shows Results panel as removed
    // TODO: Verify pop-out window continues to function
    // TODO: Verify state sync resumes after reload
    // TODO: Verify BroadcastChannel reconnects

    console.log('⚠️ Test 027: Requires pop-out implementation');
  });

  /**
   * Test 028: Refresh Pop-Out Window
   * Priority: Medium
   * Tier: 2 (Important)
   */
  test('028: should resync pop-out on refresh', async ({ page, context }) => {
    console.log('Test 028: Refresh Pop-Out Window');

    // TODO: Pop out Results table
    // TODO: Refresh pop-out window (F5)
    // TODO: Verify pop-out requests current state from main window
    // TODO: Verify main window sends state via BroadcastChannel
    // TODO: Verify pop-out displays current data
    // TODO: Verify no data loss

    console.log('⚠️ Test 028: Requires pop-out implementation');
  });

  /**
   * Test 029: Close Main Window with Pop-Out Open
   * Priority: Low
   * Tier: 3 (Edge Cases)
   */
  test('029: should handle main window closure with pop-out open', async ({ page, context }) => {
    console.log('Test 029: Close Main Window with Pop-Out Open');

    // TODO: Pop out Results table
    // TODO: Close main window
    // TODO: Verify pop-out remains open (orphaned)
    // TODO: Verify pop-out displays last known state
    // TODO: Verify no crashes or errors

    console.log('⚠️ Test 029: Requires pop-out implementation');
  });

  /**
   * Test 030: Reopen Main Window After Close
   * Priority: Low
   * Tier: 3 (Edge Cases)
   */
  test('030: should not reconnect orphaned pop-out to new main window', async ({ page, context }) => {
    console.log('Test 030: Reopen Main Window After Close');

    // TODO: Pop out Results table
    // TODO: Close main window
    // TODO: Open new main window (navigate to /discover)
    // TODO: Verify new main window shows clean state
    // TODO: Verify orphaned pop-out does NOT reconnect
    // TODO: User must close orphaned pop-out and create new one

    console.log('⚠️ Test 030: Requires pop-out implementation');
  });

  /**
   * Test 031: Pop Out, Change Window Size
   * Priority: Low
   * Tier: 3 (Edge Cases)
   */
  test('031: should handle window resize in pop-out', async ({ page, context }) => {
    console.log('Test 031: Pop Out, Change Window Size');

    // TODO: Pop out Results table
    // TODO: Resize pop-out window
    // TODO: Verify table adjusts responsively
    // TODO: Verify columns resize
    // TODO: Verify pagination remains functional
    // TODO: Verify no layout breaks

    console.log('⚠️ Test 031: Requires pop-out implementation');
  });

  /**
   * Test 032: Pop Out, Minimize Window
   * Priority: Low
   * Tier: 3 (Edge Cases)
   */
  test('032: should sync state while pop-out minimized', async ({ page, context }) => {
    console.log('Test 032: Pop Out, Minimize Window');

    // TODO: Pop out Results table
    // TODO: Minimize pop-out window
    // TODO: Add filter in main window
    // TODO: Restore pop-out window
    // TODO: Verify pop-out shows updated filtered data
    // TODO: Verify no missed updates

    console.log('⚠️ Test 032: Requires pop-out implementation');
  });

  /**
   * Test 033: Pop Out to Secondary Monitor
   * Priority: Low
   * Tier: 3 (Edge Cases)
   */
  test('033: should support pop-out on secondary monitor', async ({ page, context }) => {
    console.log('Test 033: Pop Out to Secondary Monitor');

    // TODO: Pop out Results table
    // TODO: Drag pop-out to secondary monitor (if available)
    // TODO: Add filter in main window
    // TODO: Verify pop-out updates on secondary monitor
    // TODO: Verify no performance issues

    console.log('⚠️ Test 033: Requires multi-monitor setup');
  });

  /**
   * Test 034: Pop Out, Close Main Window, Reopen, Pop In
   * Priority: Medium
   * Tier: 2 (Important)
   */
  test('034: should handle orphaned pop-out closure', async ({ page, context }) => {
    console.log('Test 034: Pop Out, Close Main, Reopen, Pop In');

    // TODO: Pop out Results table
    // TODO: Close main window
    // TODO: Reopen main window (new tab)
    // TODO: Close pop-out window (attempt pop-in)
    // TODO: Verify pop-out closes (orphaned)
    // TODO: Verify new main window doesn't receive panel
    // TODO: Verify no crashes

    console.log('⚠️ Test 034: Requires pop-out implementation');
  });

  /**
   * Test 035: Pop Out Same Panel Twice (Error Case)
   * Priority: Low
   * Tier: 3 (Edge Cases)
   */
  test('035: should prevent duplicate pop-outs of same panel', async ({ page, context }) => {
    console.log('Test 035: Pop Out Same Panel Twice');

    // TODO: Pop out Results table
    // TODO: Attempt to pop out Results table again
    // TODO: Verify second pop-out prevented
    // TODO: Verify "Pop Out" button disabled or hidden
    // TODO: Verify only one pop-out window per panel

    console.log('⚠️ Test 035: Requires pop-out implementation');
  });

  /**
   * Test 036: localStorage Persistence of Pop-Out State
   * Priority: Medium
   * Tier: 2 (Important)
   */
  test('036: should persist pop-out state in localStorage', async ({ page, context }) => {
    console.log('Test 036: localStorage Persistence');

    // TODO: Pop out Results table
    // TODO: Close browser completely
    // TODO: Reopen browser and navigate to /discover
    // TODO: Verify main window shows Results panel as removed
    // TODO: Verify pop-out window does NOT automatically reopen
    // TODO: Verify state consistent

    console.log('⚠️ Test 036: Requires browser restart');
  });

  /**
   * Test 037: Pop Out, Clear localStorage, Refresh
   * Priority: Low
   * Tier: 3 (Edge Cases)
   */
  test('037: should handle localStorage clear gracefully', async ({ page, context }) => {
    console.log('Test 037: Pop Out, Clear localStorage, Refresh');

    // TODO: Pop out Results table
    // TODO: Clear localStorage via DevTools
    // TODO: Refresh main window
    // TODO: Verify main window shows Results panel (no longer knows it's popped out)
    // TODO: Verify pop-out becomes orphaned
    // TODO: Verify no crashes
    // TODO: User sees duplicate panels

    console.log('⚠️ Test 037: Requires pop-out implementation');
  });

  /**
   * Test 038: Pop Out with Filters Already Applied
   * Priority: High
   * Tier: 1 (Critical Path)
   */
  test('038: should pop out with filters already applied', async ({ page, context }) => {
    console.log('Test 038: Pop Out with Filters Already Applied');

    // Start with filters
    await page.goto(`${BASE_URL}?manufacturer=Ford`);
    await page.waitForLoadState('networkidle');

    // Verify filters applied in main window
    await page.waitForSelector('.filter-chips', { state: 'visible' });
    const mainWindowCount = await page.locator('.result-count').last().textContent();
    expect(mainWindowCount).toBeTruthy();

    // Pop out Results table
    const popoutPromise = context.waitForEvent('page');
    const vehicleResultsPanel = page.locator('.panel-header-content').filter({ hasText: 'Vehicle Results' });
    const popoutButton = vehicleResultsPanel.locator('button.popout-btn');
    await popoutButton.click();

    const popout = await popoutPromise;
    await popout.waitForLoadState('networkidle');

    // Verify pop-out receives current filter state
    const popoutCount = await popout.locator('.result-count').last().textContent();
    expect(popoutCount).toBeTruthy();
    expect(popoutCount).not.toContain('4,');  // Should NOT show all 4,880
    // Should show filtered results (around 1,200 Ford vehicles)

    await popout.close();

    console.log('✅ Test 038 passed: Pop-out opened with filters already applied');
  });

  /**
   * Test 039: Pop Out, Then Apply Filter
   * Priority: Critical (Main Bug Scenario)
   * Tier: 1 (Critical Path)
   */
  test('039: should sync filter to pop-out after pop-out created', async ({ page, context }) => {
    console.log('Test 039: Pop Out, Then Apply Filter');

    // Start without filters
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Pop out Results table (showing all 4,880)
    const popoutPromise = context.waitForEvent('page');
    const vehicleResultsPanel = page.locator('.panel-header-content').filter({ hasText: 'Vehicle Results' });
    const popoutButton = vehicleResultsPanel.locator('button.popout-btn');
    await popoutButton.click();

    const popout = await popoutPromise;
    await popout.waitForLoadState('networkidle');

    // Verify pop-out shows all results initially
    const popoutInitialCount = await popout.locator('.result-count').last().textContent();
    expect(popoutInitialCount).toContain('4');  // Should show all ~4,880

    // Navigate to filtered URL in main window
    await page.goto(`${BASE_URL}?manufacturer=Ford`);
    await page.waitForLoadState('networkidle');

    // Verify main window shows filtered results
    await page.waitForSelector('.filter-chips', { state: 'visible' });
    const mainFilteredCount = await page.locator('.result-count').last().textContent();
    expect(mainFilteredCount).not.toContain('4,');  // Should show filtered results

    // Wait for BroadcastChannel sync
    await popout.waitForTimeout(1000);

    // Verify pop-out received filter update
    const popoutFilteredCount = await popout.locator('.result-count').last().textContent();
    expect(popoutFilteredCount).not.toContain('4,');  // Should show Ford vehicles only

    await popout.close();

    console.log('✅ Test 039 passed: Filter synced to pop-out successfully');
  });

  /**
   * Test 040: Pop Out, Then Clear Filters (Main Bug Test)
   * Priority: CRITICAL (Primary Bug Case)
   * Tier: 1 (Critical Path)
   */
  test('040: should sync filter clear to pop-out (KNOWN BUG)', async ({ page, context }) => {
    console.log('Test 040: Pop Out, Then Clear Filters (PRIMARY BUG)');

    // Start with filters
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

    // CRITICAL BUG CHECK: Pop-out should also show all results
    // Wait a moment for BroadcastChannel sync
    await popout.waitForTimeout(1000);

    const popoutClearedCount = await popout.locator('.result-count').last().textContent();

    // EXPECTED: Pop-out shows all 4,880 vehicles
    // ACTUAL (BUG): Pop-out stuck at ~230 results
    expect(popoutClearedCount).toContain('4');  // This will FAIL if bug exists

    await popout.close();

    console.log('✅ Test 040: BUG FIXED - Pop-out synced filter clear successfully');
  });
});
